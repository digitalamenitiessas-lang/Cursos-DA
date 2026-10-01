import 'server-only';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';
import { fetchPayment, MercadoPagoError, paymentConfig, searchPayments } from './provider';
import {
  objectValue,
  type OrderSnapshot,
  paymentEventKey,
  PaymentValidationError,
  providerId,
  verifyProviderPayment,
} from './security';

export type PaymentSource = 'webhook' | 'reconciliation';

/** Deliberately excludes payloads, credentials, email, names and provider error bodies. */
export function paymentDiagnostic(
  event: string,
  values: {
    orderId?: string;
    paymentId?: string;
    code?: string;
    providerStatus?: number;
  },
) {
  console.warn(JSON.stringify({ scope: 'payments', event, ...values }));
}

export function paymentErrorCode(error: unknown): string {
  if (error instanceof PaymentValidationError || error instanceof MercadoPagoError)
    return error.code;
  return 'internal_payment_error';
}

async function recordFailure(input: {
  source: PaymentSource;
  paymentId: string;
  orderId?: string;
  code: string;
}) {
  try {
    const db = createAdminClient();
    const { error } = await db.from('payment_events').insert({
      event_key: `diagnostic:${randomUUID()}`,
      order_id: input.orderId ?? null,
      provider_payment_id: input.paymentId,
      event_type: input.source,
      outcome: input.code,
      payload: {},
    });
    if (error) paymentDiagnostic('diagnostic_write_failed', { code: 'database_unavailable' });
  } catch {
    paymentDiagnostic('diagnostic_write_failed', { code: 'database_unavailable' });
  }
}

export async function synchronizePayment(
  paymentId: string,
  source: PaymentSource,
  expectedOrderId?: string,
) {
  const id = providerId(paymentId);
  let orderId: string | undefined;
  try {
    // Ignore financial fields in the notification and always fetch from the fixed API host.
    const raw = objectValue(await fetchPayment(id));
    const reference = z.string().uuid().safeParse(raw.external_reference);
    if (!reference.success) throw new PaymentValidationError('invalid_order_reference');
    if (expectedOrderId && reference.data !== expectedOrderId)
      throw new PaymentValidationError('reference_mismatch');
    const db = createAdminClient();
    const { data: order, error } = await db
      .from('orders')
      .select('id,user_id,course_id,amount_cents,currency')
      .eq('id', reference.data)
      .maybeSingle();
    if (error) throw new Error('order_lookup_failed');
    if (!order) throw new PaymentValidationError('unknown_order');
    orderId = order.id as string;
    const config = paymentConfig();
    const verified = verifyProviderPayment(raw, order as OrderSnapshot, {
      paymentId: id,
      collectorId: config.collectorId,
      liveMode: config.liveMode,
    });
    const { data: result, error: applyError } = await db.rpc('apply_verified_payment', {
      p_order_id: verified.orderId,
      p_provider_payment_id: verified.id,
      p_status: verified.status,
      p_amount_cents: verified.amountCents,
      p_refunded_cents: verified.refundedCents,
      p_currency: verified.currency,
      p_provider_updated_at: verified.updatedAt,
      p_approved_at: verified.approvedAt,
      p_event_key: paymentEventKey(verified),
      p_payload: {
        source,
        partial_refund: verified.refundedCents > 0 && verified.refundedCents < verified.amountCents,
      },
    });
    if (applyError) throw new Error('payment_transaction_failed');
    return result;
  } catch (error) {
    const code = paymentErrorCode(error);
    paymentDiagnostic('verification_failed', {
      paymentId: id,
      orderId,
      code,
      ...(error instanceof MercadoPagoError ? { providerStatus: error.providerStatus } : {}),
    });
    await recordFailure({ source, paymentId: id, orderId, code });
    throw error;
  }
}

export type ReconciliationResult = {
  orderId: string;
  processed: number;
  failed: number;
  nextOffset: number;
  complete: boolean;
};

/** Offset is persisted with the fair, oldest-checked queue, including historical sales. */
export async function reconcileOrder(
  orderId: string,
  offset: number,
  deadlineMs: number,
): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    orderId,
    processed: 0,
    failed: 0,
    nextOffset: offset,
    complete: false,
  };
  const page = await searchPayments(orderId, offset);
  for (const id of page.ids) {
    if (Date.now() >= deadlineMs) break;
    try {
      await synchronizePayment(id, 'reconciliation', orderId);
      result.processed++;
    } catch (error) {
      result.failed++;
      // Retry transient failures at this same item. Invalid financial data is audited and skipped.
      if (!(error instanceof PaymentValidationError)) break;
    }
    result.nextOffset++;
  }
  if (result.nextOffset === offset + page.ids.length && page.nextOffset === null) {
    result.complete = true;
    result.nextOffset = 0;
  }
  return result;
}

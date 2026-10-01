import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { apiError, assertSameOrigin, HttpError } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';
import { constantTimeEqual } from '@/lib/payments/security';
import { paymentConfig } from '@/lib/payments/provider';
import {
  paymentDiagnostic,
  paymentErrorCode,
  reconcileOrder,
  type ReconciliationResult,
} from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const inputSchema = z.object({ orderId: z.string().uuid().optional() }).strict();

async function reconcile(request: Request, allowAdmin: boolean) {
  try {
    const secret = process.env.CRON_SECRET;
    const bearer = request.headers.get('authorization') ?? '';
    const cronAuthorized = Boolean(
      secret && secret.length >= 24 && constantTimeEqual(bearer, `Bearer ${secret}`),
    );
    if (!cronAuthorized) {
      if (!allowAdmin) throw new HttpError(401, 'No autorizado.');
      assertSameOrigin(request);
      await requireAdmin();
    }
    const input = allowAdmin ? inputSchema.parse(await request.json()) : {};
    paymentConfig();
    const db = createAdminClient();
    // Include approved/refunded/failed historical orders: later refunds and late approval can be missed by webhooks.
    let query = db
      .from('orders')
      .select('id,reconcile_offset')
      .order('reconciled_at', { ascending: true, nullsFirst: true })
      .order('created_at', { ascending: true })
      .limit(6);
    if (input.orderId) query = query.eq('id', input.orderId);
    else
      query = query.or(
        `reconciled_at.is.null,reconciled_at.lt.${new Date(Date.now() - 5 * 60_000).toISOString()}`,
      );
    const { data: orders, error } = await query;
    if (error) throw new Error('reconciliation_queue_failed');
    const results: ReconciliationResult[] = [];
    const deadline = Date.now() + 42_000;
    let failedOrders = 0;
    for (const order of orders ?? []) {
      if (Date.now() >= deadline) break;
      let nextOffset = order.reconcile_offset ?? 0;
      try {
        const result = await reconcileOrder(order.id, nextOffset, deadline);
        nextOffset = result.nextOffset;
        results.push(result);
      } catch (error) {
        failedOrders++;
        paymentDiagnostic('reconciliation_failed', {
          orderId: order.id,
          code: paymentErrorCode(error),
        });
      }
      const { error: updateError } = await db
        .from('orders')
        .update({ reconciled_at: new Date().toISOString(), reconcile_offset: nextOffset })
        .eq('id', order.id);
      if (updateError) throw new Error('reconciliation_cursor_failed');
    }
    return Response.json(
      {
        results,
        failedOrders,
        hasMore: results.some((r) => !r.complete) || (orders?.length ?? 0) === 6,
      },
      {
        status: failedOrders || results.some((r) => r.failed > 0) ? 207 : 200,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function GET(request: Request) {
  return reconcile(request, false);
}
export async function POST(request: Request) {
  return reconcile(request, true);
}

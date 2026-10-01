import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

export class PaymentValidationError extends Error {
  constructor(public readonly code: string) {
    super(code);
    this.name = 'PaymentValidationError';
  }
}

export const paymentStatuses = [
  'pending',
  'in_process',
  'authorized',
  'approved',
  'rejected',
  'cancelled',
  'refunded',
  'charged_back',
  'in_mediation',
] as const;
export type ProviderPaymentStatus = (typeof paymentStatuses)[number];

export type OrderSnapshot = {
  id: string;
  user_id: string;
  course_id: string;
  amount_cents: number;
  currency: string;
};

export type VerifiedPayment = {
  id: string;
  orderId: string;
  status: ProviderPaymentStatus;
  amountCents: number;
  refundedCents: number;
  currency: 'ARS';
  updatedAt: string;
  approvedAt: string | null;
};

export function providerId(value: unknown): string {
  if (typeof value === 'number' && (!Number.isSafeInteger(value) || value <= 0)) {
    throw new PaymentValidationError('invalid_provider_id');
  }
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new PaymentValidationError('invalid_provider_id');
  }
  const id = String(value);
  if (!/^[1-9]\d{0,24}$/.test(id)) throw new PaymentValidationError('invalid_provider_id');
  return id;
}

/** Convert an exact decimal, never round an altered amount into a valid payment. */
export function decimalToCents(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'string') {
    throw new PaymentValidationError('invalid_amount');
  }
  const match = /^(0|[1-9]\d{0,7})(?:\.(\d{1,2}))?$/.exec(String(value));
  if (!match) throw new PaymentValidationError('invalid_amount');
  const cents = Number(match[1]) * 100 + Number((match[2] ?? '').padEnd(2, '0'));
  if (!Number.isSafeInteger(cents) || cents > 2_147_483_647) {
    throw new PaymentValidationError('invalid_amount');
  }
  return cents;
}

export function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

/** Signature binds the URL resource ID; the untrusted body must name that same ID. */
export function verifyWebhookSignature(input: {
  signature: string | null;
  requestId: string | null;
  queryId: string | null;
  bodyId: unknown;
  secret: string;
  nowMs?: number;
  toleranceMs?: number;
}): { paymentId: string; requestId: string; timestamp: string } {
  if (!input.secret || !input.signature || !input.requestId || !input.queryId) {
    throw new PaymentValidationError('missing_signature');
  }
  if (input.signature.length > 512 || !/^[A-Za-z0-9._:-]{1,200}$/.test(input.requestId)) {
    throw new PaymentValidationError('invalid_signature');
  }
  const parts = new Map<string, string>();
  for (const part of input.signature.split(',')) {
    const pair = part.trim().split('=');
    if (pair.length !== 2 || parts.has(pair[0]))
      throw new PaymentValidationError('invalid_signature');
    parts.set(pair[0], pair[1]);
  }
  const timestamp = parts.get('ts');
  const signature = parts.get('v1');
  // Mercado Pago documentation contains examples in both seconds and milliseconds.
  if (
    !timestamp ||
    !/^\d{10}(?:\d{3})?$/.test(timestamp) ||
    !signature ||
    !/^[a-f\d]{64}$/i.test(signature)
  ) {
    throw new PaymentValidationError('invalid_signature');
  }
  const timestampMs = Number(timestamp) * (timestamp.length === 10 ? 1000 : 1);
  const age = Math.abs((input.nowMs ?? Date.now()) - timestampMs);
  if (age > (input.toleranceMs ?? 300_000)) throw new PaymentValidationError('expired_signature');
  const paymentId = providerId(input.queryId);
  if (providerId(input.bodyId) !== paymentId)
    throw new PaymentValidationError('resource_id_mismatch');
  const manifest = `id:${paymentId};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac('sha256', input.secret).update(manifest).digest('hex');
  if (!constantTimeEqual(expected, signature.toLowerCase()))
    throw new PaymentValidationError('invalid_signature');
  return { paymentId, requestId: input.requestId, timestamp };
}

export function objectValue(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new PaymentValidationError('invalid_provider_response');
  }
  return value as Record<string, unknown>;
}

function isoDate(value: unknown, code: string): string {
  if (
    typeof value !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}T/.test(value) ||
    !Number.isFinite(Date.parse(value))
  ) {
    throw new PaymentValidationError(code);
  }
  return new Date(value).toISOString();
}

export function verifyProviderPayment(
  raw: unknown,
  order: OrderSnapshot,
  expected: { paymentId: string; collectorId: string; liveMode: boolean },
): VerifiedPayment {
  const payment = objectValue(raw);
  const id = providerId(payment.id);
  if (id !== expected.paymentId) throw new PaymentValidationError('payment_id_mismatch');
  if (payment.external_reference !== order.id)
    throw new PaymentValidationError('reference_mismatch');
  if (providerId(payment.collector_id) !== expected.collectorId)
    throw new PaymentValidationError('collector_mismatch');
  if (payment.live_mode !== expected.liveMode)
    throw new PaymentValidationError('environment_mismatch');
  if (payment.currency_id !== 'ARS' || order.currency !== 'ARS')
    throw new PaymentValidationError('currency_mismatch');
  const amountCents = decimalToCents(payment.transaction_amount);
  const refundedCents = decimalToCents(payment.transaction_amount_refunded);
  if (amountCents !== order.amount_cents || amountCents <= 0)
    throw new PaymentValidationError('amount_mismatch');
  if (refundedCents > amountCents) throw new PaymentValidationError('invalid_refund_amount');
  if (!paymentStatuses.includes(payment.status as ProviderPaymentStatus))
    throw new PaymentValidationError('unsupported_payment_status');
  const approvedAt = payment.date_approved
    ? isoDate(payment.date_approved, 'invalid_approval_date')
    : null;
  if (payment.status === 'approved' && !approvedAt)
    throw new PaymentValidationError('missing_approval_date');
  return {
    id,
    orderId: order.id,
    status: payment.status as ProviderPaymentStatus,
    amountCents,
    refundedCents,
    currency: 'ARS',
    updatedAt: isoDate(payment.date_last_updated, 'invalid_update_date'),
    approvedAt,
  };
}

/** Only authoritative financial state participates in deduplication, never body event IDs. */
export function paymentEventKey(payment: VerifiedPayment): string {
  return `mp:${createHash('sha256')
    .update(
      JSON.stringify([
        payment.id,
        payment.orderId,
        payment.updatedAt,
        payment.status,
        payment.amountCents,
        payment.refundedCents,
        payment.currency,
      ]),
    )
    .digest('hex')}`;
}

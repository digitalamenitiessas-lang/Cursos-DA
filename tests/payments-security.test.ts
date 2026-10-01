import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import test from 'node:test';
import {
  decimalToCents,
  paymentEventKey,
  PaymentValidationError,
  providerId,
  verifyProviderPayment,
  verifyWebhookSignature,
} from '../src/lib/payments/security';

const secret = 'test-only-webhook-secret-not-a-real-credential';
const nowMs = Date.parse('2026-09-29T12:00:00Z');
const paymentId = '123456789';
const requestId = 'bb1e16c1-0011-4adc-9127-c76064466f52';
function signature(timestamp: string, id = paymentId) {
  const digest = createHmac('sha256', secret)
    .update(`id:${id};request-id:${requestId};ts:${timestamp};`)
    .digest('hex');
  return `ts=${timestamp},v1=${digest}`;
}
const webhook = {
  signature: signature(String(nowMs / 1000)),
  requestId,
  queryId: paymentId,
  bodyId: Number(paymentId),
  secret,
  nowMs,
};

test('authentic signature binds URL, request identifier and timestamp in seconds or milliseconds', () => {
  assert.equal(verifyWebhookSignature(webhook).paymentId, paymentId);
  assert.equal(
    verifyWebhookSignature({ ...webhook, signature: signature(String(nowMs)) }).paymentId,
    paymentId,
  );
});

test('tampered signature and a different request ID are rejected', () => {
  assert.throws(
    () =>
      verifyWebhookSignature({ ...webhook, signature: `ts=${nowMs / 1000},v1=${'0'.repeat(64)}` }),
    PaymentValidationError,
  );
  assert.throws(
    () => verifyWebhookSignature({ ...webhook, requestId: 'other-request' }),
    /invalid_signature/,
  );
});

test('a signed resource cannot be replaced through the notification body or query', () => {
  assert.throws(
    () => verifyWebhookSignature({ ...webhook, bodyId: '987654321' }),
    /resource_id_mismatch/,
  );
  assert.throws(
    () => verifyWebhookSignature({ ...webhook, queryId: '987654321', bodyId: '987654321' }),
    /invalid_signature/,
  );
  assert.throws(() => verifyWebhookSignature({ ...webhook, queryId: null }), /missing_signature/);
});

test('old and future signatures outside the five-minute window are rejected', () => {
  for (const shift of [-301_000, 301_000]) {
    assert.throws(
      () =>
        verifyWebhookSignature({
          ...webhook,
          signature: signature(String((nowMs + shift) / 1000)),
        }),
      /expired_signature/,
    );
  }
  assert.equal(
    verifyWebhookSignature({ ...webhook, signature: signature(String((nowMs - 299_000) / 1000)) })
      .paymentId,
    paymentId,
  );
});

test('ambiguous headers and manifest injection fail closed', () => {
  assert.throws(
    () =>
      verifyWebhookSignature({ ...webhook, signature: `${webhook.signature},ts=${nowMs / 1000}` }),
    /invalid_signature/,
  );
  assert.throws(
    () => verifyWebhookSignature({ ...webhook, requestId: 'x;ts:111;' }),
    /invalid_signature/,
  );
  assert.throws(
    () => verifyWebhookSignature({ ...webhook, queryId: `${paymentId};`, bodyId: `${paymentId};` }),
    /invalid_provider_id/,
  );
});

test('provider IDs reject unsafe numbers, paths, aliases and leading zeros', () => {
  for (const value of [
    Number.MAX_SAFE_INTEGER + 1,
    '../123',
    '00123',
    0,
    -1,
    1.2,
    null,
    {},
    '1e8',
  ]) {
    assert.throws(() => providerId(value), PaymentValidationError);
  }
  assert.equal(providerId('123456789123456789'), '123456789123456789');
});

test('peso conversion preserves exact cents without rounding manipulated values', () => {
  assert.equal(decimalToCents('19999.99'), 1_999_999);
  assert.equal(decimalToCents(128.1), 12_810);
  assert.equal(decimalToCents('0'), 0);
  for (const value of [
    '19999.991',
    '1e2',
    -5,
    NaN,
    Infinity,
    '0.001',
    '10,00',
    ' 10',
    '21474836.48',
    null,
  ]) {
    assert.throws(() => decimalToCents(value), /invalid_amount/);
  }
});

const order = {
  id: '6686d1e6-0c98-41bd-88f8-715a6d141dc1',
  user_id: '18e13c86-dd96-431e-b5f0-4e5d20b33f17',
  course_id: '7869b35a-1fe1-41ef-a6e6-b5a6657638d8',
  amount_cents: 2_999_999,
  currency: 'ARS',
};
const payment = {
  id: Number(paymentId),
  external_reference: order.id,
  collector_id: 987654321,
  live_mode: false,
  currency_id: 'ARS',
  transaction_amount: '29999.99',
  transaction_amount_refunded: 0,
  status: 'approved',
  date_last_updated: '2026-09-29T12:00:00.000Z',
  date_approved: '2026-09-29T11:59:00.000Z',
};
const expected = { paymentId, collectorId: '987654321', liveMode: false };

test("authoritative approval matches the server's frozen order snapshot", () => {
  const verified = verifyProviderPayment(payment, order, expected);
  assert.equal(verified.amountCents, order.amount_cents);
  assert.equal(verified.status, 'approved');
  assert.equal(verified.orderId, order.id);
});

test('altered amount, currency, order reference, seller, resource or environment cannot grant access', () => {
  const alterations: Array<[Record<string, unknown>, string]> = [
    [{ transaction_amount: '29999.98' }, 'amount_mismatch'],
    [{ transaction_amount: '29999.991' }, 'invalid_amount'],
    [{ currency_id: 'USD' }, 'currency_mismatch'],
    [{ external_reference: 'another-order' }, 'reference_mismatch'],
    [{ collector_id: 123 }, 'collector_mismatch'],
    [{ id: 124 }, 'payment_id_mismatch'],
    [{ live_mode: true }, 'environment_mismatch'],
    [{ live_mode: undefined }, 'environment_mismatch'],
  ];
  for (const [override, code] of alterations) {
    assert.throws(
      () => verifyProviderPayment({ ...payment, ...override }, order, expected),
      new RegExp(code),
    );
  }
});

test('pending becomes approved only when fetched state actually changes', () => {
  const pending = verifyProviderPayment(
    { ...payment, status: 'pending', date_approved: null },
    order,
    expected,
  );
  assert.equal(pending.status, 'pending');
  assert.equal(pending.approvedAt, null);
  const approved = verifyProviderPayment(payment, order, expected);
  assert.equal(approved.status, 'approved');
  assert.notEqual(paymentEventKey(pending), paymentEventKey(approved));
});

test('refund and chargeback retain exact financial evidence for atomic grant revocation', () => {
  const partial = verifyProviderPayment(
    { ...payment, transaction_amount_refunded: '1000.25' },
    order,
    expected,
  );
  assert.equal(partial.refundedCents, 100_025);
  const full = verifyProviderPayment(
    { ...payment, status: 'refunded', transaction_amount_refunded: '29999.99' },
    order,
    expected,
  );
  assert.equal(full.refundedCents, full.amountCents);
  assert.equal(
    verifyProviderPayment({ ...payment, status: 'charged_back' }, order, expected).status,
    'charged_back',
  );
  assert.throws(
    () =>
      verifyProviderPayment({ ...payment, transaction_amount_refunded: '30000' }, order, expected),
    /invalid_refund_amount/,
  );
});

test('missing provider dates and unsupported statuses are never accepted as approval', () => {
  assert.throws(
    () => verifyProviderPayment({ ...payment, date_last_updated: null }, order, expected),
    /invalid_update_date/,
  );
  assert.throws(
    () => verifyProviderPayment({ ...payment, date_approved: null }, order, expected),
    /missing_approval_date/,
  );
  assert.throws(
    () => verifyProviderPayment({ ...payment, status: 'success' }, order, expected),
    /unsupported_payment_status/,
  );
  assert.throws(
    () =>
      verifyProviderPayment(
        { ...payment, transaction_amount_refunded: undefined },
        order,
        expected,
      ),
    /invalid_amount/,
  );
});

test('duplicate notifications dedupe by fetched state, independent of untrusted body event identity', () => {
  const first = verifyProviderPayment({ ...payment, notification_id: 'first' }, order, expected);
  const retry = verifyProviderPayment({ ...payment, notification_id: 'changed' }, order, expected);
  assert.equal(paymentEventKey(first), paymentEventKey(retry));
  const refund = verifyProviderPayment(
    { ...payment, transaction_amount_refunded: '1' },
    order,
    expected,
  );
  assert.notEqual(paymentEventKey(first), paymentEventKey(refund));
});

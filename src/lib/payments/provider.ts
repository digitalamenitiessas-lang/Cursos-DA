import 'server-only';
import { objectValue, PaymentValidationError, providerId } from './security';

export class MercadoPagoError extends Error {
  constructor(
    public readonly code: string,
    public readonly providerStatus?: number,
  ) {
    super('Mercado Pago no está disponible temporalmente.');
    this.name = 'MercadoPagoError';
  }
}

export function paymentConfig() {
  const token = process.env.MP_ACCESS_TOKEN;
  const collectorId = process.env.MP_COLLECTOR_ID;
  const liveMode = process.env.MP_LIVE_MODE;
  if (!token || !collectorId || !['true', 'false'].includes(liveMode ?? '')) {
    throw new MercadoPagoError('payment_configuration_missing');
  }
  return { token, collectorId: providerId(collectorId), liveMode: liveMode === 'true' };
}

export function paymentAppUrl(): string {
  const raw = process.env.NEXT_PUBLIC_APP_URL;
  if (!raw) throw new MercadoPagoError('app_url_missing');
  const url = new URL(raw);
  // Mercado Pago needs a public HTTPS webhook even when testing with a tunnel.
  if (url.protocol !== 'https:' || url.username || url.password)
    throw new MercadoPagoError('https_app_url_required');
  return url.origin;
}

async function mpRequest(
  path: string,
  options?: { body: unknown; idempotencyKey: string },
): Promise<unknown> {
  const { token } = paymentConfig();
  let response: Response;
  try {
    response = await fetch(`https://api.mercadopago.com${path}`, {
      method: options ? 'POST' : 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...(options ? { 'X-Idempotency-Key': options.idempotencyKey } : {}),
      },
      body: options ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
      signal: AbortSignal.timeout(12_000),
    });
  } catch {
    throw new MercadoPagoError('provider_unreachable');
  }
  if (!response.ok) throw new MercadoPagoError('provider_http_error', response.status);
  try {
    return await response.json();
  } catch {
    throw new MercadoPagoError('provider_invalid_json');
  }
}

export async function fetchPayment(paymentId: string): Promise<unknown> {
  return mpRequest(`/v1/payments/${providerId(paymentId)}`);
}

export function safeCheckoutUrl(value: unknown): string {
  if (typeof value !== 'string') throw new MercadoPagoError('missing_checkout_url');
  const url = new URL(value);
  const allowedHosts = [
    'www.mercadopago.com',
    'www.mercadopago.com.ar',
    'sandbox.mercadopago.com',
    'sandbox.mercadopago.com.ar',
  ];
  if (
    url.protocol !== 'https:' ||
    !allowedHosts.includes(url.hostname) ||
    url.username ||
    url.password
  ) {
    throw new MercadoPagoError('invalid_checkout_url');
  }
  return url.toString();
}

export async function createPreference(input: {
  orderId: string;
  attemptId: string;
  courseId: string;
  title: string;
  amountCents: number;
  email: string;
  expiresAt: string;
}): Promise<{ id: string; checkoutUrl: string }> {
  const { collectorId, liveMode } = paymentConfig();
  const appUrl = paymentAppUrl();
  const returnUrl = `${appUrl}/pago/resultado?order=${encodeURIComponent(input.orderId)}`;
  const raw = objectValue(
    await mpRequest('/checkout/preferences', {
      idempotencyKey: input.attemptId,
      body: {
        items: [
          {
            id: input.courseId,
            title: input.title,
            quantity: 1,
            currency_id: 'ARS',
            unit_price: input.amountCents / 100,
          },
        ],
        payer: { email: input.email },
        external_reference: input.orderId,
        metadata: { order_id: input.orderId, attempt_id: input.attemptId },
        back_urls: { success: returnUrl, pending: returnUrl, failure: returnUrl },
        auto_return: 'approved',
        notification_url: `${appUrl}/api/webhooks/mercadopago?source_news=webhooks`,
        expires: true,
        expiration_date_to: input.expiresAt,
      },
    }),
  );
  if (providerId(raw.collector_id) !== collectorId)
    throw new PaymentValidationError('preference_collector_mismatch');
  if (typeof raw.id !== 'string' || raw.id.length > 200)
    throw new MercadoPagoError('invalid_preference_id');
  return {
    id: raw.id,
    checkoutUrl: safeCheckoutUrl(liveMode ? raw.init_point : raw.sandbox_init_point),
  };
}

export async function searchPayments(
  orderId: string,
  offset = 0,
): Promise<{ ids: string[]; nextOffset: number | null }> {
  const query = new URLSearchParams({
    external_reference: orderId,
    sort: 'date_created',
    criteria: 'asc',
    limit: '10',
    offset: String(offset),
    'collector.id': paymentConfig().collectorId,
  });
  const raw = objectValue(await mpRequest(`/v1/payments/search?${query}`));
  const paging = objectValue(raw.paging);
  if (
    !Array.isArray(raw.results) ||
    typeof paging.total !== 'number' ||
    !Number.isSafeInteger(paging.total)
  ) {
    throw new MercadoPagoError('invalid_search_response');
  }
  const ids = raw.results.map((item: unknown) => providerId(objectValue(item).id));
  const next = offset + ids.length;
  if (ids.length === 0 && next < paging.total)
    throw new MercadoPagoError('incomplete_search_response');
  return { ids, nextOffset: next < paging.total ? next : null };
}

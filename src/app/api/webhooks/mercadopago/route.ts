import { apiError, HttpError } from '@/lib/http';
import {
  objectValue,
  PaymentValidationError,
  verifyWebhookSignature,
} from '@/lib/payments/security';
import { paymentDiagnostic, paymentErrorCode, synchronizePayment } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new HttpError(400, 'Notificación inválida.');
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.byteLength;
      if (size > 16_384) {
        await reader.cancel();
        throw new HttpError(413, 'Notificación demasiado grande.');
      }
      chunks.push(part.value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally {
    reader.releaseLock();
  }
}

export async function POST(request: Request) {
  try {
    const secret = process.env.MP_WEBHOOK_SECRET;
    if (!secret) throw new HttpError(503, 'Notificaciones temporalmente no disponibles.');
    const url = new URL(request.url);
    if (
      url.searchParams.getAll('data.id').length !== 1 ||
      url.searchParams.getAll('type').length > 1
    ) {
      throw new PaymentValidationError('ambiguous_resource_id');
    }
    const body = objectValue(await readBody(request));
    const data = objectValue(body.data);
    const verified = verifyWebhookSignature({
      signature: request.headers.get('x-signature'),
      requestId: request.headers.get('x-request-id'),
      queryId: url.searchParams.get('data.id'),
      bodyId: data.id,
      secret,
    });
    const queryType = url.searchParams.get('type');
    if (body.type !== 'payment' || (queryType && queryType !== 'payment')) {
      // This endpoint subscribes to Payments only. Other products do not share its ID namespace.
      return Response.json({ received: true, ignored: true });
    }
    await synchronizePayment(verified.paymentId, 'webhook');
    return Response.json({ received: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    paymentDiagnostic('webhook_failed', { code: paymentErrorCode(error) });
    if (error instanceof PaymentValidationError) {
      return Response.json(
        { error: 'Notificación no válida.' },
        { status: 400, headers: { 'Cache-Control': 'no-store' } },
      );
    }
    if (error instanceof SyntaxError) return apiError(new HttpError(400, 'Notificación inválida.'));
    // Do not acknowledge a transient API/database failure: the provider must retry.
    return apiError(error);
  }
}

import { ZodError } from 'zod';
import { appUrl } from './env';
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export function assertSameOrigin(request: Request) {
  if (request.headers.get('origin') !== new URL(appUrl()).origin)
    throw new HttpError(403, 'Solicitud no autorizada.');
}
export function apiError(error: unknown) {
  if (error instanceof HttpError)
    return Response.json(
      { error: error.message },
      { status: error.status, headers: { 'Cache-Control': 'no-store' } },
    );
  if (error instanceof ZodError)
    return Response.json({ error: 'Revisá los datos ingresados.' }, { status: 400 });
  console.error('request_failed', { kind: error instanceof Error ? error.name : 'unknown' });
  return Response.json(
    { error: 'No pudimos completar la solicitud. Intentá nuevamente.' },
    { status: 500, headers: { 'Cache-Control': 'no-store' } },
  );
}

import 'server-only';
import { requiredEnv, appUrl } from '@/lib/env';
import { HttpError } from '@/lib/http';
export function cfBase() {
  return `https://api.cloudflare.com/client/v4/accounts/${requiredEnv('CLOUDFLARE_ACCOUNT_ID')}/stream`;
}
export async function cfRequest(path: string, init: RequestInit = {}) {
  const response = await fetch(`${cfBase()}${path}`, {
    ...init,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${requiredEnv('CLOUDFLARE_API_TOKEN')}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok)
    throw new HttpError(502, 'El servicio de video no está disponible. Intentá nuevamente.');
  const data = await response.json();
  if (!data.success) throw new HttpError(502, 'No se pudo completar la operación de video.');
  return data.result;
}
export function allowedOrigins() {
  const values = (process.env.CLOUDFLARE_ALLOWED_ORIGINS || new URL(appUrl()).hostname)
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  if (!values.length || values.includes('*'))
    throw new HttpError(503, 'Configurá los dominios autorizados de video.');
  return values;
}
export async function createDirectVideoUpload(fileSize: number, name: string) {
  const metadata = [
    'requiresignedurls',
    `name ${Buffer.from(name).toString('base64')}`,
    `maxdurationseconds ${Buffer.from('36000').toString('base64')}`,
    `allowedorigins ${Buffer.from(JSON.stringify(allowedOrigins())).toString('base64')}`,
    `expiry ${Buffer.from(new Date(Date.now() + 24 * 3600000).toISOString()).toString('base64')}`,
  ].join(',');
  const response = await fetch(`${cfBase()}?direct_user=true`, {
    method: 'POST',
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
    headers: {
      Authorization: `Bearer ${requiredEnv('CLOUDFLARE_API_TOKEN')}`,
      'Tus-Resumable': '1.0.0',
      'Upload-Length': String(fileSize),
      'Upload-Metadata': metadata,
    },
  });
  const uploadURL = response.headers.get('location'),
    uid = response.headers.get('stream-media-id');
  if (!response.ok || !uploadURL || !uid)
    throw new HttpError(502, 'No se pudo autorizar la carga de video.');
  return { uploadURL, uid };
}

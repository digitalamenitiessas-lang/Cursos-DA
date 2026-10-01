import { z } from 'zod';
export const credentialsSchema = z.object({
  email: z.email('Ingresá un correo válido.').max(254),
  password: z.string().min(8, 'Usá al menos 8 caracteres.').max(128),
});

/** Keep authentication redirects on this origin, including encoded path variants. */
export function safeNext(value: unknown, fallback = '/mi-aula'): string {
  if (typeof value !== 'string' || !/^\/(?!\/|\\)[a-zA-Z0-9/?=&%._-]*$/.test(value))
    return fallback;
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(decoded)) return fallback;
    return value;
  } catch {
    return fallback;
  }
}

import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

export async function allAdminRows<T>(
  table: string,
  columns: string,
  filters: Record<string, string | string[]> = {},
  sort?: string,
): Promise<T[]> {
  const client = createAdminClient();
  const result: T[] = [];
  let offset = 0;
  for (;;) {
    let query = client
      .from(table)
      .select(columns)
      .order(sort || (table === 'user_roles' || table === 'progress' ? 'user_id' : 'id'));
    if (table === 'progress') query = query.order('lesson_id');
    else if (sort && sort !== 'id' && table !== 'lesson_videos') query = query.order('id');
    for (const [column, value] of Object.entries(filters))
      query = Array.isArray(value) ? query.in(column, value) : query.eq(column, value);
    const { data, error } = await query.range(offset, offset + 999);
    if (error) throw new Error(`No se pudo consultar ${table}`);
    result.push(...(data as T[]));
    if (data.length < 1000) break;
    offset += 1000;
  }
  return result;
}
export const paymentStatuses: Record<string, string> = {
  pending: 'Pendiente',
  in_process: 'En proceso',
  authorized: 'Autorizado',
  approved: 'Aprobado',
  rejected: 'Rechazado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
  charged_back: 'Contracargo',
  partial_refund: 'Reembolso parcial · revisar',
  in_mediation: 'En mediación',
};
export function adminDate(value: string) {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'medium',
    timeZone: 'America/Argentina/Tucuman',
  }).format(new Date(value));
}

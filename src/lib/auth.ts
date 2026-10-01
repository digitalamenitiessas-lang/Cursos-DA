import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import { isSupabaseConfigured } from './env';
import { HttpError } from './http';
export const currentUser = cache(async () => {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
export async function requireUser() {
  if (!isSupabaseConfigured())
    throw new HttpError(503, 'La academia todavía está en configuración.');
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) throw new HttpError(401, 'Iniciá sesión para continuar.');
  if (!user.email_confirmed_at) throw new HttpError(403, 'Verificá tu correo electrónico.');
  return { user, supabase };
}
export async function requireAdmin() {
  const ctx = await requireUser();
  const { data, error } = await ctx.supabase.rpc('is_admin');
  if (error || !data) throw new HttpError(403, 'No tenés permisos de administración.');
  return ctx;
}
export async function requirePageUser() {
  if (!isSupabaseConfigured())
    redirect('/ingresar?message=La+academia+todavía+está+en+configuración.');
  const user = await currentUser();
  if (!user) redirect('/ingresar');
  if (!user.email_confirmed_at)
    redirect('/ingresar?message=Verificá+tu+correo+electrónico+para+continuar.');
  return { user, supabase: await createClient() };
}

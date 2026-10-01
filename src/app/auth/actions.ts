'use server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { appUrl, isSupabaseConfigured } from '@/lib/env';
import { credentialsSchema, safeNext } from '@/lib/auth-validation';
import { authFailureDetails, signupErrorMessage } from '@/lib/auth-errors';
export type AuthState = { error?: string; success?: string };
export async function authenticate(_previous: AuthState, form: FormData): Promise<AuthState> {
  if (!isSupabaseConfigured())
    return { error: 'La academia todavía está en configuración. Volvé a intentarlo más adelante.' };
  const mode = String(form.get('mode'));
  const db = await createClient();
  const email = String(form.get('email') ?? '').trim();
  const password = String(form.get('password') ?? '');
  if (mode === 'recover') {
    if (!z.email().safeParse(email).success) return { error: 'Ingresá un correo válido.' };
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${appUrl()}/auth/callback?next=/actualizar-clave`,
    });
    if (error)
      return { error: 'No pudimos enviar el enlace. Esperá unos minutos e intentá otra vez.' };
    return {
      success:
        'Si existe una cuenta con ese correo, vas a recibir un enlace para recuperar tu contraseña.',
    };
  }
  if (mode === 'update') {
    if (password.length < 8 || password.length > 128)
      return { error: 'Usá una contraseña de entre 8 y 128 caracteres.' };
    const {
      data: { user },
    } = await db.auth.getUser();
    if (!user) return { error: 'El enlace venció. Solicitá uno nuevo.' };
    const { error } = await db.auth.updateUser({ password });
    if (error) return { error: 'No pudimos actualizar la contraseña. Solicitá un nuevo enlace.' };
    redirect('/mi-aula/perfil?message=Contraseña+actualizada');
  }
  const parsed = credentialsSchema.safeParse({ email, password });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  if (mode === 'signup') {
    const full_name = String(form.get('full_name') ?? '').trim();
    if (full_name.length < 2 || full_name.length > 160)
      return { error: 'Ingresá tu nombre (entre 2 y 160 caracteres).' };
    const { data, error } = await db.auth.signUp({
      email,
      password,
      options: { data: { full_name }, emailRedirectTo: `${appUrl()}/auth/callback` },
    });
    if (error) {
      console.error('[auth:signup]', authFailureDetails(error));
      return { error: signupErrorMessage(error) };
    }
    if (data.session) redirect(safeNext(form.get('next')));
    return {
      success: 'Revisá tu correo para verificar la cuenta. Después vas a poder ingresar al aula.',
    };
  }
  const { error } = await db.auth.signInWithPassword({ email, password });
  if (error)
    return {
      error:
        'No pudimos iniciar sesión. Revisá tu correo, contraseña y la verificación de tu cuenta.',
    };
  redirect(safeNext(form.get('next')));
}
export async function signOut() {
  if (isSupabaseConfigured()) {
    const db = await createClient();
    await db.auth.signOut();
  }
  redirect('/');
}

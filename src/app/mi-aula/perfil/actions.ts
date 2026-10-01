'use server';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
export async function updateProfile(
  _previous: { error?: string; success?: string },
  form: FormData,
): Promise<{ error?: string; success?: string }> {
  const name = z.string().trim().min(2).max(160).safeParse(form.get('full_name'));
  if (!name.success) return { error: 'Ingresá un nombre de entre 2 y 160 caracteres.' };
  const { user, supabase } = await requireUser();
  const { error } = await supabase
    .from('profiles')
    .update({ full_name: name.data })
    .eq('id', user.id);
  if (error) return { error: 'No se pudo guardar tu nombre. Intentá nuevamente.' };
  await supabase.auth.updateUser({ data: { full_name: name.data } });
  revalidatePath('/mi-aula');
  return { success: 'Tu perfil fue actualizado.' };
}

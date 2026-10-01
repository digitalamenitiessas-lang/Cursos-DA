'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { allAdminRows } from './data';

const uuid = z.string().uuid();
const get = (data: FormData, key: string) => String(data.get(key) ?? '').trim();
const lines = (value: string) =>
  value
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, 30);
function finish(path: string, message: string, error = false): never {
  redirect(`${path}?${error ? 'error' : 'success'}=${encodeURIComponent(message)}`);
}
function invalidate(courseId?: string) {
  revalidatePath('/admin');
  revalidatePath('/admin/cursos');
  revalidatePath('/cursos');
  revalidatePath('/');
  revalidatePath('/cursos/[slug]', 'page');
  revalidatePath('/mi-aula', 'layout');
  if (courseId) revalidatePath(`/admin/cursos/${courseId}`);
}
const courseSchema = z.object({
  title: z.string().min(3).max(180),
  slug: z
    .string()
    .min(3)
    .max(180)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  subtitle: z.string().max(300),
  description: z.string().min(10).max(20000),
  category: z.string().min(2).max(80),
  level: z.enum(['Inicial', 'Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles']),
  instructor: z.string().min(2).max(160),
  price_cents: z.number().int().min(100).max(1000000000),
  status: z.enum(['draft', 'published', 'archived']),
  currency: z.literal('ARS'),
  learning_outcomes: z.array(z.string().max(300)).min(1),
  requirements: z.array(z.string().max(300)),
  featured: z.boolean(),
});
export async function saveCourse(data: FormData) {
  const { supabase } = await requireAdmin();
  const id = get(data, 'id');
  const path = id && uuid.safeParse(id).success ? `/admin/cursos/${id}` : '/admin/cursos/nuevo';
  if (id && !uuid.safeParse(id).success) finish(path, 'El curso no es válido.', true);
  const rawPrice = get(data, 'price');
  const parsed = courseSchema.safeParse({
    title: get(data, 'title'),
    slug: get(data, 'slug'),
    subtitle: get(data, 'subtitle'),
    description: get(data, 'description'),
    category: get(data, 'category'),
    level: get(data, 'level'),
    instructor: get(data, 'instructor'),
    price_cents: /^\d+(?:[.,]\d{1,2})?$/.test(rawPrice)
      ? Math.round(Number(rawPrice.replace(',', '.')) * 100)
      : NaN,
    status: get(data, 'status'),
    currency: 'ARS',
    learning_outcomes: lines(get(data, 'learning_outcomes')),
    requirements: lines(get(data, 'requirements')),
    featured: data.get('featured') === 'on',
  });
  if (!parsed.success)
    finish(
      path,
      'Revisá los campos: título, URL, descripción, instructor, precio y al menos un objetivo son obligatorios.',
      true,
    );
  const query = id
    ? supabase.from('courses').update(parsed.data).eq('id', id)
    : supabase.from('courses').insert(parsed.data);
  const result = await query.select('id').single();
  if (result.error || !result.data)
    finish(
      path,
      result.error?.code === '23505'
        ? 'Esa URL ya está en uso. Elegí otra.'
        : 'No se pudo guardar el curso.',
      true,
    );
  invalidate(result.data.id);
  finish(`/admin/cursos/${result.data.id}`, 'Curso guardado.');
}
export async function setCourseStatus(data: FormData) {
  const { supabase } = await requireAdmin();
  const id = get(data, 'course_id');
  if (!uuid.safeParse(id).success) finish('/admin/cursos', 'Curso inválido.', true);
  const status = z.enum(['draft', 'published', 'archived']).safeParse(get(data, 'status'));
  if (!status.success) finish(`/admin/cursos/${id}`, 'Estado inválido.', true);
  const { error } = await supabase
    .from('courses')
    .update({ status: status.data })
    .eq('id', id)
    .select('id')
    .single();
  if (error) finish(`/admin/cursos/${id}`, 'No se pudo cambiar el estado.', true);
  invalidate(id);
  finish(
    `/admin/cursos/${id}`,
    status.data === 'archived'
      ? 'Curso archivado. Los accesos existentes se mantienen.'
      : 'Estado actualizado.',
  );
}
export async function saveModule(data: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = get(data, 'course_id');
  const id = get(data, 'id');
  if (!uuid.safeParse(courseId).success) finish('/admin/cursos', 'Curso inválido.', true);
  const path = `/admin/cursos/${courseId}`;
  const title = get(data, 'title');
  if (title.length < 2 || title.length > 160 || (id && !uuid.safeParse(id).success))
    finish(path, 'Ingresá un título de módulo entre 2 y 160 caracteres.', true);
  if (id) {
    const { error } = await supabase
      .from('modules')
      .update({ title })
      .eq('id', id)
      .eq('course_id', courseId)
      .select('id')
      .single();
    if (error) finish(path, 'No se pudo guardar el módulo.', true);
  } else {
    const { data: last, error: readError } = await supabase
      .from('modules')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) finish(path, 'No se pudo consultar el temario.', true);
    const { error } = await supabase
      .from('modules')
      .insert({ course_id: courseId, title, position: (last?.position ?? -1) + 1 });
    if (error)
      finish(path, 'No se pudo crear el módulo. Si hubo otra edición simultánea, reintentá.', true);
  }
  invalidate(courseId);
  finish(path, 'Módulo guardado.');
}
export async function saveLesson(data: FormData) {
  const { supabase } = await requireAdmin();
  const courseId = get(data, 'course_id');
  const moduleId = get(data, 'module_id');
  const id = get(data, 'id');
  if (!uuid.safeParse(courseId).success) finish('/admin/cursos', 'Curso inválido.', true);
  const path = `/admin/cursos/${courseId}`;
  const parsed = z
    .object({
      title: z.string().min(2).max(180),
      description: z.string().max(10000),
      duration_seconds: z.number().int().min(0).max(86400),
      is_preview: z.boolean(),
    })
    .safeParse({
      title: get(data, 'title'),
      description: get(data, 'description'),
      duration_seconds: Math.round(Number(get(data, 'duration_minutes')) * 60),
      is_preview: data.get('is_preview') === 'on',
    });
  if (!parsed.success || !uuid.safeParse(moduleId).success || (id && !uuid.safeParse(id).success))
    finish(path, 'Revisá el título y la duración de la clase.', true);
  const { data: module } = await supabase
    .from('modules')
    .select('id')
    .eq('id', moduleId)
    .eq('course_id', courseId)
    .maybeSingle();
  if (!module) finish(path, 'El módulo no pertenece a este curso.', true);
  if (id) {
    const { error } = await supabase
      .from('lessons')
      .update(parsed.data)
      .eq('id', id)
      .eq('course_id', courseId)
      .eq('module_id', moduleId)
      .select('id')
      .single();
    if (error) finish(path, 'No se pudo guardar la clase.', true);
  } else {
    const { data: last, error: readError } = await supabase
      .from('lessons')
      .select('position')
      .eq('module_id', moduleId)
      .order('position', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (readError) finish(path, 'No se pudo consultar el módulo.', true);
    const { error } = await supabase.from('lessons').insert({
      ...parsed.data,
      course_id: courseId,
      module_id: moduleId,
      position: (last?.position ?? -1) + 1,
    });
    if (error)
      finish(path, 'No se pudo crear la clase. Si hubo otra edición simultánea, reintentá.', true);
  }
  invalidate(courseId);
  finish(path, 'Clase guardada.');
}
export async function moveContent(data: FormData) {
  const { user } = await requireAdmin();
  const courseId = get(data, 'course_id');
  const kind = get(data, 'kind');
  const id = get(data, 'id');
  const moduleId = get(data, 'module_id');
  const direction = get(data, 'direction');
  if (!uuid.safeParse(courseId).success) finish('/admin/cursos', 'Curso inválido.', true);
  const path = `/admin/cursos/${courseId}`;
  if (
    !uuid.safeParse(id).success ||
    !['modules', 'lessons'].includes(kind) ||
    !['up', 'down'].includes(direction) ||
    (kind === 'lessons' && !uuid.safeParse(moduleId).success)
  )
    finish(path, 'No se pudo reordenar.', true);
  const filters: Record<string, string> = { course_id: courseId };
  if (kind === 'lessons') filters.module_id = moduleId;
  const rows = await allAdminRows<{ id: string }>(kind, 'id', filters, 'position');
  const ids = rows.map((row) => row.id);
  const index = ids.indexOf(id);
  const destination = index + (direction === 'up' ? -1 : 1);
  if (index < 0 || destination < 0 || destination >= ids.length)
    finish(path, 'El elemento ya está en ese extremo.', true);
  [ids[index], ids[destination]] = [ids[destination], ids[index]];
  const admin = createAdminClient();
  const result = await admin.rpc('reorder_course_content', {
    p_actor_id: user.id,
    p_course_id: courseId,
    p_kind: kind,
    p_ids: ids,
    p_module_id: kind === 'lessons' ? moduleId : null,
  });
  if (result.error)
    finish(path, 'No se pudo guardar el orden. Actualizá la página e intentá nuevamente.', true);
  invalidate(courseId);
  finish(path, 'Orden actualizado.');
}
export async function grantAccess(data: FormData) {
  const { user } = await requireAdmin();
  const userId = get(data, 'user_id');
  const courseId = get(data, 'course_id');
  const reason = get(data, 'reason');
  if (
    !uuid.safeParse(userId).success ||
    !uuid.safeParse(courseId).success ||
    reason.length < 5 ||
    reason.length > 1000
  )
    finish(
      '/admin/alumnos',
      'Seleccioná alumno y curso e ingresá un motivo de entre 5 y 1000 caracteres.',
      true,
    );
  const { error } = await createAdminClient().rpc('grant_manual_access', {
    p_actor_id: user.id,
    p_user_id: userId,
    p_course_id: courseId,
    p_reason: reason,
  });
  if (error)
    finish(
      '/admin/alumnos',
      'No se pudo otorgar el acceso. Verificá que el alumno exista y que el curso esté publicado o archivado.',
      true,
    );
  revalidatePath('/admin/alumnos');
  revalidatePath('/admin');
  revalidatePath('/mi-aula', 'layout');
  finish('/admin/alumnos', 'Acceso manual otorgado y registrado en auditoría.');
}
export async function revokeAccess(data: FormData) {
  const { user } = await requireAdmin();
  const id = get(data, 'grant_id');
  const reason = get(data, 'reason');
  if (!uuid.safeParse(id).success || reason.length < 5 || reason.length > 1000)
    finish('/admin/alumnos', 'Ingresá un motivo de entre 5 y 1000 caracteres.', true);
  const { error } = await createAdminClient().rpc('revoke_manual_access', {
    p_actor_id: user.id,
    p_grant_id: id,
    p_reason: reason,
  });
  if (error)
    finish(
      '/admin/alumnos',
      'No se pudo revocar. Solo se pueden revocar accesos manuales activos.',
      true,
    );
  revalidatePath('/admin/alumnos');
  revalidatePath('/admin');
  revalidatePath('/mi-aula', 'layout');
  finish('/admin/alumnos', 'Acceso manual revocado. Otros accesos válidos permanecen activos.');
}

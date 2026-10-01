import 'server-only';
import { createClient } from '@/lib/supabase/server';
import { HttpError } from '@/lib/http';
import { canPlayLesson } from './security';
import { z } from 'zod';
export async function authorizeLesson(lessonId: string, allowPreview = false) {
  z.uuid().parse(lessonId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: lesson, error } = await supabase
    .from('lessons')
    .select('id,course_id,title,duration_seconds,is_preview,courses!inner(status)')
    .eq('id', lessonId)
    .maybeSingle();
  if (error || !lesson) throw new HttpError(404, 'La clase no está disponible.');
  const [admin, access] = user
    ? await Promise.all([
        supabase.rpc('is_admin'),
        supabase.rpc('has_course_access', { p_course_id: lesson.course_id }),
      ])
    : [{ data: false }, { data: false }];
  const course = lesson.courses as unknown as { status: string };
  const allowed = canPlayLesson({
    isAdmin: Boolean(admin.data) && !!user?.email_confirmed_at,
    hasAccess: Boolean(access.data) && !!user?.email_confirmed_at,
    isPreview: allowPreview && lesson.is_preview,
    courseStatus: course.status,
  });
  if (!allowed)
    throw new HttpError(user ? 403 : 401, 'Necesitás acceso al curso para abrir este contenido.');
  return { supabase, user, lesson, isAdmin: !!admin.data && !!user?.email_confirmed_at };
}

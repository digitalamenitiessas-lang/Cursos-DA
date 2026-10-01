import 'server-only';
import { requirePageUser } from '@/lib/auth';
import type { Course, Progress, Lesson } from '@/lib/types';
export async function studentCourses() {
  const { user, supabase } = await requirePageUser();
  const [{ data: grants, error }, { data: progress, error: progressError }] = await Promise.all([
    supabase
      .from('access_grants')
      .select('course_id')
      .eq('user_id', user.id)
      .eq('status', 'active'),
    supabase
      .from('progress')
      .select('user_id,lesson_id,position_seconds,completed,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false }),
  ]);
  if (error || progressError) throw new Error('No pudimos cargar tu aula.');
  const ids = [...new Set((grants ?? []).map((g) => g.course_id))];
  if (!ids.length) return { user, courses: [] as Course[], progress: [] as Progress[] };
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select(
      '*,modules(id,course_id,title,position,lessons(id,module_id,course_id,title,description,duration_seconds,position,is_preview))',
    )
    .in('id', ids);
  if (courseError) throw new Error('No pudimos cargar tus cursos.');
  return { user, courses: (courses ?? []) as Course[], progress: (progress ?? []) as Progress[] };
}
export function sortedLessons(course: Course): Lesson[] {
  return [...(course.modules ?? [])]
    .sort((a, b) => a.position - b.position)
    .flatMap((m) => [...(m.lessons ?? [])].sort((a, b) => a.position - b.position));
}

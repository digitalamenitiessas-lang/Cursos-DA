import 'server-only';
import { createClient } from '../supabase/server';
import { isDemo, isSupabaseConfigured } from '../env';
import { demoCourses } from './demo';
import type { Course } from '../types';
const courseFields =
  'id,slug,title,subtitle,description,cover_url,category,level,price_cents,currency,status,instructor,learning_outcomes,requirements,featured,created_at';
export async function getCourses(): Promise<Course[]> {
  if (isDemo()) return demoCourses.filter((course) => course.status === 'published');
  if (!isSupabaseConfigured()) return [];
  const db = await createClient();
  const { data, error } = await db
    .from('courses')
    .select(
      `${courseFields},modules(id,course_id,title,position,lessons(id,module_id,course_id,title,description,duration_seconds,position,is_preview))`,
    )
    .eq('status', 'published')
    .order('created_at', { ascending: false });
  if (error) throw new Error('No se pudo cargar el catálogo.');
  return (data ?? []) as Course[];
}
/** Keep public presentation available when the connected catalog cannot be read. */
export async function loadCourseCatalog() {
  try {
    return { courses: await getCourses(), unavailable: false };
  } catch {
    console.warn('public_catalog_unavailable');
    return { courses: [] as Course[], unavailable: true };
  }
}
export async function getCourse(slug: string): Promise<Course | null> {
  if (isDemo()) return demoCourses.find((x) => x.slug === slug && x.status === 'published') ?? null;
  if (!isSupabaseConfigured()) return null;
  const db = await createClient();
  const { data, error } = await db
    .from('courses')
    .select(
      `${courseFields},modules(id,course_id,title,position,lessons(id,module_id,course_id,title,description,duration_seconds,position,is_preview))`,
    )
    .eq('slug', slug)
    .maybeSingle();
  if (error) throw new Error('No se pudo cargar el curso.');
  return data as Course | null;
}
export function courseStats(course: Course) {
  const lessons = course.modules?.flatMap((m) => m.lessons ?? []) ?? [];
  return {
    count: lessons.length,
    duration: lessons.reduce((total, l) => total + l.duration_seconds, 0),
  };
}

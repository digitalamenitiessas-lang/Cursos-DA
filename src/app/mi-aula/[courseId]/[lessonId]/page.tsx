import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CheckCircle2, Play, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { requirePageUser } from '@/lib/auth';
import { sortedLessons } from '@/lib/data/student';
import { VideoPlayer } from '@/components/video-player';
import { formatDuration } from '@/lib/utils';
import type { Course, Progress } from '@/lib/types';
export default async function LessonPage({
  params,
}: {
  params: Promise<{ courseId: string; lessonId: string }>;
}) {
  const { courseId, lessonId } = await params;
  const { user, supabase } = await requirePageUser();
  const { data: access } = await supabase.rpc('has_course_access', { p_course_id: courseId });
  if (!access) notFound();
  const { data: raw, error } = await supabase
    .from('courses')
    .select(
      '*,modules(id,course_id,title,position,lessons(id,module_id,course_id,title,description,duration_seconds,position,is_preview))',
    )
    .eq('id', courseId)
    .maybeSingle();
  if (error || !raw) notFound();
  const course = raw as Course;
  const lessons = sortedLessons(course);
  const lesson = lessons.find((l) => l.id === lessonId);
  if (!lesson) notFound();
  const [{ data: progress }, { data: resources }] = await Promise.all([
    supabase
      .from('progress')
      .select('*')
      .eq('user_id', user.id)
      .in(
        'lesson_id',
        lessons.map((l) => l.id),
      ),
    supabase.from('resources').select('id,title').eq('lesson_id', lessonId),
  ]);
  const saved = ((progress as Progress[]) || []).find((p) => p.lesson_id === lessonId);
  const index = lessons.findIndex((l) => l.id === lessonId);
  return (
    <>
      <nav className="breadcrumb">
        <Link href="/mi-aula">Mis cursos</Link>
        <span>/</span>
        <span>{course.title}</span>
      </nav>
      <div className="classroom-grid">
        <section>
          <VideoPlayer
            key={lessonId}
            lessonId={lessonId}
            initialPosition={saved?.position_seconds}
            initialCompleted={saved?.completed}
          />
          <h1 className="classroom-title">{lesson.title}</h1>
          <p className="whitespace-pre-line">{lesson.description}</p>
          <div className="lesson-navigation">
            {index > 0 ? (
              <Link
                className="button-secondary"
                href={`/mi-aula/${courseId}/${lessons[index - 1].id}`}
              >
                <ChevronLeft size={16} />
                Clase anterior
              </Link>
            ) : (
              <span />
            )}
            {index < lessons.length - 1 && (
              <Link className="button" href={`/mi-aula/${courseId}/${lessons[index + 1].id}`}>
                Siguiente clase
                <ChevronRight size={16} />
              </Link>
            )}
          </div>
          <h2 className="text-xl mb-4">Material de la clase</h2>
          {resources?.length ? (
            resources.map((r) => (
              <a href={`/api/resources/${r.id}`} className="resource-link" key={r.id}>
                <FileDown size={18} />
                {r.title}
              </a>
            ))
          ) : (
            <p className="text-sm">Esta clase no tiene archivos complementarios.</p>
          )}
        </section>
        <aside className="panel syllabus-sidebar">
          <span className="eyebrow">TU RECORRIDO</span>
          <h2 className="text-lg mt-3 mb-6">{course.title}</h2>
          {course.modules
            ?.sort((a, b) => a.position - b.position)
            .map((m) => (
              <section key={m.id} className="mb-6">
                <h3>{m.title}</h3>
                <ul className="lesson-list">
                  {m.lessons
                    ?.sort((a, b) => a.position - b.position)
                    .map((l) => (
                      <li key={l.id}>
                        <Link
                          className={l.id === lessonId ? 'current' : ''}
                          aria-current={l.id === lessonId ? 'page' : undefined}
                          href={`/mi-aula/${courseId}/${l.id}`}
                        >
                          {progress?.some((p) => p.lesson_id === l.id && p.completed) ? (
                            <CheckCircle2 size={16} />
                          ) : (
                            <Play size={14} />
                          )}
                          <span>
                            {l.title}
                            <small className="block muted mt-1">
                              {formatDuration(l.duration_seconds)}
                            </small>
                          </span>
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            ))}
        </aside>
      </div>
    </>
  );
}

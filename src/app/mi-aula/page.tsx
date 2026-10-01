import Link from 'next/link';
import { BookOpen, Play } from 'lucide-react';
import { studentCourses, sortedLessons } from '@/lib/data/student';
import { CourseArtwork } from '@/components/course-card';
export const metadata = { title: 'Mi aula' };
export default async function MyCourses() {
  const { user, courses, progress } = await studentCourses();
  const name = String(user.user_metadata.full_name || '').split(' ')[0];
  const recent = progress.find(
    (p) => !p.completed && courses.some((c) => sortedLessons(c).some((l) => l.id === p.lesson_id)),
  );
  const recentCourse = courses.find((c) =>
    sortedLessons(c).some((l) => l.id === recent?.lesson_id),
  );
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU ESPACIO PARA CRECER</span>
        <h1>{name ? `Hola, ${name}.` : 'Tu próximo paso te espera.'}</h1>
        <p>Una clase a la vez. Seguí construyendo tu camino.</p>
      </div>
      {recent && recentCourse && (
        <section className="panel mb-8 flex flex-wrap items-center justify-between gap-5">
          <div>
            <span className="eyebrow">CONTINUAR APRENDIENDO</span>
            <h2 className="text-xl mt-3">{recentCourse.title}</h2>
            <p className="text-sm mt-2">
              {sortedLessons(recentCourse).find((l) => l.id === recent.lesson_id)?.title}
            </p>
          </div>
          <Link className="button" href={`/mi-aula/${recentCourse.id}/${recent.lesson_id}`}>
            <Play size={16} />
            Retomar clase
          </Link>
        </section>
      )}
      <h2 className="text-2xl mb-6">
        Mis cursos <span className="muted text-sm">({courses.length})</span>
      </h2>
      {courses.length ? (
        <div className="course-grid">
          {courses.map((c) => {
            const lessons = sortedLessons(c);
            const completed = lessons.filter((l) =>
              progress.some((p) => p.lesson_id === l.id && p.completed),
            ).length;
            const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0;
            return (
              <article className="course-card enrolled-card" key={c.id}>
                <CourseArtwork course={c} />
                <div className="course-card-content">
                  <div className="course-meta">
                    <span>{c.category}</span>
                    {c.status === 'archived' && <span>Tu acceso continúa</span>}
                  </div>
                  <h3>{c.title}</h3>
                  <div
                    className="course-progress"
                    role="progressbar"
                    aria-label={`Progreso en ${c.title}`}
                    aria-valuenow={percent}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div style={{ width: `${percent}%` }} />
                  </div>
                  <p className="text-xs">
                    {completed} de {lessons.length} clases completadas · {percent}%
                  </p>
                  <Link className="button" href={`/mi-aula/${c.id}`}>
                    {completed ? 'Continuar aprendiendo' : 'Empezar curso'}
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen size={32} />
          <h2>Tu próximo desafío está esperando.</h2>
          <p>Cuando tengas acceso a un curso, vas a encontrarlo acá junto con tu progreso.</p>
          <Link className="button" href="/cursos">
            Explorar cursos
          </Link>
        </div>
      )}
    </>
  );
}

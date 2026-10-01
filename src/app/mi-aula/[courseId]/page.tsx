import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { studentCourses, sortedLessons } from '@/lib/data/student';
export default async function CourseStart({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { courses, progress } = await studentCourses();
  const course = courses.find((c) => c.id === courseId);
  if (!course) notFound();
  const lessons = sortedLessons(course);
  const next =
    lessons.find((l) => !progress.some((p) => p.lesson_id === l.id && p.completed)) || lessons[0];
  if (next) redirect(`/mi-aula/${course.id}/${next.id}`);
  return (
    <div className="empty-state">
      <h1>Estamos preparando tus clases.</h1>
      <p>Tu acceso está habilitado. El contenido va a aparecer acá cuando esté disponible.</p>
      <Link className="button" href="/mi-aula">
        Volver a mis cursos
      </Link>
    </div>
  );
}

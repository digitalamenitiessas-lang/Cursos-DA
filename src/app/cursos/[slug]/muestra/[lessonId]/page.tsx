import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SiteHeader } from '@/components/site-header';
import { VideoPlayer } from '@/components/video-player';
import { getCourse } from '@/lib/data/courses';
export default async function Preview({
  params,
}: {
  params: Promise<{ slug: string; lessonId: string }>;
}) {
  const { slug, lessonId } = await params;
  const course = await getCourse(slug);
  const lesson = course?.modules
    ?.flatMap((m) => m.lessons ?? [])
    .find((l) => l.id === lessonId && l.is_preview);
  if (!course || !lesson || course.status !== 'published') notFound();
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space max-w-4xl">
        <Link className="text-primary text-sm" href={`/cursos/${slug}`}>
          Volver al curso
        </Link>
        <div className="page-heading mt-7">
          <span className="eyebrow">CLASE DE MUESTRA GRATUITA</span>
          <h1>{lesson.title}</h1>
          <p>{course.title}</p>
        </div>
        <VideoPlayer lessonId={lesson.id} preview />
        <p className="mt-6">{lesson.description}</p>
        <Link className="button mt-7" href={`/cursos/${slug}`}>
          Conocer el curso completo
        </Link>
      </main>
    </>
  );
}

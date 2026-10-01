import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getCourses } from '@/lib/data/courses';
import { CourseCard } from '@/components/course-card';
import { Catalog } from '@/components/catalog';
import { isDemo } from '@/lib/env';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explorar cursos' };
export default async function Courses() {
  const courses = await getCourses();
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space">
        <div className="page-heading">
          <span className="eyebrow">UN NUEVO PUNTO DE PARTIDA</span>
          <h1>Encontrá lo que te mueve.</h1>
          <p>Elegí una habilidad. Aprendé a tu ritmo. Hacé que pase.</p>
        </div>
        {isDemo() && (
          <p className="demo-notice">
            Vista de desarrollo · Cursos y docentes ficticios. Las compras están deshabilitadas.
          </p>
        )}
        <Catalog
          entries={courses.map((c) => ({
            id: c.id,
            category: c.category,
            search: `${c.title} ${c.description} ${c.instructor}`.toLocaleLowerCase('es'),
            node: <CourseCard course={c} />,
          }))}
        />
        {!courses.length && (
          <div className="empty-state">
            <h2>Próximamente, nuevos caminos.</h2>
            <p>Estamos preparando nuestros cursos. Volvé pronto para conocerlos.</p>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

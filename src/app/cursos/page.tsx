import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { loadCourseCatalog } from '@/lib/data/courses';
import { CourseCard } from '@/components/course-card';
import { Catalog } from '@/components/catalog';
import { learningPaths } from '@/lib/offering';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Explorar cursos' };
export default async function Courses({
  searchParams,
}: {
  searchParams: Promise<{ objetivo?: string }>;
}) {
  const { courses, unavailable } = await loadCourseCatalog();
  const { objetivo } = await searchParams;
  const goal = learningPaths.find((path) => path.id === objetivo)?.id ?? '';
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space">
        <div className="page-heading">
          <span className="eyebrow">DIGITAL AMENITIES / CURSOS Y CAPACITACIONES</span>
          <h1>¿Qué necesitás aprender?</h1>
          <p>
            IA aplicada, desarrollo web, automatizaciones y herramientas para tu trabajo. Revisá el
            nivel, el temario y los requisitos antes de elegir.
          </p>
        </div>
        <Catalog
          key={goal}
          initialGoal={goal}
          entries={courses.map((c) => ({
            id: c.id,
            category: c.category,
            search: `${c.title} ${c.description} ${c.instructor}`.toLocaleLowerCase('es'),
            node: <CourseCard course={c} />,
          }))}
        />
        {!courses.length && (
          <div className="empty-state">
            <h2>
              {unavailable
                ? 'No pudimos cargar el catálogo.'
                : 'Estamos preparando el catálogo de cursos.'}
            </h2>
            <p>
              {unavailable
                ? 'Volvé a intentarlo en unos minutos para consultar los cursos publicados.'
                : 'Publicaremos cada capacitación con su temario, requisitos y precio cuando esté lista. Todavía no hay cursos disponibles.'}
            </p>
            {unavailable && (
              <a className="button-secondary" href="/cursos">
                Volver a cargar
              </a>
            )}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

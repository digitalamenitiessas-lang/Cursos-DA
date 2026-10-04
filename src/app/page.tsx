import Link from 'next/link';
import { ArrowDown, ArrowUpRight, BookOpen, FileText, BadgeCheck } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CourseCard } from '@/components/course-card';
import { Button } from '@/components/ui/button';
import { LearningArtwork } from '@/components/home/learning-artwork';
import { ScrollJourney } from '@/components/home/scroll-journey';
import { loadCourseCatalog } from '@/lib/data/courses';
import { learningPaths } from '@/lib/offering';

export const dynamic = 'force-dynamic';
export default async function Home() {
  const { courses, unavailable } = await loadCourseCatalog();
  const highlighted = courses.filter((course) => course.featured);
  const featured = (highlighted.length ? highlighted : courses).slice(0, 3);
  return (
    <div className="home-v2 home-business">
      <SiteHeader />
      <main id="contenido">
        <section className="hero-v2 container-wide">
          <div className="hero-v2-top">
            <span className="eyebrow">
              <span className="tiny-orbit" /> FORMACIÓN PRÁCTICA / DIGITAL AMENITIES
            </span>
            <span className="hero-edition">CONOCIMIENTO QUE SE PONE A TRABAJAR</span>
          </div>
          <div className="hero-v2-main">
            <div className="hero-v2-copy">
              <h1>
                Tu trabajo,
                <br />
                con mejores
                <br />
                <span>herramientas.</span>
              </h1>
              <p>
                Aprendé a aplicar inteligencia artificial, crear una web o automatizar una tarea.
                Para tu profesión, tu trabajo o tu negocio.
              </p>
              <div className="hero-v2-actions">
                <Button asChild size="lg">
                  <Link href="/cursos">
                    Explorar cursos <ArrowUpRight size={18} />
                  </Link>
                </Button>
                <Link href="#recorridos" className="hero-secondary">
                  Encontrá por dónde empezar
                </Link>
              </div>
            </div>
            <LearningArtwork />
          </div>
          <div className="hero-v2-bottom">
            <a href="#cursos" className="scroll-cue">
              <span>
                <ArrowDown size={16} />
              </span>
              Empezá por algo que necesites resolver.
            </a>
            <span className="hero-coordinate">APRENDER / HACER / APLICAR</span>
          </div>
        </section>
        <div className="offering-strip container-wide">
          <span>PARA PERSONAS QUE TRABAJAN</span>
          <p>Profesionales.</p>
          <p>Emprendedores.</p>
          <p>Equipos.</p>
          <p>Vos.</p>
        </div>
        <section
          className="catalog-home container-wide"
          id="cursos"
          aria-labelledby="courses-heading"
        >
          <div className="section-heading">
            <div>
              <span className="eyebrow">01 / CURSOS Y CAPACITACIONES</span>
              <h2 id="courses-heading">Aprendé. Después, usalo.</h2>
            </div>
            <Link className="text-link" href="/cursos">
              Ver todos los cursos <ArrowUpRight size={17} />
            </Link>
          </div>
          {featured.length ? (
            <div className="course-grid">
              {featured.map((course) => (
                <CourseCard course={course} key={course.id} />
              ))}
            </div>
          ) : (
            <div className="catalog-empty">
              <BookOpen size={26} strokeWidth={1.4} />
              <div>
                <h3>
                  {unavailable
                    ? 'El catálogo no está disponible en este momento.'
                    : 'Estamos preparando nuestros cursos.'}
                </h3>
                <p>
                  {unavailable
                    ? 'Volvé a intentarlo en unos minutos para consultar los cursos publicados.'
                    : 'Acá vas a encontrar las capacitaciones publicadas, con su temario, nivel y precio.'}
                </p>
              </div>
              <Link href="/cursos" className="text-link">
                Ver catálogo <ArrowUpRight size={16} />
              </Link>
            </div>
          )}
        </section>
        <section
          className="learning-paths container-wide"
          id="recorridos"
          aria-labelledby="paths-heading"
        >
          <div className="paths-intro">
            <span className="eyebrow">ELEGÍ POR OBJETIVO</span>
            <h2 id="paths-heading">
              ¿Qué querés
              <br />
              hacer mejor?
            </h2>
            <p>No necesitás saber el nombre de una herramienta para saber qué querés resolver.</p>
          </div>
          <div className="path-list">
            {learningPaths.map((path) => (
              <Link href={`/cursos?objetivo=${path.id}`} className="path-row" key={path.id}>
                <span className="path-number">{path.number}</span>
                <div>
                  <span>{path.category}</span>
                  <h3>{path.title}</h3>
                  <p>{path.description}</p>
                </div>
                <ArrowUpRight size={22} strokeWidth={1.3} />
              </Link>
            ))}
          </div>
        </section>
        <section
          className="resources-feature container-wide"
          id="recursos"
          aria-labelledby="resources-heading"
        >
          <div className="resource-cover-composition" aria-hidden="true">
            <div className="resource-cover resource-cover-back">
              <span>DA / RECURSOS</span>
              <span>
                Una base
                <br />
                para crear.
              </span>
              <i />
            </div>
            <div className="resource-cover resource-cover-front">
              <FileText size={24} strokeWidth={1.2} />
              <span>
                Material
                <br />
                de trabajo.
              </span>
              <div>GUÍAS / PLANTILLAS / KITS</div>
            </div>
          </div>
          <div className="resources-feature-copy">
            <span className="eyebrow">02 / RECURSOS DIGITALES</span>
            <h2>
              Una buena base.
              <br />
              Tu forma de usarla.
            </h2>
            <p>
              Guías, plantillas, presentaciones y kits para acompañar tu formación o trabajar sobre
              una tarea puntual.
            </p>
            <p className="availability-note">
              Estamos preparando esta línea de recursos. Los productos se mostrarán cuando estén
              publicados.
            </p>
            <Link href="/recursos" className="text-link">
              Conocer los recursos <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
        <ScrollJourney />
        <section className="certificate-note container-wide" aria-labelledby="certificate-heading">
          <span className="certificate-emblem" aria-hidden="true">
            <BadgeCheck size={32} strokeWidth={1.2} />
          </span>
          <div>
            <span className="eyebrow">CERTIFICACIÓN, CON CONDICIONES CLARAS</span>
            <h2 id="certificate-heading">Sabé qué acredita tu aprendizaje.</h2>
            <p>
              Cuando un curso incluya certificado, su ficha indicará quién lo emite y qué requisitos
              tenés que cumplir. Completar clases y aprobar una actividad son condiciones distintas.
            </p>
          </div>
        </section>
        <section className="business-feature container-wide" aria-labelledby="business-heading">
          <div>
            <span className="eyebrow">03 / DIGITAL AMENITIES PARA TU EMPRESA</span>
            <h2 id="business-heading">
              A veces necesitás aprender.
              <br />
              <span>Otras, construirlo con alguien.</span>
            </h2>
            <p>
              Desarrollamos sitios, sistemas y automatizaciones a medida. Si tu proyecto necesita
              una solución específica, podemos trabajar sobre esa necesidad.
            </p>
            <Link href="/soluciones" className="button">
              Soluciones para empresas <ArrowUpRight size={17} />
            </Link>
          </div>
          <span className="business-monogram" aria-hidden="true" />
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

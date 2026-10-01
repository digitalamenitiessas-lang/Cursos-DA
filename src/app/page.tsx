import Link from 'next/link';
import { MoveDown, BookOpen, Infinity as InfinityIcon, Play } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CourseCard } from '@/components/course-card';
import { Button } from '@/components/ui/button';
import { InteractiveField } from '@/components/home/interactive-field';
import { ScrollJourney } from '@/components/home/scroll-journey';
import { getCourses } from '@/lib/data/courses';
import { isDemo } from '@/lib/env';

export const dynamic = 'force-dynamic';

export default async function Home() {
  const courses = await getCourses();
  const featured = courses.filter((c) => c.featured).slice(0, 3);
  return (
    <div className="home-v2">
      <div className="landing-intro">
        <InteractiveField />
        <SiteHeader />
        <main id="contenido">
          <section className="hero-v2 container-wide">
            <div className="hero-v2-top">
              <span className="eyebrow">
                <span className="tiny-orbit" /> UN ESPACIO PARA IR MÁS ALLÁ
              </span>
              <span className="hero-edition">A TU RITMO / DESDE CUALQUIER LUGAR</span>
            </div>
            <div className="hero-v2-copy">
              <h1>
                El futuro
                <br />
                se <span>aprende.</span>
              </h1>
              <p>
                Habilidades para lo que viene.
                <br />
                Un nuevo camino, a tu manera.
              </p>
              <div className="hero-v2-actions">
                <Button asChild size="lg">
                  <Link href="/cursos">
                    Encontrá tu próximo curso <span aria-hidden="true">↗</span>
                  </Link>
                </Button>
                <Link href="#metodo" className="hero-secondary">
                  Conocé nuestra forma de aprender
                </Link>
              </div>
            </div>
            <div className="hero-v2-bottom">
              <a href="#cursos" className="scroll-cue">
                <span>
                  <MoveDown size={17} />
                </span>
                Un poco de curiosidad cambia todo.
              </a>
              <span className="hero-coordinate">EXPLORÁ. APRENDÉ. AVANZÁ.</span>
            </div>
          </section>
          <section className="learning-principles container-wide" aria-label="La experiencia">
            <div>
              <Play size={18} strokeWidth={1.5} />
              <span>
                Clases grabadas<span>Tu tiempo, tus reglas.</span>
              </span>
            </div>
            <div>
              <InfinityIcon size={22} strokeWidth={1.5} />
              <span>
                Acceso para siempre<span>Volvé cuando lo necesites.</span>
              </span>
            </div>
            <div>
              <BookOpen size={19} strokeWidth={1.5} />
              <span>
                Aprendizaje práctico<span>Conocimientos que se usan.</span>
              </span>
            </div>
          </section>
          <section className="catalog-home container-wide" id="cursos">
            <div className="section-heading">
              <div>
                <span className="eyebrow">ELEGÍ TU DIRECCIÓN</span>
                <h2>
                  El próximo paso
                  <br className="mobile-break" /> es tuyo.
                </h2>
              </div>
              <Link className="all-courses-link" href="/cursos">
                Explorar todos los cursos <span aria-hidden="true">↗</span>
              </Link>
            </div>
            {isDemo() && (
              <p className="demo-notice">Vista de desarrollo · Cursos y docentes ficticios.</p>
            )}
            {featured.length ? (
              <div className="course-grid">
                {featured.map((c) => (
                  <CourseCard course={c} key={c.id} />
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <BookOpen size={30} />
                <h3>Algo nuevo está por empezar.</h3>
                <p>Muy pronto, tus primeros caminos para explorar.</p>
              </div>
            )}
          </section>
          <ScrollJourney />
          <section className="closing-section container-wide">
            <span className="eyebrow">NO NECESITÁS TENER TODO RESUELTO</span>
            <h2>
              Solo dar
              <br />
              el primer <span>paso.</span>
            </h2>
            <Button asChild size="lg">
              <Link href="/cursos">
                Empezá por tu curiosidad <span aria-hidden="true">↗</span>
              </Link>
            </Button>
            <p>Elegí qué querés aprender. Nosotros te acompañamos.</p>
          </section>
        </main>
      </div>
      <SiteFooter />
    </div>
  );
}

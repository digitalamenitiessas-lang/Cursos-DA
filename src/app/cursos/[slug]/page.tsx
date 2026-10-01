import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Check,
  LockKeyhole,
  Play,
  Clock3,
  Infinity as InfinityIcon,
  BookOpen,
  MonitorPlay,
} from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { CourseArtwork } from '@/components/course-card';
import { CheckoutButton } from '@/components/checkout-button';
import { getCourse, courseStats } from '@/lib/data/courses';
import { currentUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { isDemo, isSupabaseConfigured } from '@/lib/env';
import { formatMoney, formatDuration } from '@/lib/utils';
export const dynamic = 'force-dynamic';
export default async function Detail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const course = await getCourse(slug);
  if (!course) notFound();
  const user = await currentUser();
  let hasAccess = false;
  if (user) {
    const db = await createClient();
    const { data } = await db.rpc('has_course_access', { p_course_id: course.id });
    hasAccess = Boolean(data);
  }
  const stats = courseStats(course);
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space">
        <nav className="breadcrumb">
          <Link href="/cursos">Cursos</Link>
          <span>/</span>
          <span>{course.category}</span>
        </nav>
        {isDemo() && (
          <p className="demo-notice">Contenido ficticio de desarrollo. No se realizan cobros.</p>
        )}
        <div className="detail-layout">
          <div className="detail-main">
            <span className="badge">
              {course.category} · {course.level}
            </span>
            <h1>{course.title}</h1>
            <p className="lead">{course.subtitle}</p>
            <p className="instructor">
              Un curso de <strong>{course.instructor}</strong>
            </p>
            <section>
              <h2>Un paso más cerca de lo que querés hacer.</h2>
              <p className="whitespace-pre-line">{course.description}</p>
            </section>
            <section>
              <h2>Lo que te vas a llevar</h2>
              <ul className="check-list">
                {course.learning_outcomes.map((x, i) => (
                  <li key={i}>
                    <Check size={18} />
                    {x}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <h2>Tu recorrido</h2>
              <div className="syllabus">
                {course.modules
                  ?.sort((a, b) => a.position - b.position)
                  .map((m, i) => (
                    <details key={m.id} open={i === 0}>
                      <summary>
                        {String(i + 1).padStart(2, '0')} · {m.title}
                      </summary>
                      <ul>
                        {m.lessons
                          ?.sort((a, b) => a.position - b.position)
                          .map((l) => (
                            <li key={l.id}>
                              {l.is_preview ? <Play size={15} /> : <LockKeyhole size={14} />}
                              <span>{l.title}</span>
                              {l.is_preview ? (
                                <Link className="badge" href={`/cursos/${slug}/muestra/${l.id}`}>
                                  Ver muestra
                                </Link>
                              ) : null}
                              <span>{formatDuration(l.duration_seconds)}</span>
                            </li>
                          ))}
                      </ul>
                    </details>
                  ))}
              </div>
              {!course.modules?.length && <p>El temario se está preparando.</p>}
            </section>
            <section>
              <h2>Antes de empezar</h2>
              <ul className="check-list">
                {course.requirements.map((x, i) => (
                  <li key={i}>
                    <Check size={17} />
                    {x}
                  </li>
                ))}
              </ul>
            </section>
          </div>
          <aside className="panel purchase-panel">
            <CourseArtwork course={course} />
            <div className="purchase-inner">
              <h2>
                {formatMoney(course.price_cents)} <small className="text-sm muted">ARS</small>
              </h2>
              <p>Pago único. Sin cuotas de suscripción.</p>
              <CheckoutButton
                courseId={course.id}
                loggedIn={!!user}
                hasAccess={hasAccess}
                disabled={isDemo() || !isSupabaseConfigured() || course.status !== 'published'}
              />
              <div className="purchase-points">
                <span>
                  <BookOpen size={16} />
                  {stats.count} clases grabadas
                </span>
                <span>
                  <Clock3 size={16} />
                  {formatDuration(stats.duration)} de contenido
                </span>
                <span>
                  <InfinityIcon size={16} />
                  Acceso sin vencimiento
                </span>
                <span>
                  <MonitorPlay size={16} />
                  Desde tu computadora o celular
                </span>
              </div>
              <p className="muted text-xs mt-6">Pago seguro a través de Mercado Pago.</p>
            </div>
          </aside>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

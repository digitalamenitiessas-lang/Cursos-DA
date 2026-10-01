'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { BookOpen, Play, Check } from 'lucide-react';

const steps = [
  {
    word: 'Elegí.',
    title: 'Seguí tu curiosidad.',
    text: 'Explorá cada temario y encontrá esa habilidad que querés hacer tuya. Tu próximo paso empieza con una buena elección.',
    detail: 'Un curso. Un nuevo camino.',
    Icon: BookOpen,
  },
  {
    word: 'Aprendé.',
    title: 'El ritmo lo ponés vos.',
    text: 'Una clase en el desayuno. Otra al terminar el día. Tu aula guarda el punto exacto donde dejaste, para que seguir sea fácil.',
    detail: 'Sin horarios. Sin apuro.',
    Icon: Play,
  },
  {
    word: 'Avanzá.',
    title: 'Hacé lugar a lo que viene.',
    text: 'Completá tu recorrido, volvé a tus clases y consultá el material cuando lo necesites. Lo que aprendés se queda con vos.',
    detail: 'Un pago. Acceso sin vencimiento.',
    Icon: Check,
  },
];
export function ScrollJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    let ticking = false;
    const update = () => {
      ticking = false;
      const rect = section.getBoundingClientRect();
      const available = Math.max(section.offsetHeight - window.innerHeight, 1);
      const value = Math.min(1, Math.max(0, -rect.top / available));
      section.style.setProperty('--journey-progress', String(value));
      if (!media.matches) setActive(Math.min(2, Math.floor(value * 3)));
    };
    const scroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    const motion = () => {
      setReduced(media.matches);
      update();
    };
    motion();
    window.addEventListener('scroll', scroll, { passive: true });
    window.addEventListener('resize', scroll);
    media.addEventListener('change', motion);
    return () => {
      window.removeEventListener('scroll', scroll);
      window.removeEventListener('resize', scroll);
      media.removeEventListener('change', motion);
    };
  }, []);
  function go(index: number) {
    if (reduced) {
      setActive(index);
      return;
    }
    const section = sectionRef.current;
    if (!section) return;
    const y =
      window.scrollY +
      section.getBoundingClientRect().top +
      (section.offsetHeight - window.innerHeight) * (index / 3 + 0.07);
    window.scrollTo({ top: y, behavior: 'smooth' });
  }
  return (
    <section
      className="journey-section"
      ref={sectionRef}
      id="metodo"
      aria-label="Cómo se aprende en Digital Amenities"
    >
      <div className="journey-sticky container-wide">
        <div className="journey-topline">
          <span className="eyebrow">APRENDER PUEDE SER MÁS SIMPLE</span>
          <span className="journey-count">
            0{active + 1}
            <span> / 03</span>
          </span>
        </div>
        <div className="journey-stage">
          <div className="journey-word" aria-hidden="true">
            {steps.map((s, i) => (
              <span className={i === active ? 'is-active' : ''} key={s.word}>
                {s.word}
              </span>
            ))}
          </div>
          <div className="journey-copy">
            {steps.map((s, i) => (
              <section
                key={s.word}
                id={`journey-panel-${i}`}
                role="tabpanel"
                aria-labelledby={`journey-tab-${i}`}
                hidden={i !== active}
              >
                <span className="journey-icon">
                  <s.Icon size={23} strokeWidth={1.3} />
                </span>
                <h2>{s.title}</h2>
                <p>{s.text}</p>
                <span className="journey-detail">{s.detail}</span>
                {i === 2 && (
                  <Link href="/cursos" className="journey-link">
                    Encontrar mi próximo curso <span aria-hidden="true">↗</span>
                  </Link>
                )}
              </section>
            ))}
          </div>
        </div>
        <div className="journey-tabs" role="tablist" aria-label="Pasos para aprender">
          {steps.map((s, i) => (
            <button
              key={s.word}
              role="tab"
              id={`journey-tab-${i}`}
              aria-controls={`journey-panel-${i}`}
              aria-selected={i === active}
              onClick={() => go(i)}
              onKeyDown={(event) => {
                if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
                  event.preventDefault();
                  const next = (i + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                  go(next);
                  document.getElementById(`journey-tab-${next}`)?.focus();
                }
              }}
            >
              <span>0{i + 1}</span>
              {s.word.replace('.', '')}
              <div
                className={
                  i === active
                    ? 'tab-track is-active'
                    : i < active
                      ? 'tab-track is-done'
                      : 'tab-track'
                }
              />
            </button>
          ))}
        </div>
        <span className="journey-hint">Seguí explorando, a tu ritmo</span>
      </div>
    </section>
  );
}

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
const steps = [
  {
    number: '01',
    title: 'Elegí lo que necesitás.',
    text: 'Revisá el temario, el nivel y los requisitos. Buscá un curso que encaje con una tarea o un proyecto que quieras resolver.',
  },
  {
    number: '02',
    title: 'Comprá y accedé.',
    text: 'Creá tu cuenta y pagá con Mercado Pago. Cuando el pago se confirme, el curso aparece en tu aula.',
  },
  {
    number: '03',
    title: 'Aprendé y aplicalo.',
    text: 'Mirá las clases a tu ritmo, retomá donde dejaste y llevá lo aprendido a tu trabajo. Los materiales de cada curso están en el aula.',
  },
];
export function ScrollJourney() {
  return (
    <section
      className="learning-process container-wide"
      id="metodo"
      aria-labelledby="process-heading"
    >
      <div className="section-heading">
        <div>
          <span className="eyebrow">CÓMO FUNCIONA</span>
          <h2 id="process-heading">Del curso a tu práctica.</h2>
        </div>
        <Link className="text-link" href="/cursos">
          Explorar cursos <ArrowUpRight size={16} />
        </Link>
      </div>
      <ol className="process-steps">
        {steps.map((step) => (
          <li key={step.number}>
            <span>{step.number}</span>
            <h3>{step.title}</h3>
            <p>{step.text}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}

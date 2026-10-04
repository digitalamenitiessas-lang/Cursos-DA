import Link from 'next/link';
import { BadgeCheck } from 'lucide-react';
export const metadata = { title: 'Mis certificados' };
export default function MyCertificates() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MI CUENTA / TU FORMACIÓN</span>
        <h1>Mis certificados</h1>
        <p>Consultá la certificación y sus requisitos en la ficha de cada curso.</p>
      </div>
      <div className="empty-state">
        <BadgeCheck size={32} strokeWidth={1.3} />
        <h2>La emisión de certificados está en preparación.</h2>
        <p>
          Por el momento no se emiten certificados desde esta plataforma. Completar clases no
          equivale a aprobar una evaluación.
        </p>
        <Link href="/mi-aula" className="button">
          Ver mis cursos
        </Link>
      </div>
    </>
  );
}

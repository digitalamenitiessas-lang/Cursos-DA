import Link from 'next/link';
import { ArrowUpRight, Plus, BookOpen, Users, CreditCard } from 'lucide-react';
import { StudioArtwork } from './studio-artwork';
export function StudioWelcome() {
  return (
    <>
      <section className="studio-welcome">
        <div className="studio-welcome-copy">
          <p className="eyebrow">DIGITAL AMENITIES / ADMINISTRACIÓN</p>
          <h1>
            Tu formación.
            <br />
            <em>Bien organizada.</em>
          </h1>
          <p>Creá cursos, organizá clases y revisá los accesos y pagos de tus alumnos.</p>
          <Link href="/admin/cursos/nuevo" className="button">
            <Plus size={16} /> Crear un curso <ArrowUpRight size={15} />
          </Link>
        </div>
        <StudioArtwork />
      </section>
      <div className="studio-shortcuts">
        {[
          {
            href: '/admin/cursos',
            title: 'Cursos y contenido',
            text: 'Módulos, clases y publicación.',
            Icon: BookOpen,
          },
          {
            href: '/admin/alumnos',
            title: 'Alumnos y accesos',
            text: 'Personas, progreso y accesos.',
            Icon: Users,
          },
          {
            href: '/admin/pagos',
            title: 'Ventas y pagos',
            text: 'Estados de pago y conciliación.',
            Icon: CreditCard,
          },
        ].map(({ href, title, text, Icon }) => (
          <div className="studio-shortcut-card" key={href}>
            <Link href={href}>
              <span className="studio-shortcut-icon">
                <Icon size={20} />
              </span>
              <span>
                <strong>{title}</strong>
                <small>{text}</small>
              </span>
              <ArrowUpRight size={17} />
            </Link>
          </div>
        ))}
      </div>
    </>
  );
}

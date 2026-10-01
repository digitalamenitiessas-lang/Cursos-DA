import Link from 'next/link';
import { ArrowUpRight, Plus, BookOpen, Users, CreditCard } from 'lucide-react';
import { StudioArtwork } from './studio-artwork';
import { SpotlightCard } from '@/components/react-bits/spotlight-card';
export function StudioWelcome() {
  return (
    <>
      <section className="studio-welcome">
        <div className="studio-welcome-copy">
          <p className="eyebrow">MENOS FRICCIÓN. MÁS CREACIÓN.</p>
          <h1>
            Tu conocimiento.
            <br />
            <em>El próximo comienzo.</em>
          </h1>
          <p>Este es tu espacio para crear cursos, acompañar alumnos y hacer crecer la academia.</p>
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
            title: 'Tu contenido',
            text: 'Del borrador a la primera clase.',
            Icon: BookOpen,
          },
          {
            href: '/admin/alumnos',
            title: 'Tu comunidad',
            text: 'Personas, progreso y accesos.',
            Icon: Users,
          },
          {
            href: '/admin/pagos',
            title: 'Tus ventas',
            text: 'Cada pago, en un solo lugar.',
            Icon: CreditCard,
          },
        ].map(({ href, title, text, Icon }) => (
          <SpotlightCard key={href}>
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
          </SpotlightCard>
        ))}
      </div>
    </>
  );
}

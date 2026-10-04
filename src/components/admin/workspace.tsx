'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  ArrowUpRight,
  BookOpen,
  ChartNoAxesCombined,
  CreditCard,
  Users,
  Plus,
  Menu,
  X,
  LogOut,
  ChevronRight,
  PanelLeftClose,
  Settings2,
} from 'lucide-react';
import { Brand } from '@/components/brand';
import { signOut } from '@/app/auth/actions';

const links = [
  {
    href: '/admin',
    label: 'Vista general',
    Icon: ChartNoAxesCombined,
    detail: 'Tu academia, en perspectiva',
  },
  {
    href: '/admin/cursos',
    label: 'Cursos y contenido',
    Icon: BookOpen,
    detail: 'Creá, organizá y publicá',
  },
  {
    href: '/admin/alumnos',
    label: 'Alumnos y accesos',
    Icon: Users,
    detail: 'Acompañá cada aprendizaje',
  },
  { href: '/admin/pagos', label: 'Pagos', Icon: CreditCard, detail: 'Ventas y conciliación' },
  {
    href: '/admin/configuracion',
    label: 'Configuración',
    Icon: Settings2,
    detail: 'Conexiones de la academia',
  },
];
export function AdminWorkspace({
  children,
  name = 'Equipo DA',
  preview = false,
}: {
  children: React.ReactNode;
  name?: string;
  preview?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active =
    links.find((link) =>
      link.href === '/admin' ? pathname === '/admin' : pathname.startsWith(link.href),
    ) || links[0];
  return (
    <div className="admin-workspace">
      <aside className={`studio-sidebar ${open ? 'is-open' : ''}`}>
        <div className="studio-brand">
          <Brand />
          <span className="studio-label">STUDIO</span>
        </div>
        <button
          className="studio-mobile-toggle"
          type="button"
          aria-label="Cerrar navegación"
          onClick={() => setOpen(false)}
        >
          <X size={20} />
        </button>
        <Link href="/admin/cursos/nuevo" className="studio-create" onClick={() => setOpen(false)}>
          <Plus size={17} /> Crear un curso <span>↗</span>
        </Link>
        <p className="studio-nav-caption">TU ESPACIO DE TRABAJO</p>
        <nav aria-label="Administración" id="studio-navigation">
          {links.map(({ href, label, Icon, detail }) => {
            const selected = href === '/admin' ? pathname === href : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={selected ? 'page' : undefined}
                className={`studio-nav-item ${selected ? 'is-active' : ''}`}
                onClick={() => setOpen(false)}
              >
                <Icon size={19} />
                <span>
                  {label}
                  <small>{detail}</small>
                </span>
                <ChevronRight size={13} />
              </Link>
            );
          })}
        </nav>
        <div className="studio-sidebar-bottom">
          <div className="studio-sidebar-note">
            <span className="studio-status-dot" />
            <span>
              Formación práctica.
              <br />
              Contenido bien organizado.
            </span>
          </div>
          <Link href="/cursos" className="studio-external">
            Ver academia <ArrowUpRight size={15} />
          </Link>
          <div className="studio-account">
            <span className="studio-avatar">{name.charAt(0).toLocaleUpperCase('es')}</span>
            <span>
              {name}
              <small>Administración</small>
            </span>
            {!preview && (
              <form action={signOut}>
                <button title="Cerrar sesión" aria-label="Cerrar sesión">
                  <LogOut size={16} />
                </button>
              </form>
            )}
          </div>
        </div>
      </aside>
      <div className="studio-main">
        <header className="studio-topbar">
          <button
            type="button"
            className="studio-mobile-toggle"
            aria-label={open ? 'Cerrar navegación' : 'Abrir navegación'}
            aria-expanded={open}
            aria-controls="studio-navigation"
            onClick={() => setOpen(!open)}
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
          <div className="studio-breadcrumb">
            <PanelLeftClose size={16} />
            <span>Digital Amenities</span>
            <ChevronRight size={13} />
            <strong>{active.label}</strong>
          </div>
          <Link href="/cursos" className="studio-top-link">
            Ir a la academia <ArrowUpRight size={14} />
          </Link>
        </header>
        <main id="contenido" className="admin-shell studio-content">
          {preview && (
            <p className="studio-preview-notice">
              Vista de diseño para revisión · Sin sesión ni datos administrativos
            </p>
          )}
          {children}
        </main>
        <footer className="studio-footer">
          <span>Digital Amenities · Studio</span>
          <span>Aprender. Crear. Compartir.</span>
        </footer>
      </div>
    </div>
  );
}

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import '@/components/admin/admin.css';
import { ArrowUpRight, BookOpen, ChartNoAxesCombined, CreditCard, Users } from 'lucide-react';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const links = [
    { href: '/admin', label: 'Resumen', Icon: ChartNoAxesCombined },
    { href: '/admin/cursos', label: 'Cursos', Icon: BookOpen },
    { href: '/admin/alumnos', label: 'Alumnos y accesos', Icon: Users },
    { href: '/admin/pagos', label: 'Pagos', Icon: CreditCard },
  ];
  return (
    <main id="contenido" className="admin-shell container-wide py-8 md:py-12">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="eyebrow">ADMINISTRACIÓN</p>
          <p className="mt-2 text-sm text-slate-400">
            Todo lo que necesitás para hacer crecer tu academia.
          </p>
        </div>
        <Link href="/cursos" className="button-secondary">
          Ver academia <ArrowUpRight size={16} />
        </Link>
      </div>
      <nav
        aria-label="Administración"
        className="mb-9 flex gap-2 overflow-x-auto border-b border-white/10 pb-4"
      >
        {links.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.03] px-4 py-2.5 text-sm text-slate-200 transition hover:border-violet-400/50 hover:bg-violet-500/10"
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </main>
  );
}

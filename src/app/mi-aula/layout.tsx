import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { requirePageUser } from '@/lib/auth';
import { signOut } from '@/app/auth/actions';
export const dynamic = 'force-dynamic';
export default async function StudentLayout({ children }: { children: React.ReactNode }) {
  const { supabase } = await requirePageUser();
  const { data: admin } = await supabase.rpc('is_admin');
  return (
    <>
      <SiteHeader />
      <div className="container-wide">
        <nav className="workspace-nav" aria-label="Mi cuenta">
          <Link href="/mi-aula">Mis cursos</Link>
          <Link href="/mi-aula/compras">Mis compras</Link>
          <Link href="/mi-aula/perfil">Mi perfil</Link>
          {admin && <Link href="/admin">Administración</Link>}
          <form action={signOut} className="logout">
            <button>Cerrar sesión</button>
          </form>
        </nav>
        <main id="contenido" className="pb-16">
          {children}
        </main>
      </div>
    </>
  );
}

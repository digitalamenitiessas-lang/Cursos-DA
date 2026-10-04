import Link from 'next/link';
import { Menu } from 'lucide-react';
import { Brand } from './brand';
import { currentUser } from '@/lib/auth';
import { Button } from './ui/button';
const navigation = [
  { href: '/', label: 'Inicio' },
  { href: '/cursos', label: 'Cursos' },
  { href: '/recursos', label: 'Recursos digitales' },
  { href: '/soluciones', label: 'Soluciones para empresas' },
];
export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="container-wide header-inner">
        <Brand />
        <nav aria-label="Navegación principal" className="public-nav">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          {user ? (
            <Button asChild size="sm">
              <Link href="/mi-aula">Mi cuenta</Link>
            </Button>
          ) : (
            <>
              <Link className="login-link" href="/ingresar">
                Ingresar
              </Link>
              <Button asChild size="sm">
                <Link href="/registro" className="signup-link">
                  Crear cuenta
                </Link>
              </Button>
            </>
          )}
        </div>
        <details className="mobile-navigation">
          <summary aria-label="Menú principal">
            <Menu size={22} />
            <span className="sr-only">Menú principal</span>
          </summary>
          <nav aria-label="Navegación móvil">
            {navigation.map((item) => (
              <Link href={item.href} key={item.href}>
                {item.label}
              </Link>
            ))}
            <Link href={user ? '/mi-aula' : '/registro'}>
              {user ? 'Mi cuenta' : 'Crear cuenta'}
            </Link>
          </nav>
        </details>
      </div>
    </header>
  );
}

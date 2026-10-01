import Link from 'next/link';
import { Brand } from './brand';
import { currentUser } from '@/lib/auth';
import { Button } from './ui/button';
export async function SiteHeader() {
  const user = await currentUser();
  return (
    <header className="site-header">
      <div className="container-wide header-inner">
        <Brand />
        <nav aria-label="Navegación principal" className="public-nav">
          <Link href="/cursos">Explorar cursos</Link>
          <Link href="/#metodo" className="hide-small">
            Nuestra forma de aprender
          </Link>
        </nav>
        <div className="header-actions">
          {user ? (
            <Button asChild>
              <Link href="/mi-aula">Mi aula</Link>
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
      </div>
    </header>
  );
}

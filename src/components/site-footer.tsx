import { Brand } from './brand';
import Link from 'next/link';
import { brand } from '@/lib/brand';
export function SiteFooter() {
  return (
    <footer className="site-footer container-wide">
      <div>
        <Brand signature />
        <p>Aprendé a tu ritmo. Construí lo que viene.</p>
      </div>
      <div className="footer-links">
        <Link href="/cursos">Cursos</Link>
        <Link href="/mi-aula">Mi aula</Link>
        <span>
          © {new Date().getFullYear()} {brand.fullName}
        </span>
      </div>
    </footer>
  );
}

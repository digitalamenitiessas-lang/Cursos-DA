import { Brand } from './brand';
import Link from 'next/link';
import { brand } from '@/lib/brand';
import { ArrowUpRight } from 'lucide-react';
export function SiteFooter() {
  return (
    <footer className="site-footer container-wide footer-business">
      <div>
        <Brand />
        <p>
          Formación y soluciones digitales
          <br />
          para el trabajo de todos los días.
        </p>
      </div>
      <nav aria-label="Enlaces del pie">
        <span>APRENDÉ Y APLICÁ</span>
        <Link href="/cursos">Cursos y capacitaciones</Link>
        <Link href="/recursos">Recursos digitales</Link>
        <Link href="/mi-aula">Mi cuenta</Link>
      </nav>
      <nav aria-label="Digital Amenities">
        <span>CONSTRUÍ CON NOSOTROS</span>
        <Link href="/soluciones">Soluciones para empresas</Link>
        <a
          href={brand.website}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2"
        >
          Sitio de Digital Amenities <ArrowUpRight size={14} aria-hidden="true" />
          <span className="sr-only"> (abre en otra pestaña)</span>
        </a>
        <p>
          Sitios, sistemas, automatizaciones
          <br />e integración de IA.
        </p>
      </nav>
      <div className="footer-colophon">
        <span>
          © {new Date().getFullYear()} {brand.fullName}
        </span>
        <span>CONOCIMIENTO. HERRAMIENTAS. CRITERIO.</span>
      </div>
    </footer>
  );
}

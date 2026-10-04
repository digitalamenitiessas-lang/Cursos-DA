import Link from 'next/link';
import { ArrowUpRight, FileText, Layers3 } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { resourceFormats } from '@/lib/offering';
export const metadata = {
  title: 'Recursos digitales',
  description: 'Guías, plantillas, presentaciones y kits para llevar la formación a tu trabajo.',
};
export default function Resources() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space offering-page">
        <header className="offering-page-heading">
          <span className="eyebrow">DIGITAL AMENITIES / RECURSOS DIGITALES</span>
          <h1>
            Material que te sirve.
            <br />
            <span>Listo para hacerlo tuyo.</span>
          </h1>
          <p>
            Una guía para consultar, una plantilla para adaptar o un kit para organizar un proyecto.
            Recursos que complementan la formación y también pueden usarse por separado.
          </p>
        </header>
        <div className="resource-types">
          {resourceFormats.map((item) => (
            <article key={item.number}>
              <div>
                <span>{item.number}</span>
                <span className="resource-format">{item.format}</span>
              </div>
              <FileText size={30} strokeWidth={1.2} />
              <h2>{item.title}</h2>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
        <section className="catalog-empty resource-availability">
          <Layers3 size={28} strokeWidth={1.3} />
          <div>
            <h2>Estamos preparando el catálogo.</h2>
            <p>
              Los productos aparecerán cuando estén publicados. Cada ficha detallará el contenido,
              el formato, las herramientas necesarias y las condiciones de uso.
            </p>
          </div>
        </section>
        <section className="offering-info">
          <span className="eyebrow">ELEGÍ CON LA INFORMACIÓN COMPLETA</span>
          <h2>
            El archivo importa.
            <br />
            Lo que podés hacer con él, también.
          </h2>
          <div>
            <p>
              Vas a poder saber si el material es editable, qué programa necesitás para usarlo y qué
              está incluido antes de comprar.
            </p>
            <p>
              Mientras preparamos los recursos, podés explorar los cursos y sus materiales de
              aprendizaje.
            </p>
            <Link href="/cursos" className="text-link">
              Explorar cursos <ArrowUpRight size={17} />
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

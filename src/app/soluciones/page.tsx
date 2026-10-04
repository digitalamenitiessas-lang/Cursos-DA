import { ArrowDown, ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { businessServices } from '@/lib/offering';
import { brand } from '@/lib/brand';
export const metadata = {
  title: 'Soluciones para empresas',
  description:
    'Sitios web, sistemas, automatizaciones e integración de IA a medida con Digital Amenities.',
};
export default function Solutions() {
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space offering-page solutions-page">
        <header className="offering-page-heading">
          <span className="eyebrow">DIGITAL AMENITIES / SOLUCIONES A MEDIDA</span>
          <h1>
            Tu negocio tiene
            <br />
            <span>su forma de trabajar.</span>
          </h1>
          <p>
            La tecnología debería acompañarla. Diseñamos sitios, sistemas y automatizaciones
            alrededor de una necesidad concreta de tu actividad.
          </p>
          <a href="#servicios" className="text-link">
            Conocé qué podemos construir <ArrowDown size={17} />
          </a>
          <span className="solutions-brand-mark" aria-hidden="true" />
        </header>
        <section
          className="service-list"
          id="servicios"
          aria-label="Servicios de Digital Amenities"
        >
          {businessServices.map((service) => (
            <article key={service.number}>
              <span>{service.number}</span>
              <h2>{service.title}</h2>
              <p>{service.text}</p>
              <ArrowUpRight size={22} strokeWidth={1.2} aria-hidden="true" />
            </article>
          ))}
        </section>
        <section className="service-contact" id="consulta" aria-labelledby="inquiry-heading">
          <div>
            <span className="eyebrow">UNA CONVERSACIÓN PARA EMPEZAR</span>
            <h2 id="inquiry-heading">
              Contanos qué
              <br />
              necesitás resolver.
            </h2>
            <p>
              Podés tener una idea definida o un proceso que querés mejorar. Nos interesa entender
              cómo trabajás y qué te gustaría cambiar.
            </p>
            <span className="service-condition">
              Cada proyecto se presupuesta según su alcance.
            </span>
            <a
              href={brand.website}
              target="_blank"
              rel="noopener noreferrer"
              className="text-link mt-5"
            >
              Visitá el sitio de Digital Amenities <ArrowUpRight size={17} aria-hidden="true" />
              <span className="sr-only"> (abre en otra pestaña)</span>
            </a>
          </div>
          <div className="inquiry-preview">
            <p className="availability-note" id="inquiry-status">
              Estamos habilitando este canal de consultas. Por el momento el formulario no recibe
              envíos.
            </p>
            <fieldset disabled aria-describedby="inquiry-status">
              <label className="field">
                <span>Nombre</span>
                <input className="input" name="name" autoComplete="name" placeholder="Tu nombre" />
              </label>
              <label className="field">
                <span>Correo electrónico</span>
                <input
                  className="input"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="nombre@empresa.com"
                />
              </label>
              <label className="field">
                <span>
                  Empresa <small>Opcional</small>
                </span>
                <input
                  className="input"
                  name="company"
                  autoComplete="organization"
                  placeholder="Nombre de tu empresa o actividad"
                />
              </label>
              <label className="field">
                <span>¿Qué necesitás?</span>
                <textarea
                  className="input"
                  name="need"
                  placeholder="Contanos sobre el proyecto, la tarea o el proceso."
                  rows={4}
                />
              </label>
              <button className="button" type="button" disabled>
                Enviar consulta <ArrowUpRight size={17} />
              </button>
            </fieldset>
          </div>
        </section>
        <div className="solutions-course-link">
          <p>¿Preferís aprender a hacerlo vos?</p>
          <Link href="/cursos" className="text-link">
            Explorá nuestra formación <ArrowUpRight size={16} />
          </Link>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

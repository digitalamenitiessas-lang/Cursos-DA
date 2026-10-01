import type { Metadata } from 'next';
import './globals.css';
import { brand } from '@/lib/brand';
export const metadata: Metadata = {
  title: { default: brand.fullName, template: `%s · ${brand.name}` },
  description:
    'Cursos prácticos para desarrollar nuevas habilidades, a tu ritmo y desde donde estés.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-AR" className="dark" data-scroll-behavior="smooth">
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

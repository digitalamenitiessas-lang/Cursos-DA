import type { Metadata } from 'next';
import { Figtree, Inter, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { brand } from '@/lib/brand';
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const figtree = Figtree({ subsets: ['latin'], variable: '--font-figtree', display: 'swap' });
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-plex-mono',
  display: 'swap',
});
export const metadata: Metadata = {
  title: { default: brand.fullName, template: `%s · ${brand.name}` },
  description:
    'Formación práctica en IA aplicada, desarrollo web y automatizaciones. Recursos digitales y soluciones a medida de Digital Amenities para tu profesión o negocio.',
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="es-AR"
      className={`dark ${inter.variable} ${figtree.variable} ${mono.variable}`}
      data-scroll-behavior="smooth"
    >
      <body>
        <a className="skip-link" href="#contenido">
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}

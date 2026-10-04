import Link from 'next/link';
import { FolderDown } from 'lucide-react';
export const metadata = { title: 'Mis recursos' };
export default function MyResources() {
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">MI CUENTA / MATERIAL DE TRABAJO</span>
        <h1>Mis recursos</h1>
        <p>Un lugar para reunir tus guías, plantillas y kits digitales.</p>
      </div>
      <div className="empty-state">
        <FolderDown size={32} strokeWidth={1.3} />
        <h2>El catálogo de recursos está en preparación.</h2>
        <p>
          Esta sección estará disponible cuando habilitemos los productos descargables. Los
          materiales incluidos en tus cursos siguen en el aula de cada curso.
        </p>
        <Link href="/mi-aula" className="button">
          Ir a mis cursos
        </Link>
      </div>
    </>
  );
}

import Link from 'next/link';
export default function NotFound() {
  return (
    <main id="contenido" className="container-wide section-space">
      <div className="empty-state">
        <span className="eyebrow">404 · PÁGINA NO ENCONTRADA</span>
        <h1>No encontramos esta página.</h1>
        <p>El curso puede no estar disponible o el enlace puede haber cambiado.</p>
        <Link className="button" href="/cursos">
          Explorar cursos
        </Link>
      </div>
    </main>
  );
}

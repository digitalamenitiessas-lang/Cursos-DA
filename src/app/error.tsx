'use client';
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main id="contenido" className="container-wide section-space">
      <div className="empty-state">
        <h1>No pudimos cargar esta página.</h1>
        <p>Puede ser un problema temporal. Volvé a intentarlo en unos momentos.</p>
        <button className="button" onClick={reset}>
          Intentar nuevamente
        </button>
        <a href="/">Volver al inicio</a>
      </div>
    </main>
  );
}

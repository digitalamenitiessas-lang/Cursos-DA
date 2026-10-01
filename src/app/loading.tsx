export default function Loading() {
  return (
    <main
      id="contenido"
      className="container-wide section-space"
      aria-busy="true"
      aria-label="Cargando contenido"
    >
      <div className="loading-shimmer h-10 w-72" />
      <div className="loading-shimmer loading-box" />
      <p>Cargando tu próximo paso…</p>
    </main>
  );
}

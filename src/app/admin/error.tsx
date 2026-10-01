'use client';
export default function AdminError({ reset }: { reset: () => void }) {
  return (
    <div className="panel space-y-4 p-8" role="alert">
      <h2 className="text-xl font-semibold">No pudimos cargar el panel</h2>
      <p className="muted">
        Revisá la configuración y la conexión de Supabase e intentá nuevamente.
      </p>
      <button className="button" onClick={reset}>
        Volver a intentar
      </button>
    </div>
  );
}

export default function Loading() {
  return (
    <div className="space-y-6" role="status">
      <p className="muted">Cargando administración…</p>
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <div
            className="h-32 animate-pulse rounded-2xl bg-white/5 motion-reduce:animate-none"
            key={i}
          />
        ))}
      </div>
    </div>
  );
}

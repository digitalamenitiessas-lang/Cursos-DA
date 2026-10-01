export function AdminNotice({ error, success }: { error?: string; success?: string }) {
  if (!error && !success) return null;
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={`rounded-xl border px-4 py-3 text-sm ${error ? 'border-rose-400/30 bg-rose-500/10 text-rose-200' : 'border-cyan-400/25 bg-cyan-400/10 text-cyan-100'}`}
    >
      {error || success}
    </div>
  );
}

'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw } from 'lucide-react';
export function ReconcileButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  async function reconcile() {
    setBusy(true);
    setMessage('');
    setError(false);
    try {
      const response = await fetch('/api/cron/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No se pudo consultar Mercado Pago.');
      const rows = Array.isArray(data.results) ? data.results : [];
      const failed =
        Number(data.failedOrders || 0) +
        rows.reduce((sum: number, row: { failed?: number }) => sum + Number(row.failed || 0), 0);
      setError(failed > 0);
      setMessage(
        `Conciliación terminada: ${rows.length} órdenes revisadas.${failed ? ` ${failed} revisiones fallaron; volvé a intentarlo.` : ''}${data.hasMore ? ' Hay más órdenes pendientes. Ejecutá otra conciliación.' : ''}`,
      );
      router.refresh();
    } catch (error) {
      setError(true);
      setMessage(error instanceof Error ? error.message : 'Falló la conciliación.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-2">
      <button className="button-secondary" disabled={busy} onClick={() => void reconcile()}>
        <RefreshCw size={15} className={busy ? 'animate-spin motion-reduce:animate-none' : ''} />
        {busy ? 'Conciliando…' : 'Conciliar pagos'}
      </button>
      {message && (
        <p
          role={error ? 'alert' : 'status'}
          className={`max-w-md text-xs ${error ? 'text-rose-300' : 'text-cyan-200'}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}

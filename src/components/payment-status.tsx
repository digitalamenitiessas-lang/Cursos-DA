'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { CheckCircle2, Clock3, CircleAlert } from 'lucide-react';
import { paymentLabels } from '@/lib/payment-labels';
type Status = { order: { status: string; course_id: string }; hasAccess: boolean };
export function PaymentStatus({ orderId }: { orderId: string }) {
  const [data, setData] = useState<Status | null>(null),
    [error, setError] = useState(''),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    async function poll() {
      try {
        const r = await fetch(`/api/orders/${encodeURIComponent(orderId)}`, { cache: 'no-store' });
        const result = await r.json();
        if (!r.ok) throw new Error(result.error || 'No pudimos consultar el pago.');
        if (!active) return;
        setData(result);
        setError('');
        attempts++;
        if (
          ['pending', 'in_process', 'authorized', 'in_mediation'].includes(result.order.status) &&
          attempts < 60
        )
          timer = setTimeout(poll, 5000);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Comprobá tu conexión.');
      }
    }
    void poll();
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [orderId, retry]);
  const status = data?.order.status;
  const pending =
    !status || ['pending', 'in_process', 'authorized', 'in_mediation'].includes(status);
  return (
    <section className="status-center panel">
      {data?.hasAccess ? (
        <CheckCircle2 size={48} />
      ) : pending ? (
        <Clock3 size={48} />
      ) : (
        <CircleAlert size={48} />
      )}
      <span className="eyebrow">TU COMPRA</span>
      <h1 className="mt-4">
        {data?.hasAccess
          ? 'Tu curso ya te está esperando.'
          : pending
            ? 'Estamos confirmando tu pago.'
            : 'El estado de tu compra cambió.'}
      </h1>
      <p>
        {data?.hasAccess
          ? 'Tu acceso está habilitado. Ya podés dar el primer paso.'
          : pending
            ? 'La confirmación puede demorar unos minutos. Podés cerrar esta página y consultar el estado desde Mis compras.'
            : status === 'partial_refund'
              ? 'Registramos un reembolso parcial. Tu acceso está pausado mientras la academia revisa el caso.'
              : `Estado: ${paymentLabels[status || ''] || status}. Podés consultar los detalles en Mercado Pago.`}
      </p>
      {error && (
        <p role="alert" className="notice error-notice">
          {error}
        </p>
      )}
      {data?.hasAccess ? (
        <Link className="button" href={`/mi-aula/${data.order.course_id}`}>
          Ir a mi curso
        </Link>
      ) : (
        <button className="button" onClick={() => setRetry((r) => r + 1)}>
          Actualizar estado
        </button>
      )}
      <div className="mt-5">
        <Link href="/mi-aula/compras" className="text-sm text-primary">
          Ver mis compras
        </Link>
      </div>
      {data && ['rejected', 'cancelled'].includes(status!) && (
        <Link className="button-secondary mt-5" href={`/comprar/${data.order.course_id}`}>
          Volver a intentar la compra
        </Link>
      )}
    </section>
  );
}

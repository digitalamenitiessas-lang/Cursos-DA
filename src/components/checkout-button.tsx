'use client';
import { useState } from 'react';
import Link from 'next/link';
export function CheckoutButton({
  courseId,
  loggedIn,
  hasAccess,
  disabled = false,
}: {
  courseId: string;
  loggedIn: boolean;
  hasAccess: boolean;
  disabled?: boolean;
}) {
  const [pending, setPending] = useState(false),
    [error, setError] = useState('');
  if (hasAccess)
    return (
      <Link className="button" href={`/mi-aula/${courseId}`}>
        Continuar aprendiendo
      </Link>
    );
  if (!loggedIn && !disabled)
    return (
      <Link
        className="button"
        href={`/ingresar?next=${encodeURIComponent(`/comprar/${courseId}`)}`}
      >
        Ingresar para comprar
      </Link>
    );
  return (
    <>
      <button
        disabled={pending || disabled}
        className="button"
        onClick={async () => {
          setPending(true);
          setError('');
          try {
            const r = await fetch('/api/checkout', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ courseId }),
            });
            const d = await r.json();
            if (!r.ok) throw new Error(d.error || 'No se pudo iniciar la compra.');
            window.location.assign(d.checkoutUrl);
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Intentá nuevamente.');
            setPending(false);
          }
        }}
      >
        {disabled
          ? 'Disponible al configurar la academia'
          : pending
            ? 'Preparando tu compra…'
            : 'Comprar este curso'}
      </button>
      {error && (
        <p role="alert" className="notice error-notice">
          {error}
        </p>
      )}
    </>
  );
}

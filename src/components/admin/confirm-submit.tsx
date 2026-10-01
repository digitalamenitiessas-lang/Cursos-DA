'use client';
import { useFormStatus } from 'react-dom';
export function ConfirmSubmit({
  children,
  message,
  className = 'button-secondary',
}: {
  children: React.ReactNode;
  message?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      disabled={pending}
      onClick={(event) => {
        if (message && !window.confirm(message)) event.preventDefault();
      }}
    >
      {pending ? 'Guardando…' : children}
    </button>
  );
}

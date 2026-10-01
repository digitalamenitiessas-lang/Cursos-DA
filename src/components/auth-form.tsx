'use client';
import { useActionState } from 'react';
import { authenticate } from '@/app/auth/actions';
import Link from 'next/link';
export function AuthForm({
  mode,
  next = '/mi-aula',
}: {
  mode: 'signin' | 'signup' | 'recover' | 'update';
  next?: string;
}) {
  const [state, action, pending] = useActionState(authenticate, {});
  return (
    <form action={action}>
      <input type="hidden" name="mode" value={mode} />
      <input type="hidden" name="next" value={next} />
      {mode === 'signup' && (
        <label className="field">
          Nombre completo
          <input
            name="full_name"
            autoComplete="name"
            required
            minLength={2}
            maxLength={160}
            placeholder="Tu nombre"
          />
        </label>
      )}
      {mode !== 'update' && (
        <label className="field">
          Correo electrónico
          <input
            type="email"
            name="email"
            autoComplete="email"
            required
            maxLength={254}
            placeholder="vos@ejemplo.com"
          />
        </label>
      )}
      {mode !== 'recover' && (
        <label className="field">
          {mode === 'update' ? 'Nueva contraseña' : 'Contraseña'}
          <input
            type="password"
            name="password"
            required
            minLength={8}
            maxLength={128}
            autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
            placeholder="Al menos 8 caracteres"
          />
        </label>
      )}
      {mode === 'signin' && (
        <div className="text-right text-xs mb-5">
          <Link className="text-primary" href="/recuperar">
            Olvidé mi contraseña
          </Link>
        </div>
      )}
      {state.error && (
        <p role="alert" className="notice error-notice">
          {state.error}
        </p>
      )}
      {state.success && (
        <p role="status" className="notice">
          {state.success}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending
          ? 'Un momento…'
          : {
              signin: 'Ingresar a mi aula',
              signup: 'Crear mi cuenta',
              recover: 'Enviar enlace de recuperación',
              update: 'Guardar nueva contraseña',
            }[mode]}
      </button>
    </form>
  );
}

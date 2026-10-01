'use client';
import { useActionState } from 'react';
import { updateProfile } from '@/app/mi-aula/perfil/actions';
export function ProfileForm({ name, email }: { name: string; email: string }) {
  const [state, action, pending] = useActionState(updateProfile, {});
  return (
    <form action={action}>
      <label className="field">
        Nombre completo
        <input
          name="full_name"
          defaultValue={name}
          required
          minLength={2}
          maxLength={160}
          autoComplete="name"
        />
      </label>
      <label className="field">
        Correo electrónico
        <input type="email" value={email} readOnly />
      </label>
      <p className="text-xs mb-5">El correo identifica tu cuenta y tus compras.</p>
      {state.error && (
        <p className="notice error-notice" role="alert">
          {state.error}
        </p>
      )}
      {state.success && (
        <p className="notice" role="status">
          {state.success}
        </p>
      )}
      <button className="button" disabled={pending}>
        {pending ? 'Guardando…' : 'Guardar cambios'}
      </button>
    </form>
  );
}

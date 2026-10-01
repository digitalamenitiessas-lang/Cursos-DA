import Link from 'next/link';
import { Brand } from './brand';
import { AuthForm } from './auth-form';
export function AuthPage({
  mode,
  next,
  message,
}: {
  mode: 'signin' | 'signup' | 'recover' | 'update';
  next?: string;
  message?: string;
}) {
  const copy = {
    signin: [
      'QUÉ BUENO VERTE',
      'Tu próximo paso te espera.',
      'Ingresá para continuar donde dejaste.',
    ],
    signup: [
      'HAY MUCHO POR DESCUBRIR',
      'Empezá tu nuevo camino.',
      'Creá tu cuenta y encontrá tu próximo desafío.',
    ],
    recover: [
      'VOLVAMOS A EMPEZAR',
      'Recuperá tu acceso.',
      'Te vamos a enviar un enlace a tu correo.',
    ],
    update: [
      'TU CUENTA, SEGURA',
      'Elegí una nueva contraseña.',
      'Usá al menos 8 caracteres para proteger tu cuenta.',
    ],
  }[mode];
  return (
    <div className="auth-shell">
      <header className="auth-header container-wide">
        <Brand />
      </header>
      <main id="contenido" className="auth-panel">
        <span className="eyebrow">{copy[0]}</span>
        <h1>{copy[1]}</h1>
        <p>{copy[2]}</p>
        {message && (
          <p className="notice" role="status">
            {message}
          </p>
        )}
        <AuthForm mode={mode} next={next} />
        <div className="auth-links">
          {mode === 'signin' ? (
            <>
              ¿Todavía no tenés cuenta? <Link href="/registro">Registrate</Link>
            </>
          ) : (
            <Link href="/ingresar">Volver a ingresar</Link>
          )}
        </div>
      </main>
    </div>
  );
}

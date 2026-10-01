import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
export async function GET(request: Request) {
  const url = new URL(request.url),
    token_hash = url.searchParams.get('token_hash'),
    type = url.searchParams.get('type');
  if (token_hash && (type === 'email' || type === 'recovery' || type === 'signup')) {
    const db = await createClient();
    const { error } = await db.auth.verifyOtp({ token_hash, type });
    if (!error)
      return NextResponse.redirect(
        new URL(type === 'recovery' ? '/actualizar-clave' : '/mi-aula', appUrl()),
      );
  }
  return NextResponse.redirect(
    new URL('/ingresar?message=El+enlace+venció+o+no+es+válido.', appUrl()),
  );
}

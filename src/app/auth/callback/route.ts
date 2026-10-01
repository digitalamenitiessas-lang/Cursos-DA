import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { appUrl } from '@/lib/env';
import { safeNext } from '@/lib/auth-validation';
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  if (code) {
    const db = await createClient();
    const { error } = await db.auth.exchangeCodeForSession(code);
    if (!error)
      return NextResponse.redirect(new URL(safeNext(url.searchParams.get('next')), appUrl()));
  }
  return NextResponse.redirect(
    new URL('/ingresar?message=El+enlace+venció+o+no+es+válido.+Intentá+nuevamente.', appUrl()),
  );
}

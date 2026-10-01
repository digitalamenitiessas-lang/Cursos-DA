import 'server-only';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { requiredEnv } from '@/lib/env';
export async function createClient() {
 const jar = await cookies();
 return createServerClient(requiredEnv('NEXT_PUBLIC_SUPABASE_URL'), requiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'), { cookies: { getAll: () => jar.getAll(), setAll: values => { try { values.forEach(({name,value,options}) => jar.set(name,value,options)); } catch { /* Proxy refreshes cookies for server components. */ } } } });
}

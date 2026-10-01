export const isSupabaseConfigured = () =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);
export const isDemo = () =>
  process.env.NODE_ENV !== 'production' &&
  process.env.DEMO_MODE === 'true' &&
  !isSupabaseConfigured();
export function appUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
}
export function requiredEnv(key: string) {
  const value = process.env[key];
  if (!value) throw new Error(`Falta configurar ${key}.`);
  return value;
}

import { AuthPage } from '@/components/auth-page';
import { safeNext } from '@/lib/auth-validation';
export const metadata = { title: 'Ingresar' };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; message?: string }>;
}) {
  const p = await searchParams;
  return <AuthPage mode="signin" next={safeNext(p.next)} message={p.message?.slice(0, 250)} />;
}

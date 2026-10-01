import Link from 'next/link';
import { requirePageUser } from '@/lib/auth';
import { ProfileForm } from '@/components/profile-form';
export const metadata = { title: 'Mi perfil' };
export default async function Profile({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const { user, supabase } = await requirePageUser();
  const { data } = await supabase
    .from('profiles')
    .select('full_name,email')
    .eq('id', user.id)
    .single();
  const { message } = await searchParams;
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU CUENTA</span>
        <h1>Mi perfil</h1>
        <p>Mantené tus datos al día.</p>
      </div>
      <section className="panel max-w-xl">
        {message && (
          <p className="notice" role="status">
            {message.slice(0, 200)}
          </p>
        )}
        <ProfileForm name={data?.full_name || ''} email={user.email || ''} />
        <div className="border-t border-border mt-7 pt-6">
          <h2 className="text-lg mb-2">Contraseña</h2>
          <p className="text-sm mb-4">Podés solicitar un enlace seguro para cambiarla.</p>
          <Link href="/recuperar" className="button-secondary">
            Cambiar contraseña
          </Link>
        </div>
      </section>
    </>
  );
}

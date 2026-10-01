import { AuthPage } from '@/components/auth-page';
export const metadata = { title: 'Recuperar contraseña' };
export default function Page() {
  return <AuthPage mode="recover" />;
}

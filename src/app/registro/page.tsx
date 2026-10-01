import { AuthPage } from '@/components/auth-page';
export const metadata = { title: 'Crear cuenta' };
export default function Page() {
  return <AuthPage mode="signup" />;
}

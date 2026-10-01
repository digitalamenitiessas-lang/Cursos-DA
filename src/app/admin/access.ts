import 'server-only';
import { redirect } from 'next/navigation';
import { requireAdmin } from '@/lib/auth';
import { HttpError } from '@/lib/http';
export async function requireAdminPage() {
  try {
    return await requireAdmin();
  } catch (error) {
    if (error instanceof HttpError) {
      if (error.status === 401) redirect('/ingresar?next=%2Fadmin');
      if (error.status === 403) redirect('/?message=No+tenés+permisos+de+administración');
      if (error.status === 503)
        redirect('/ingresar?message=La+academia+todavía+está+en+configuración');
    }
    throw error;
  }
}

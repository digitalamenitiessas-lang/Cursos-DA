export const dynamic = 'force-dynamic';
import '@/components/admin/admin.css';
import { requireAdminPage } from '@/app/admin/access';
import { AdminWorkspace } from '@/components/admin/workspace';
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireAdminPage();
  const name =
    typeof user.user_metadata.full_name === 'string' ? user.user_metadata.full_name : 'Equipo DA';
  return <AdminWorkspace name={name}>{children}</AdminWorkspace>;
}

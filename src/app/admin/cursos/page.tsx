import Link from 'next/link';
import { Plus, ArrowUpRight, BookOpen } from 'lucide-react';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';
import { formatMoney } from '@/lib/utils';
import { AdminNotice } from '@/components/admin/notice';
const labels: Record<string, string> = {
  draft: 'Borrador',
  published: 'Publicado',
  archived: 'Archivado',
};
export default async function AdminCourses({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; status?: string; page?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
  const pageSize = 30;
  let request = supabase
    .from('courses')
    .select('id,title,subtitle,category,price_cents,status,cover_url', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (query.status && ['draft', 'published', 'archived'].includes(query.status))
    request = request.eq('status', query.status);
  const { data: courses, error, count } = await request;
  if (error) throw new Error('No se pudieron consultar los cursos');
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-heading">Tus cursos</h1>
          <p className="muted mt-2">Ideas que se convierten en nuevos caminos.</p>
        </div>
        <Link href="/admin/cursos/nuevo" className="button">
          <Plus size={18} />
          Crear curso
        </Link>
      </div>
      <AdminNotice error={query.error} success={query.success} />
      <form className="flex items-end gap-3">
        <label className="field">
          <span className="field-label">Estado</span>
          <select className="input" name="status" defaultValue={query.status || ''}>
            <option value="">Todos los cursos</option>
            {Object.entries(labels).map(([key, label]) => (
              <option value={key} key={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <button className="button-secondary">Filtrar</button>
      </form>
      {!courses?.length ? (
        <div className="empty-state panel p-12">
          <BookOpen className="mx-auto mb-4 text-violet-300" size={32} />
          <h2 className="text-lg font-semibold">El próximo curso empieza acá</h2>
          <p className="muted mt-2">
            Creá tu primer borrador para organizar módulos, clases y materiales.
          </p>
          <Link href="/admin/cursos/nuevo" className="button mt-5">
            Crear un curso
          </Link>
        </div>
      ) : (
        <div className="table-wrap panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Curso</th>
                <th>Estado</th>
                <th>Precio</th>
                <th>
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course.id}>
                  <td>
                    <div className="font-medium text-white">{course.title}</div>
                    <div className="mt-1 text-xs text-slate-400">{course.category}</div>
                  </td>
                  <td>
                    <span
                      className={`badge ${course.status === 'published' ? 'text-cyan-300' : 'text-slate-300'}`}
                    >
                      {labels[course.status]}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{formatMoney(course.price_cents)}</td>
                  <td>
                    <Link
                      href={`/admin/cursos/${course.id}`}
                      className="inline-flex items-center gap-2 text-violet-300 hover:text-violet-100"
                    >
                      Editar
                      <ArrowUpRight size={15} />
                      <span className="sr-only">{course.title}</span>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Paginación de cursos" className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Página {page} · {count || 0} cursos
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/cursos?${new URLSearchParams({ status: query.status || '', page: String(page - 1) })}`}
              className="button-secondary"
            >
              Anterior
            </Link>
          )}
          {page * pageSize < (count || 0) && (
            <Link
              href={`/admin/cursos?${new URLSearchParams({ status: query.status || '', page: String(page + 1) })}`}
              className="button-secondary"
            >
              Siguiente
            </Link>
          )}
        </div>
      </nav>
      <p className="text-sm text-slate-400">
        Al archivar un curso se retira del catálogo. Los alumnos mantienen sus accesos y su
        progreso.
      </p>
    </div>
  );
}

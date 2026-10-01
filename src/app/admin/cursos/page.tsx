import Link from 'next/link';
import { Plus, ArrowUpRight, BookOpen, Layers3, Play } from 'lucide-react';
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
  searchParams: Promise<{
    error?: string;
    success?: string;
    status?: string;
    page?: string;
    q?: string;
  }>;
}) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
  const pageSize = 30;
  let request = supabase
    .from('courses')
    .select(
      'id,title,subtitle,category,price_cents,status,cover_url,modules(count),lessons(count)',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .order('id')
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (query.status && ['draft', 'published', 'archived'].includes(query.status))
    request = request.eq('status', query.status);
  const search = (typeof query.q === 'string' ? query.q : '').trim().slice(0, 180);
  if (search) request = request.ilike('title', `%${search.replace(/[\\%_]/g, '\\$&')}%`);
  const { data: courses, error, count } = await request;
  if (error) throw new Error('No se pudieron consultar los cursos');
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="page-heading">Tus cursos</h1>
          <p className="muted mt-2">
            Creá, organizá y publicá. Cada curso tiene su propio recorrido.
          </p>
        </div>
        <Link href="/admin/cursos/nuevo" className="button">
          <Plus size={18} />
          Crear curso
        </Link>
      </div>
      <AdminNotice error={query.error} success={query.success} />
      <form className="studio-search-form">
        <label className="field">
          <span className="field-label">Buscar un curso</span>
          <input
            className="input"
            name="q"
            defaultValue={search}
            placeholder="Nombre del curso"
            maxLength={180}
          />
        </label>
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
        <div className="studio-empty panel">
          <BookOpen size={38} strokeWidth={1} />
          <h2>
            {search || query.status
              ? 'No encontramos cursos con esos filtros'
              : 'Todo empieza con una idea.'}
          </h2>
          <p className="muted">
            {search || query.status
              ? 'Probá con otro nombre o revisá todos tus cursos.'
              : 'Creá tu primer borrador. Después dale forma con módulos, clases y materiales.'}
          </p>
          <Link
            href={search || query.status ? '/admin/cursos' : '/admin/cursos/nuevo'}
            className="button"
          >
            {search || query.status ? 'Ver todos los cursos' : 'Crear mi primer curso'}
            <ArrowUpRight size={15} />
          </Link>
        </div>
      ) : (
        <div className="studio-course-grid">
          {courses.map((course) => (
            <article className="studio-course-card" key={course.id}>
              <div className="studio-course-art">
                {course.cover_url ? (
                  <img src={course.cover_url} alt="" />
                ) : (
                  <BookOpen size={44} strokeWidth={1} />
                )}
                <span className="badge">{labels[course.status]}</span>
              </div>
              <div className="studio-course-body">
                <p>{course.category}</p>
                <h2>
                  <Link href={`/admin/cursos/${course.id}`}>{course.title}</Link>
                </h2>
                <div className="studio-course-meta">
                  <span>
                    <Layers3 size={12} className="inline mr-1" />
                    {course.modules?.[0]?.count || 0} módulos
                  </span>
                  <span>
                    <Play size={12} className="inline mr-1" />
                    {course.lessons?.[0]?.count || 0} clases
                  </span>
                </div>
                <div className="studio-course-bottom">
                  <span>{formatMoney(course.price_cents)}</span>
                  <Link href={`/admin/cursos/${course.id}`}>
                    Editar curso <ArrowUpRight size={15} />
                    <span className="sr-only">{course.title}</span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
      <nav aria-label="Paginación de cursos" className="flex items-center justify-between">
        <span className="text-sm text-slate-500">
          Página {page} · {count || 0} cursos
        </span>
        <div className="flex gap-2">
          {page > 1 && (
            <Link
              href={`/admin/cursos?${new URLSearchParams({ status: query.status || '', q: search, page: String(page - 1) })}`}
              className="button-secondary"
            >
              Anterior
            </Link>
          )}
          {page * pageSize < (count || 0) && (
            <Link
              href={`/admin/cursos?${new URLSearchParams({ status: query.status || '', q: search, page: String(page + 1) })}`}
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

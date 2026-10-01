import Link from 'next/link';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';
import { grantAccess, revokeAccess } from '../actions';
import { AdminNotice } from '@/components/admin/notice';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import { adminDate, allAdminRows } from '../data';
type Profile = { id: string; full_name: string; email: string; created_at: string };
type Grant = {
  id: string;
  user_id: string;
  course_id: string;
  source: string;
  status: string;
  reason: string;
  created_at: string;
  revoked_at: string | null;
};
export default async function Students({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; error?: string; success?: string }>;
}) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
  const search = (query.q || '').trim().slice(0, 160);
  const pageSize = 30;
  let request = supabase
    .from('profiles')
    .select('id,full_name,email,created_at,user_roles!inner(role)', { count: 'exact' })
    .eq('user_roles.role', 'student')
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (search) request = request.ilike('email', `%${search.replace(/[%_]/g, '\\$&')}%`);
  const [{ data: profiles, count, error }, courses, { data: audit, error: auditError }] =
    await Promise.all([
      request,
      allAdminRows<{ id: string; title: string; status: string }>('courses', 'id,title,status'),
      supabase
        .from('audit_logs')
        .select('id,actor_id,action,entity_id,details,created_at')
        .in('action', [
          'access.manual.granted',
          'access.manual.revoked',
          'manual_access_granted',
          'manual_access_revoked',
        ])
        .order('created_at', { ascending: false })
        .limit(20),
    ]);
  if (error || auditError) throw new Error('No se pudieron consultar alumnos y auditoría');
  const students = (profiles || []) as Profile[];
  let grants: Grant[] = [];
  if (students.length)
    grants = await allAdminRows<Grant>(
      'access_grants',
      'id,user_id,course_id,source,status,reason,created_at,revoked_at',
      { user_id: students.map((student) => student.id) },
    );
  const pageHref = (next: number) =>
    `/admin/alumnos?${new URLSearchParams({ q: search, page: String(next) })}`;
  return (
    <div className="space-y-7">
      <div>
        <h1 className="page-heading">Personas que aprenden</h1>
        <p className="muted mt-2">Consultá alumnos y administrá permisos con trazabilidad.</p>
      </div>
      <AdminNotice error={query.error} success={query.success} />
      <form className="flex flex-wrap items-end gap-3">
        <label className="field min-w-60 flex-1">
          <span className="field-label">Buscar por correo electrónico</span>
          <input className="input" name="q" defaultValue={search} placeholder="alumno@correo.com" />
        </label>
        <button className="button-secondary">Buscar</button>
        {search && (
          <Link href="/admin/alumnos" className="button-secondary">
            Limpiar
          </Link>
        )}
      </form>
      <section className="panel p-6">
        <h2 className="section-heading">Otorgar un acceso manual</h2>
        <p className="mb-5 mt-2 text-sm text-slate-400">
          Para becas, cortesías o resoluciones de soporte. Se registra el motivo y no cuenta como
          venta.
        </p>
        <form action={grantAccess} className="grid items-end gap-4 md:grid-cols-2">
          <label className="field">
            <span className="field-label">Alumno</span>
            <select className="input" name="user_id" required defaultValue="">
              <option value="" disabled>
                Seleccionar alumno
              </option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.full_name || student.email} · {student.email}
                </option>
              ))}
            </select>
            <span className="text-xs text-slate-500">
              Usá el buscador para encontrar alumnos de otra página.
            </span>
          </label>
          <label className="field">
            <span className="field-label">Curso</span>
            <select className="input" name="course_id" required defaultValue="">
              <option value="" disabled>
                Seleccionar curso
              </option>
              {courses
                .filter((course) => course.status !== 'draft')
                .map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                    {course.status !== 'published'
                      ? ` (${course.status === 'draft' ? 'borrador' : 'archivado'})`
                      : ''}
                  </option>
                ))}
            </select>
          </label>
          <label className="field md:col-span-2">
            <span className="field-label">Motivo del acceso</span>
            <input
              className="input"
              name="reason"
              required
              minLength={5}
              maxLength={1000}
              placeholder="Ejemplo: beca otorgada por la academia"
            />
          </label>
          <div>
            <ConfirmSubmit className="button">Otorgar acceso</ConfirmSubmit>
          </div>
        </form>
      </section>
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="section-heading">Alumnos</h2>
          <span className="text-sm text-slate-500">{count || 0} resultados</span>
        </div>
        {!students.length ? (
          <div className="panel p-8 text-center text-slate-400">
            No hay alumnos que coincidan con la búsqueda.
          </div>
        ) : (
          students.map((student) => {
            const accesses = grants.filter((grant) => grant.user_id === student.id);
            return (
              <article key={student.id} className="panel p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{student.full_name || 'Sin nombre'}</h3>
                    <p className="mt-1 text-sm text-slate-400">{student.email}</p>
                  </div>
                  <p className="text-xs text-slate-500">
                    Registro: {adminDate(student.created_at)}
                  </p>
                </div>
                <details className="mt-4">
                  <summary className="cursor-pointer text-sm text-violet-300">
                    Ver permisos ({accesses.length})
                  </summary>
                  <div className="mt-4 space-y-3">
                    {!accesses.length && (
                      <p className="text-sm text-slate-500">Todavía no tiene accesos otorgados.</p>
                    )}
                    {accesses.map((grant) => (
                      <div key={grant.id} className="rounded-xl border border-white/10 p-4">
                        <div className="flex flex-wrap justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium">
                              {courses.find((course) => course.id === grant.course_id)?.title ||
                                'Curso'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {grant.source === 'manual' ? 'Manual' : 'Originado por pago'} ·{' '}
                              {adminDate(grant.created_at)}
                            </p>
                          </div>
                          <span
                            className={`badge h-fit ${grant.status === 'active' ? 'text-cyan-300' : 'text-slate-400'}`}
                          >
                            {grant.status === 'active' ? 'Activo' : 'Revocado'}
                          </span>
                        </div>
                        <p className="mt-3 text-xs text-slate-400">Motivo: {grant.reason}</p>
                        {grant.source === 'manual' && grant.status === 'active' && (
                          <form
                            action={revokeAccess}
                            className="mt-4 flex flex-wrap items-end gap-3"
                          >
                            <input type="hidden" name="grant_id" value={grant.id} />
                            <label className="field min-w-48 flex-1">
                              <span className="field-label">Motivo de revocación</span>
                              <input
                                className="input"
                                name="reason"
                                required
                                minLength={5}
                                maxLength={1000}
                                placeholder="Describí por qué se revoca"
                              />
                            </label>
                            <ConfirmSubmit
                              message={`¿Revocar el acceso manual de ${student.email}? Si tiene otro permiso válido, conservará el acceso.`}
                            >
                              Revocar acceso manual
                            </ConfirmSubmit>
                          </form>
                        )}
                        {grant.source === 'payment' && (
                          <p className="mt-3 text-xs text-slate-500">
                            El permiso refleja el estado verificado del pago. Los reembolsos se
                            realizan desde Mercado Pago.
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              </article>
            );
          })
        )}
        <nav aria-label="Paginación de alumnos" className="flex items-center justify-between">
          <span className="text-sm text-slate-500">Página {page}</span>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={pageHref(page - 1)} className="button-secondary">
                Anterior
              </Link>
            )}
            {page * pageSize < (count || 0) && (
              <Link href={pageHref(page + 1)} className="button-secondary">
                Siguiente
              </Link>
            )}
          </div>
        </nav>
      </section>
      <section className="panel p-6">
        <h2 className="section-heading">Últimos movimientos de acceso</h2>
        <p className="muted mb-4 mt-2 text-sm">
          Registro de auditoría de las últimas 20 operaciones manuales.
        </p>
        {!audit?.length ? (
          <p className="text-sm text-slate-500">
            Las altas y revocaciones manuales se van a registrar acá.
          </p>
        ) : (
          <div className="space-y-3">
            {audit.map((entry) => (
              <div key={entry.id} className="border-b border-white/5 pb-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="text-slate-200">
                    {entry.action.includes('revok')
                      ? 'Acceso manual revocado'
                      : 'Acceso manual otorgado'}
                  </span>
                  <span className="text-xs text-slate-500">{adminDate(entry.created_at)}</span>
                </div>
                <p className="mt-1 text-xs text-slate-400">
                  {typeof entry.details?.reason === 'string'
                    ? entry.details.reason
                    : 'Operación registrada'}
                </p>
                <p className="mt-1 break-all text-[11px] text-slate-600">
                  Administrador: {entry.actor_id} · Permiso: {entry.entity_id}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

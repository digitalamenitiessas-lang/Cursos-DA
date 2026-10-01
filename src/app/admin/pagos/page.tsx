import Link from 'next/link';
import { z } from 'zod';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';
import { formatMoney } from '@/lib/utils';
import { ReconcileButton } from '@/components/admin/reconcile-button';
import { adminDate, allAdminRows, paymentStatuses } from '../data';
type Payment = {
  id: string;
  provider_payment_id: string;
  status: string;
  amount_cents: number;
  refunded_cents: number;
  created_at: string;
  approved_at: string | null;
  orders: {
    id: string;
    course_id: string;
    user_id: string;
    profiles: { full_name: string; email: string };
    courses: { title: string };
  };
};
export default async function Payments({
  searchParams,
}: {
  searchParams: Promise<{
    from?: string;
    to?: string;
    course?: string;
    student?: string;
    status?: string;
    page?: string;
  }>;
}) {
  const { supabase } = await requireAdmin();
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, Math.floor(Number(query.page) || 1)));
  const pageSize = 40;
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const start =
    query.from && datePattern.test(query.from) ? new Date(`${query.from}T00:00:00-03:00`) : null;
  const end =
    query.to && datePattern.test(query.to) ? new Date(`${query.to}T23:59:59.999-03:00`) : null;
  let request = supabase
    .from('payments')
    .select(
      'id,provider_payment_id,status,amount_cents,refunded_cents,created_at,approved_at,orders!inner(id,course_id,user_id,profiles!inner(full_name,email),courses!inner(title))',
      { count: 'exact' },
    )
    .order('created_at', { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (start && !Number.isNaN(start.getTime()))
    request = request.gte('created_at', start.toISOString());
  if (end && !Number.isNaN(end.getTime())) request = request.lte('created_at', end.toISOString());
  if (query.course && z.string().uuid().safeParse(query.course).success)
    request = request.eq('orders.course_id', query.course);
  if (query.status && query.status in paymentStatuses) request = request.eq('status', query.status);
  if (query.student)
    request = request.ilike(
      'orders.profiles.email',
      `%${query.student.trim().slice(0, 160).replace(/[%_]/g, '\\$&')}%`,
    );
  const [{ data, count, error }, courses] = await Promise.all([
    request,
    allAdminRows<{ id: string; title: string }>('courses', 'id,title'),
  ]);
  if (error) throw new Error('No se pudieron consultar los pagos');
  const payments = (data || []) as unknown as Payment[];
  const pageHref = (next: number) => {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries({ ...query, page: String(next) })) {
      if (value) params.set(key, value);
    }
    return `/admin/pagos?${params}`;
  };
  return (
    <div className="space-y-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="page-heading">Pagos, con claridad.</h1>
          <p className="muted mt-2">
            Estados verificados con Mercado Pago. Importes expresados en pesos argentinos.
          </p>
        </div>
        <ReconcileButton />
      </div>
      <form className="panel grid items-end gap-4 p-5 md:grid-cols-3 lg:grid-cols-6">
        <label className="field">
          <span className="field-label">Desde</span>
          <input type="date" className="input" name="from" defaultValue={query.from} />
        </label>
        <label className="field">
          <span className="field-label">Hasta</span>
          <input type="date" className="input" name="to" defaultValue={query.to} />
        </label>
        <label className="field">
          <span className="field-label">Curso</span>
          <select className="input" name="course" defaultValue={query.course || ''}>
            <option value="">Todos</option>
            {courses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span className="field-label">Correo del alumno</span>
          <input
            className="input"
            name="student"
            defaultValue={query.student}
            placeholder="Buscar correo"
          />
        </label>
        <label className="field">
          <span className="field-label">Estado</span>
          <select name="status" className="input" defaultValue={query.status || ''}>
            <option value="">Todos</option>
            {Object.entries(paymentStatuses).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className="button">Filtrar</button>
          <Link className="button-secondary" href="/admin/pagos" aria-label="Limpiar filtros">
            ×
          </Link>
        </div>
      </form>
      <div className="flex flex-wrap justify-between gap-2 text-xs text-slate-500">
        <span>{count || 0} pagos coinciden</span>
        <span>Filtro de fecha: recepción del pago en la plataforma · hora de Argentina</span>
      </div>
      {!payments.length ? (
        <div className="panel p-12 text-center">
          <h2 className="text-lg font-medium">Todavía no hay pagos en esta vista</h2>
          <p className="muted mt-2">
            Los pagos aparecen después de verificarse con el proveedor. Probá ajustar los filtros.
          </p>
        </div>
      ) : (
        <div className="table-wrap panel">
          <table className="data-table">
            <thead>
              <tr>
                <th>Fecha / ID de pago</th>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Estado</th>
                <th>Importe original</th>
                <th>Reembolso</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="whitespace-nowrap">
                    <div>{adminDate(payment.created_at)}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      MP #{payment.provider_payment_id}
                    </div>
                  </td>
                  <td>
                    <div className="text-slate-200">
                      {payment.orders.profiles.full_name || 'Alumno'}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {payment.orders.profiles.email}
                    </div>
                  </td>
                  <td>
                    <Link
                      className="hover:text-violet-300"
                      href={`/admin/cursos/${payment.orders.course_id}`}
                    >
                      {payment.orders.courses.title}
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`badge whitespace-nowrap ${payment.status === 'approved' ? 'text-cyan-300' : payment.status === 'partial_refund' || payment.status === 'charged_back' ? 'text-amber-200' : 'text-slate-300'}`}
                    >
                      {paymentStatuses[payment.status] || payment.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap">{formatMoney(payment.amount_cents)}</td>
                  <td className="whitespace-nowrap">
                    {payment.refunded_cents ? formatMoney(payment.refunded_cents) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <nav aria-label="Paginación de pagos" className="flex items-center justify-between">
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
      <div className="panel space-y-3 p-5 text-sm leading-relaxed text-slate-400">
        <p>
          Los reembolsos se hacen en Mercado Pago. La conciliación consulta al proveedor y repara
          notificaciones pendientes sin duplicar habilitaciones.
        </p>
        <p>
          Los reembolsos parciales requieren revisión. Se invalida el permiso de ese pago hasta que
          se resuelva; otro acceso independiente sigue siendo válido.
        </p>
        <p>
          Los importes originales no representan ganancias netas. No se muestran comisiones
          estimadas.
        </p>
      </div>
    </div>
  );
}

import Link from 'next/link';
import {
  ArrowUpRight,
  BookOpen,
  GraduationCap,
  Users,
  CreditCard,
  TrendingUp,
  RotateCcw,
} from 'lucide-react';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';
import { formatMoney } from '@/lib/utils';
import { allAdminRows } from './data';

type Payment = {
  id: string;
  order_id: string;
  status: string;
  amount_cents: number;
  refunded_cents: number;
  approved_at: string | null;
};
type Grant = { user_id: string; course_id: string; status: string; source: string };
type Course = { id: string; title: string; status: string };
type Progress = { user_id: string; lesson_id: string; completed: boolean };
export default async function AdminOverview() {
  await requireAdmin();
  const [roles, payments, grants, courses, lessons, progress, orders] = await Promise.all([
    allAdminRows<{ user_id: string; role: string }>('user_roles', 'user_id,role'),
    allAdminRows<Payment>('payments', 'id,order_id,status,amount_cents,refunded_cents,approved_at'),
    allAdminRows<Grant>('access_grants', 'user_id,course_id,status,source'),
    allAdminRows<Course>('courses', 'id,title,status'),
    allAdminRows<{ id: string; course_id: string }>('lessons', 'id,course_id'),
    allAdminRows<Progress>('progress', 'user_id,lesson_id,completed'),
    allAdminRows<{ id: string; course_id: string }>('orders', 'id,course_id'),
  ]);
  const students = new Set(
    roles.filter((role) => role.role === 'student').map((role) => role.user_id),
  );
  const activeGrants = grants.filter(
    (grant) => grant.status === 'active' && students.has(grant.user_id),
  );
  const activeUsers = new Set(activeGrants.map((grant) => grant.user_id)).size;
  const approved = payments.filter((payment) => payment.approved_at !== null);
  const gross = approved.reduce((sum, payment) => sum + payment.amount_cents, 0);
  const refunds = payments.reduce((sum, payment) => sum + payment.refunded_cents, 0);
  const refundCount = payments.filter((payment) => payment.refunded_cents > 0).length;
  const orderCourse = new Map(orders.map((order) => [order.id, order.course_id]));
  const lessonCourse = new Map(lessons.map((lesson) => [lesson.id, lesson.course_id]));
  const enrollmentKeys = new Set(
    activeGrants.map((grant) => `${grant.user_id}:${grant.course_id}`),
  );
  const lessonCounts = new Map<string, number>();
  for (const lesson of lessons)
    lessonCounts.set(lesson.course_id, (lessonCounts.get(lesson.course_id) || 0) + 1);
  const completedCounts = new Map<string, number>();
  for (const row of progress) {
    const courseId = lessonCourse.get(row.lesson_id);
    if (row.completed && courseId) {
      const key = `${row.user_id}:${courseId}`;
      if (enrollmentKeys.has(key)) completedCounts.set(key, (completedCounts.get(key) || 0) + 1);
    }
  }
  let percentageSum = 0;
  let completed = 0;
  let eligible = 0;
  for (const key of enrollmentKeys) {
    const count = lessonCounts.get(key.split(':')[1]) || 0;
    if (!count) continue;
    eligible++;
    const done = completedCounts.get(key) || 0;
    percentageSum += Math.min(done / count, 1);
    if (done >= count) completed++;
  }
  const average = eligible ? Math.round((percentageSum / eligible) * 100) : 0;
  const courseSales = new Map<string, { count: number; gross: number }>();
  for (const payment of approved) {
    const courseId = orderCourse.get(payment.order_id);
    if (!courseId) continue;
    const current = courseSales.get(courseId) || { count: 0, gross: 0 };
    current.count++;
    current.gross += payment.amount_cents;
    courseSales.set(courseId, current);
  }
  const top = [...courseSales.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 5);
  const cards = [
    {
      label: 'Alumnos registrados',
      value: students.size.toLocaleString('es-AR'),
      note: 'Cuentas con rol alumno',
      Icon: Users,
    },
    {
      label: 'Alumnos con acceso',
      value: activeUsers.toLocaleString('es-AR'),
      note: 'Al menos un permiso activo',
      Icon: GraduationCap,
    },
    {
      label: 'Ventas aprobadas históricas',
      value: approved.length.toLocaleString('es-AR'),
      note: 'Pagos que alcanzaron la aprobación',
      Icon: CreditCard,
    },
    {
      label: 'Importe bruto cobrado',
      value: formatMoney(gross),
      note: 'Histórico · antes de reembolsos y comisiones',
      Icon: TrendingUp,
    },
    {
      label: 'Importe reembolsado',
      value: formatMoney(refunds),
      note: `${refundCount} pagos con reembolso informado`,
      Icon: RotateCcw,
    },
    {
      label: 'Progreso promedio',
      value: `${average}%`,
      note: `${completed} de ${eligible} inscripciones finalizaron`,
      Icon: BookOpen,
    },
  ];
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">TU ACADEMIA, EN PERSPECTIVA</p>
          <h1 className="page-heading mt-2">Cada aprendizaje cuenta.</h1>
          <p className="muted mt-3">Actividad acumulada de la academia, con datos reales.</p>
        </div>
        <Link href="/admin/cursos/nuevo" className="button">
          Crear curso <ArrowUpRight size={16} />
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, note, Icon }) => (
          <div className="panel p-6" key={label}>
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-400">{label}</span>
              <span className="rounded-xl bg-violet-500/10 p-2.5 text-violet-300">
                <Icon size={18} />
              </span>
            </div>
            <p className="mt-5 text-3xl font-semibold tracking-tight">{value}</p>
            <p className="mt-2 text-xs leading-relaxed text-slate-500">{note}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
        <section className="panel p-6">
          <div className="mb-6 flex items-center justify-between gap-3">
            <h2 className="section-heading">Los cursos más elegidos</h2>
            <Link href="/admin/pagos" className="text-sm text-violet-300">
              Ver pagos ↗
            </Link>
          </div>
          {!top.length ? (
            <div className="py-10 text-center">
              <p className="text-slate-300">Las primeras ventas van a aparecer acá.</p>
              <p className="mt-2 text-sm text-slate-500">
                Los accesos manuales gratuitos se excluyen de las ventas.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {top.map(([id, stats], index) => (
                <div className="flex items-center gap-4" key={id}>
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/5 text-sm text-slate-500">
                    0{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <Link
                      className="text-sm font-medium hover:text-violet-300"
                      href={`/admin/cursos/${id}`}
                    >
                      {courses.find((course) => course.id === id)?.title || 'Curso'}
                    </Link>
                    <p className="mt-1 text-xs text-slate-500">
                      {stats.count} ventas aprobadas históricas
                    </p>
                  </div>
                  <span className="text-sm text-cyan-200">{formatMoney(stats.gross)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
        <section className="panel space-y-5 p-6">
          <h2 className="section-heading">Aprendizaje en movimiento</h2>
          <div>
            <div className="mb-3 flex justify-between text-sm">
              <span className="text-slate-400">Finalización de cursos</span>
              <span>{eligible ? Math.round((completed / eligible) * 100) : 0}%</span>
            </div>
            <progress
              value={completed}
              max={eligible || 1}
              className="h-2 w-full accent-cyan-400"
              aria-label="Finalización de cursos"
            />
          </div>
          <p className="text-sm leading-relaxed text-slate-400">
            {completed} inscripciones con todas las clases completadas. Se consideran accesos
            activos a cursos que tienen al menos una clase.
          </p>
          <div className="grid grid-cols-2 gap-3 border-t border-white/10 pt-5">
            <div>
              <p className="text-2xl font-semibold">
                {courses.filter((course) => course.status === 'published').length}
              </p>
              <p className="mt-1 text-xs text-slate-500">Cursos publicados</p>
            </div>
            <div>
              <p className="text-2xl font-semibold">
                {
                  new Set(
                    activeGrants
                      .filter((grant) => grant.source === 'manual')
                      .map((grant) => `${grant.user_id}:${grant.course_id}`),
                  ).size
                }
              </p>
              <p className="mt-1 text-xs text-slate-500">Accesos manuales activos</p>
            </div>
          </div>
        </section>
      </div>
      <details className="panel p-6">
        <summary className="cursor-pointer text-sm font-medium">
          Cómo calculamos estas métricas
        </summary>
        <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-400">
          <p>
            <strong className="text-slate-200">Alumnos:</strong> cuentas con rol alumno, sin
            administradores. Los alumnos activos tienen al menos un permiso activo; cada persona
            cuenta una vez.
          </p>
          <p>
            <strong className="text-slate-200">Ventas y bruto:</strong> cada ID único de pago que
            tuvo fecha de aprobación cuenta una vez. El bruto suma sus importes originales,
            incluidos pagos posteriormente reembolsados o con contracargo. Los accesos manuales no
            cuentan como ventas.
          </p>
          <p>
            <strong className="text-slate-200">Reembolsos:</strong> suma del importe reembolsado
            informado por Mercado Pago en cada pago, también los parciales. Los contracargos se
            identifican en Pagos. No se calculan ganancias netas ni comisiones sin datos confiables
            del proveedor.
          </p>
          <p>
            <strong className="text-slate-200">Progreso:</strong> promedio del porcentaje de clases
            completadas por cada combinación única alumno–curso con acceso activo y al menos una
            clase. Incluye quienes todavía no comenzaron. Finalización requiere completar todas las
            clases actuales.
          </p>
          <p>
            <strong className="text-slate-200">Más vendidos:</strong> cursos ordenados por cantidad
            histórica de pagos aprobados, sin duplicar notificaciones. Todas las métricas son
            acumuladas y reflejan los estados verificados disponibles.
          </p>
        </div>
      </details>
    </div>
  );
}

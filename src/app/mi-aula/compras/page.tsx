import Link from 'next/link';
import { CreditCard } from 'lucide-react';
import { requirePageUser } from '@/lib/auth';
import { formatMoney } from '@/lib/utils';
import { paymentLabels } from '@/lib/payment-labels';
export const metadata = { title: 'Mis compras' };
export default async function Purchases({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const p = await searchParams;
  const page = Math.max(1, Math.min(10000, Number(p.page) || 1));
  const { user, supabase } = await requirePageUser();
  const {
    data: orders,
    error,
    count,
  } = await supabase
    .from('orders')
    .select('id,course_id,amount_cents,currency,status,created_at,courses(title)', {
      count: 'exact',
    })
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .range((page - 1) * 20, page * 20 - 1);
  if (error) throw new Error('No se pudo cargar el historial.');
  return (
    <>
      <div className="page-heading">
        <span className="eyebrow">TU HISTORIAL</span>
        <h1>Mis compras</h1>
        <p>Consultá el estado de tus pagos y accesos.</p>
      </div>
      {orders?.length ? (
        <>
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Curso</th>
                  <th>Fecha</th>
                  <th>Importe</th>
                  <th>Estado</th>
                  <th>
                    <span className="sr-only">Detalle</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {orders.map((o) => (
                  <tr key={o.id}>
                    <td>{(o.courses as unknown as { title: string })?.title ?? 'Curso'}</td>
                    <td>
                      {new Date(o.created_at).toLocaleDateString('es-AR', {
                        timeZone: 'America/Argentina/Tucuman',
                      })}
                    </td>
                    <td className="whitespace-nowrap">{formatMoney(o.amount_cents)}</td>
                    <td>
                      <span className="badge">{paymentLabels[o.status] || o.status}</span>
                    </td>
                    <td>
                      <Link
                        href={`/pago/resultado?order=${o.id}`}
                        className="text-primary whitespace-nowrap"
                      >
                        Ver estado
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <nav className="flex gap-4 mt-5" aria-label="Páginas de compras">
            {page > 1 && (
              <Link className="button-secondary" href={`/mi-aula/compras?page=${page - 1}`}>
                Anterior
              </Link>
            )}
            {(count || 0) > page * 20 && (
              <Link className="button-secondary" href={`/mi-aula/compras?page=${page + 1}`}>
                Siguiente
              </Link>
            )}
          </nav>
        </>
      ) : (
        <div className="empty-state">
          <CreditCard size={30} />
          <h2>Todavía no hiciste una compra.</h2>
          <p>
            Tus pagos aparecerán acá. Los accesos otorgados por la academia están en Mis cursos.
          </p>
          <Link className="button" href="/cursos">
            Explorar cursos
          </Link>
        </div>
      )}
    </>
  );
}

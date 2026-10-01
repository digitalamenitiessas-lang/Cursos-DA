import { redirect } from 'next/navigation';
import { z } from 'zod';
import { SiteHeader } from '@/components/site-header';
import { PaymentStatus } from '@/components/payment-status';
import { requirePageUser } from '@/lib/auth';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Estado de tu compra' };
export default async function Result({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  await requirePageUser();
  const { order } = await searchParams;
  if (!z.uuid().safeParse(order).success) redirect('/mi-aula/compras');
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide">
        <PaymentStatus orderId={order!} />
      </main>
    </>
  );
}

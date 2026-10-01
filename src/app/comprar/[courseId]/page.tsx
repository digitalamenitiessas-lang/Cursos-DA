import { notFound } from 'next/navigation';
import { requirePageUser } from '@/lib/auth';
import { SiteHeader } from '@/components/site-header';
import { CheckoutButton } from '@/components/checkout-button';
import { formatMoney } from '@/lib/utils';
export default async function Buy({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  const { supabase } = await requirePageUser();
  const { data: course } = await supabase
    .from('courses')
    .select('id,title,price_cents,status')
    .eq('id', courseId)
    .eq('status', 'published')
    .maybeSingle();
  if (!course) notFound();
  const { data: access } = await supabase.rpc('has_course_access', { p_course_id: courseId });
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="container-wide section-space">
        <section className="panel max-w-xl mx-auto">
          <span className="eyebrow">TU PRÓXIMO PASO</span>
          <h1 className="text-3xl my-5">{course.title}</h1>
          <p className="text-xl mb-3">{formatMoney(course.price_cents)} ARS</p>
          <p className="mb-6">
            Un pago. Acceso sin vencimiento. Vas a completar la compra en Mercado Pago.
          </p>
          <CheckoutButton courseId={course.id} loggedIn hasAccess={Boolean(access)} />
        </section>
      </main>
    </>
  );
}

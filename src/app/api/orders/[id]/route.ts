import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { apiError, HttpError } from '@/lib/http';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { user, supabase } = await requireUser();
    const id = z
      .string()
      .uuid()
      .parse((await context.params).id);
    const { data: order, error } = await supabase
      .from('orders')
      .select('id,status,amount_cents,currency,course_id,created_at')
      .eq('id', id)
      .eq('user_id', user.id)
      .maybeSingle();
    if (error) throw new Error('order_lookup_failed');
    if (!order) throw new HttpError(404, 'No encontramos esta compra.');
    const { data: access, error: accessError } = await supabase.rpc('has_course_access', {
      p_course_id: order.course_id,
    });
    if (accessError) throw new Error('access_lookup_failed');
    return Response.json(
      { order, hasAccess: Boolean(access) },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

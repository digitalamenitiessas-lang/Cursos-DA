import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { apiError, assertSameOrigin, HttpError } from '@/lib/http';
import { createAdminClient } from '@/lib/supabase/admin';
import {
  createPreference,
  MercadoPagoError,
  paymentAppUrl,
  paymentConfig,
  safeCheckoutUrl,
} from '@/lib/payments/provider';
import { paymentDiagnostic, paymentErrorCode } from '@/lib/payments/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const checkoutSchema = z.object({ courseId: z.string().uuid() }).strict();

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireUser();
    if (!user.email || !user.email_confirmed_at)
      throw new HttpError(403, 'Verificá tu correo antes de comprar.');
    const { courseId } = checkoutSchema.parse(await request.json());
    paymentConfig();
    paymentAppUrl();
    if (!process.env.MP_WEBHOOK_SECRET) throw new MercadoPagoError('webhook_configuration_missing');
    const db = createAdminClient();
    const { data: course, error: courseError } = await db
      .from('courses')
      .select('id,title,status')
      .eq('id', courseId)
      .eq('status', 'published')
      .maybeSingle();
    if (courseError) throw new Error('course_lookup_failed');
    if (!course) throw new HttpError(404, 'Este curso no está disponible para comprar.');
    // Server-only RPC locks user/course and reads the current price directly from the course.
    const { data: order, error: orderError } = await db.rpc('create_checkout_order', {
      p_user_id: user.id,
      p_course_id: courseId,
    });
    if (orderError) {
      if (
        /already_has_access|already has access|access already|already accessible/i.test(
          orderError.message,
        )
      )
        throw new HttpError(409, 'Ya tenés acceso a este curso. Entrá desde Mis cursos.');
      if (orderError.code === 'P0002')
        throw new HttpError(404, 'Este curso no está disponible para comprar.');
      throw new Error('checkout_order_failed');
    }
    if (!order?.id) throw new Error('checkout_order_missing');
    const { data: pendingPayments, error: pendingError } = await db
      .from('payments')
      .select('id')
      .eq('order_id', order.id)
      .in('status', ['pending', 'in_process', 'authorized'])
      .limit(1);
    if (pendingError) throw new Error('pending_payment_lookup_failed');
    if (pendingPayments?.length) {
      return Response.json(
        {
          error: 'Ya tenés un pago en proceso. Revisá su estado antes de volver a pagar.',
          orderId: order.id,
        },
        {
          status: 409,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }
    const attemptId = randomUUID();
    const { data: attempt, error: attemptError } = await db.rpc('reserve_checkout_attempt', {
      p_order_id: order.id,
      p_attempt_id: attemptId,
    });
    if (attemptError) {
      if (
        /already_has_access|already has access|access already|already accessible/i.test(
          attemptError.message,
        )
      )
        throw new HttpError(409, 'Ya tenés acceso a este curso.');
      throw new Error('checkout_attempt_failed');
    }
    if (attempt?.status === 'ready' && attempt.checkout_url) {
      return Response.json(
        { orderId: order.id, checkoutUrl: safeCheckoutUrl(attempt.checkout_url) },
        { headers: { 'Cache-Control': 'no-store' } },
      );
    }
    // Only the request owning the reservation can call the preference API.
    if (!attempt || attempt.id !== attemptId) {
      return Response.json(
        { error: 'Estamos preparando tu pago. Reintentá en unos segundos.' },
        {
          status: 409,
          headers: { 'Retry-After': '5', 'Cache-Control': 'no-store' },
        },
      );
    }
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    try {
      const preference = await createPreference({
        orderId: order.id,
        attemptId,
        courseId,
        title: course.title,
        amountCents: order.amount_cents,
        email: user.email,
        expiresAt,
      });
      const { error: saveError } = await db
        .from('payment_attempts')
        .update({
          preference_id: preference.id,
          checkout_url: preference.checkoutUrl,
          status: 'ready',
          expires_at: expiresAt,
        })
        .eq('id', attemptId)
        .eq('status', 'created');
      if (saveError) throw new Error('preference_save_failed');
      return Response.json(
        { orderId: order.id, checkoutUrl: preference.checkoutUrl },
        {
          status: 201,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    } catch (error) {
      const { error: updateError } = await db
        .from('payment_attempts')
        .update({ status: 'failed' })
        .eq('id', attemptId)
        .eq('status', 'created');
      if (updateError) paymentDiagnostic('attempt_update_failed', { orderId: order.id });
      throw error;
    }
  } catch (error) {
    paymentDiagnostic('checkout_failed', { code: paymentErrorCode(error) });
    if (error instanceof MercadoPagoError)
      return apiError(
        new HttpError(503, 'No pudimos abrir Mercado Pago. Intentá nuevamente en unos minutos.'),
      );
    if (error instanceof SyntaxError)
      return apiError(new HttpError(400, 'Revisá los datos ingresados.'));
    return apiError(error);
  }
}

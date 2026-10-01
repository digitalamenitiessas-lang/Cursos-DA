import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { cfRequest } from '@/lib/media/cloudflare';
import { apiError, HttpError } from '@/lib/http';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    await requireAdmin();
    const { lessonId } = await params;
    z.uuid().parse(lessonId);
    const db = createAdminClient();
    const { data } = await db
      .from('lesson_videos')
      .select('stream_uid')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (!data) throw new HttpError(404, 'Todavía no se cargó un video.');
    const result = await cfRequest(`/${encodeURIComponent(data.stream_uid)}`);
    const status = result.readyToStream
      ? 'ready'
      : result.status?.state === 'error'
        ? 'error'
        : 'processing';
    const duration_seconds = Math.ceil(result.duration || 0);
    const { data: updated, error } = await db
      .from('lesson_videos')
      .update({ status, duration_seconds })
      .eq('lesson_id', lessonId)
      .eq('stream_uid', data.stream_uid)
      .select('lesson_id')
      .maybeSingle();
    if (error) throw error;
    if (!updated)
      throw new HttpError(
        409,
        'El video cambió durante la consulta. Actualizá su estado nuevamente.',
      );
    if (status === 'ready') {
      const { error } = await db.from('lessons').update({ duration_seconds }).eq('id', lessonId);
      if (error) throw error;
    }
    return Response.json(
      { status, duration_seconds },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

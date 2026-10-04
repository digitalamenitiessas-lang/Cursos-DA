import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { cfRequest } from '@/lib/media/cloudflare';
import { apiError, assertSameOrigin, HttpError } from '@/lib/http';
import {
  parseYouTubeVideoId,
  readVideoSource,
  youtubeVideoReference,
} from '@/lib/media/video-source';
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    await requireAdmin();
    const { lessonId } = await params;
    z.uuid().parse(lessonId);
    const db = createAdminClient();
    const { data, error: readError } = await db
      .from('lesson_videos')
      .select('stream_uid')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (readError) throw readError;
    if (!data) throw new HttpError(404, 'Todavía no se cargó un video.');
    const source = readVideoSource(data.stream_uid, lessonId);
    if (source.provider === 'youtube')
      return Response.json(
        { status: 'ready', ...source },
        { headers: { 'Cache-Control': 'private, no-store' } },
      );
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
      { status, duration_seconds, provider: 'cloudflare' },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ lessonId: string }> }) {
  try {
    assertSameOrigin(request);
    const { user } = await requireAdmin();
    const { lessonId } = await params;
    z.uuid().parse(lessonId);
    const { url } = z.object({ url: z.string().min(1).max(2048) }).parse(await request.json());
    const videoId = parseYouTubeVideoId(url);
    if (!videoId) throw new HttpError(400, 'Pegá un enlace válido a un video de YouTube.');
    const db = createAdminClient();
    const { data: lesson, error: lessonError } = await db
      .from('lessons')
      .select('id')
      .eq('id', lessonId)
      .maybeSingle();
    if (lessonError) throw lessonError;
    if (!lesson) throw new HttpError(404, 'Clase no encontrada.');
    const { error } = await db.from('lesson_videos').upsert(
      {
        lesson_id: lessonId,
        stream_uid: youtubeVideoReference(videoId, lessonId),
        status: 'ready',
        duration_seconds: 0,
      },
      { onConflict: 'lesson_id' },
    );
    if (error) throw error;
    await db.from('audit_logs').insert({
      actor_id: user.id,
      action: 'youtube_video_linked',
      entity_type: 'lesson',
      entity_id: lessonId,
      details: { provider: 'youtube' },
    });
    return Response.json(
      { status: 'ready', provider: 'youtube', videoId },
      { headers: { 'Cache-Control': 'private, no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

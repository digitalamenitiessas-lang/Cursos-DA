import { authorizeLesson } from '@/lib/media/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { cfRequest } from '@/lib/media/cloudflare';
import { playbackTtl } from '@/lib/media/security';
import { assertSameOrigin, apiError, HttpError } from '@/lib/http';
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { lessonId } = await params;
    const { lesson } = await authorizeLesson(lessonId, true);
    const db = createAdminClient();
    const { data: video, error } = await db
      .from('lesson_videos')
      .select('stream_uid,status,duration_seconds')
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) throw error;
    if (!video) throw new HttpError(404, 'El video todavía no está disponible.');
    if (video.status !== 'ready')
      return Response.json(
        {
          status: video.status,
          message:
            video.status === 'error'
              ? 'El video está temporalmente no disponible.'
              : 'Estamos preparando esta clase. Volvé a intentarlo en unos minutos.',
        },
        { status: 202, headers: { 'Cache-Control': 'private, no-store' } },
      );
    const expiresAt =
      Math.floor(Date.now() / 1000) +
      playbackTtl(video.duration_seconds || lesson.duration_seconds);
    const result = await cfRequest(`/${encodeURIComponent(video.stream_uid)}/token`, {
      method: 'POST',
      body: JSON.stringify({ exp: expiresAt, downloadable: false }),
    });
    return Response.json(
      { status: 'ready', token: result.token, expiresAt },
      { headers: { 'Cache-Control': 'private, no-store', Vary: 'Cookie' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

import { z } from 'zod';
import { randomUUID } from 'node:crypto';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { assertSameOrigin, apiError, HttpError } from '@/lib/http';
import { createDirectVideoUpload } from '@/lib/media/cloudflare';
import { safeUploadName } from '@/lib/media/security';
import { coverFileError } from '@/lib/media/cover';
const schema = z.object({
  kind: z.enum(['video', 'cover', 'resource']),
  lessonId: z.uuid().optional(),
  courseId: z.uuid().optional(),
  fileName: z.string().min(1).max(240),
  fileSize: z
    .number()
    .int()
    .positive()
    .max(30 * 1024 ** 3),
  contentType: z.string().max(150),
  title: z.string().min(1).max(180).optional(),
});
const resourceMimes = new Set([
  'application/pdf',
  'application/zip',
  'text/plain',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'image/png',
  'image/jpeg',
  'image/webp',
]);
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const { user } = await requireAdmin();
    const body = schema.parse(await request.json());
    const db = createAdminClient();
    if (body.kind === 'cover') {
      if (!body.courseId) throw new HttpError(400, 'Seleccioná un curso.');
      const { data } = await db.from('courses').select('id').eq('id', body.courseId).maybeSingle();
      if (!data) throw new HttpError(404, 'Curso no encontrado.');
      const coverError = coverFileError({
        name: body.fileName,
        type: body.contentType,
        size: body.fileSize,
      });
      if (coverError) throw new HttpError(400, coverError);
    } else {
      if (!body.lessonId) throw new HttpError(400, 'Seleccioná una clase.');
      const { data } = await db.from('lessons').select('id').eq('id', body.lessonId).maybeSingle();
      if (!data) throw new HttpError(404, 'Clase no encontrada.');
    }
    if (body.kind === 'video') {
      if (!body.contentType.startsWith('video/'))
        throw new HttpError(400, 'Seleccioná un archivo de video.');
      const { uploadURL, uid } = await createDirectVideoUpload(body.fileSize, body.fileName);
      const { error } = await db
        .from('lesson_videos')
        .upsert(
          { lesson_id: body.lessonId, stream_uid: uid, status: 'pending', duration_seconds: 0 },
          { onConflict: 'lesson_id' },
        );
      if (error) throw error;
      await db.from('audit_logs').insert({
        actor_id: user.id,
        action: 'video_upload_authorized',
        entity_type: 'lesson',
        entity_id: body.lessonId,
        details: {},
      });
      return Response.json({ uploadURL, uid }, { headers: { 'Cache-Control': 'no-store' } });
    }
    if (
      body.kind === 'resource' &&
      (body.fileSize > 50 * 1024 ** 2 || !resourceMimes.has(body.contentType))
    )
      throw new HttpError(400, 'Formato no admitido o archivo mayor a 50 MB.');
    const bucket = body.kind === 'cover' ? 'course-covers' : 'course-materials';
    const path = `${body.courseId || body.lessonId}/${randomUUID()}.${safeUploadName(body.fileName)}`;
    const { data, error } = await db.storage.from(bucket).createSignedUploadUrl(path);
    if (error || !data) throw new HttpError(502, 'No se pudo autorizar el archivo.');
    return Response.json(
      { bucket, path, token: data.token, signedUrl: data.signedUrl },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return apiError(error);
  }
}

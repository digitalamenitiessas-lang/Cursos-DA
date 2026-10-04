import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, assertSameOrigin, HttpError } from '@/lib/http';
import { revalidatePath } from 'next/cache';
const schema = z.object({
  kind: z.enum(['cover', 'resource']),
  courseId: z.uuid().optional(),
  lessonId: z.uuid().optional(),
  path: z.string().regex(/^[0-9a-f-]{36}\/[0-9a-f-]{36}\.[a-z0-9]{1,8}$/),
  title: z.string().min(1).max(180).optional(),
});
export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await requireAdmin();
    const body = schema.parse(await request.json());
    const owner = body.kind === 'cover' ? body.courseId : body.lessonId;
    if (!owner || body.path.split('/')[0] !== owner)
      throw new HttpError(400, 'El archivo no corresponde al contenido.');
    const db = createAdminClient();
    const bucket = body.kind === 'cover' ? 'course-covers' : 'course-materials';
    const { data, error } = await db.storage.from(bucket).info(body.path);
    if (error || !data)
      throw new HttpError(400, 'La carga no se completó. Volvé a subir el archivo.');
    if (body.kind === 'cover') {
      const { data: publicData } = db.storage.from(bucket).getPublicUrl(body.path);
      const { data: course, error } = await db
        .from('courses')
        .update({ cover_url: publicData.publicUrl })
        .eq('id', owner)
        .select('id,cover_url')
        .single();
      if (error) throw error;
      if (!course?.cover_url)
        throw new HttpError(404, 'No pudimos guardar la portada en el curso.');
      revalidatePath(`/admin/cursos/${owner}`);
      revalidatePath('/admin/cursos');
      revalidatePath('/cursos');
      revalidatePath('/cursos/[slug]', 'page');
      revalidatePath('/');
    } else {
      const { error } = await db.from('resources').upsert(
        {
          lesson_id: owner,
          title: body.title || 'Material complementario',
          storage_path: body.path,
        },
        { onConflict: 'storage_path' },
      );
      if (error) throw error;
    }
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

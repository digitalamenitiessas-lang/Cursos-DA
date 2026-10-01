import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authorizeLesson } from '@/lib/media/access';
import { createAdminClient } from '@/lib/supabase/admin';
import { apiError, HttpError } from '@/lib/http';
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase } = await requireUser();
    const { id } = await params;
    z.uuid().parse(id);
    const { data } = await supabase
      .from('resources')
      .select('lesson_id,storage_path,title')
      .eq('id', id)
      .maybeSingle();
    if (!data) throw new HttpError(404, 'Material no disponible.');
    await authorizeLesson(data.lesson_id);
    const db = createAdminClient();
    const { data: signed, error } = await db.storage
      .from('course-materials')
      .createSignedUrl(data.storage_path, 60, { download: true });
    if (error || !signed)
      throw new HttpError(502, 'No pudimos preparar la descarga. Intentá nuevamente.');
    return new Response(null, {
      status: 303,
      headers: {
        Location: signed.signedUrl,
        'Cache-Control': 'private, no-store',
        Vary: 'Cookie',
        'Referrer-Policy': 'no-referrer',
      },
    });
  } catch (error) {
    return apiError(error);
  }
}

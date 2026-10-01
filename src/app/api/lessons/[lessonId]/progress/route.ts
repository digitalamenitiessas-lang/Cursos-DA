import { z } from 'zod';
import { requireUser } from '@/lib/auth';
import { authorizeLesson } from '@/lib/media/access';
import { assertSameOrigin, apiError } from '@/lib/http';
const schema = z.object({
  positionSeconds: z.number().finite().min(0).max(360000),
  completed: z.boolean().optional(),
});
export async function POST(
  request: Request,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  try {
    assertSameOrigin(request);
    const { supabase } = await requireUser();
    const { lessonId } = await params;
    const { lesson } = await authorizeLesson(lessonId);
    const input = schema.parse(await request.json());
    const { error } = await supabase.rpc('save_lesson_progress', {
      p_lesson_id: lessonId,
      p_position_seconds: Math.floor(
        Math.min(input.positionSeconds, lesson.duration_seconds || 360000),
      ),
      p_completed: input.completed ?? false,
    });
    if (error) throw error;
    return Response.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return apiError(error);
  }
}

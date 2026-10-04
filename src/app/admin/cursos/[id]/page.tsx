import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowDown,
  ArrowUp,
  FileText,
  Plus,
  GripVertical,
  CheckCircle2,
  Circle,
  Image as ImageIcon,
  ListVideo,
  FilePenLine,
} from 'lucide-react';
import { requireAdminPage as requireAdmin } from '@/app/admin/access';
import { CourseForm } from '@/components/admin/course-form';
import { ConfirmSubmit } from '@/components/admin/confirm-submit';
import { AdminNotice } from '@/components/admin/notice';
import { UploadControl } from '@/components/admin/upload-control';
import { LessonVideoControl } from '@/components/admin/lesson-video-control';
import { moveContent, saveLesson, saveModule, setCourseStatus } from '../../actions';
import { z } from 'zod';
import { allAdminRows } from '../../data';
import type { Lesson, Module } from '@/lib/types';

function OrderButton({
  courseId,
  id,
  kind,
  moduleId,
  direction,
  disabled,
}: {
  courseId: string;
  id: string;
  kind: 'modules' | 'lessons';
  moduleId?: string;
  direction: 'up' | 'down';
  disabled: boolean;
}) {
  return (
    <form action={moveContent}>
      <input type="hidden" name="course_id" value={courseId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="kind" value={kind} />
      <input type="hidden" name="module_id" value={moduleId || ''} />
      <input type="hidden" name="direction" value={direction} />
      <button
        className="rounded-lg border border-white/10 p-2 text-slate-400 transition hover:text-white disabled:opacity-25"
        disabled={disabled}
        title={direction === 'up' ? 'Mover arriba' : 'Mover abajo'}
        aria-label={direction === 'up' ? 'Mover arriba' : 'Mover abajo'}
      >
        {direction === 'up' ? <ArrowUp size={14} /> : <ArrowDown size={14} />}
      </button>
    </form>
  );
}
export default async function CourseEditor({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) notFound();
  const query = await searchParams;
  const { supabase } = await requireAdmin();
  const [{ data: course, error: courseError }, modules, lessons, videos, resources] =
    await Promise.all([
      supabase.from('courses').select('*').eq('id', id).maybeSingle(),
      allAdminRows<Module>('modules', '*', { course_id: id }, 'position'),
      allAdminRows<Lesson>('lessons', '*', { course_id: id }, 'position'),
      allAdminRows<{ lesson_id: string; status: string; stream_uid: string }>(
        'lesson_videos',
        'lesson_id,status,stream_uid,lessons!inner(course_id)',
        { 'lessons.course_id': id },
        'lesson_id',
      ),
      allAdminRows<{ id: string; lesson_id: string; title: string }>(
        'resources',
        'id,lesson_id,title,lessons!inner(course_id)',
        { 'lessons.course_id': id },
      ),
    ]);
  if (courseError) throw new Error('No se pudo cargar el curso');
  if (!course) notFound();
  return (
    <div className="space-y-8">
      <Link href="/admin/cursos" className="text-sm text-slate-400 hover:text-white">
        ← Todos los cursos
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow">EDITOR DEL CURSO</p>
          <h1 className="page-heading mt-2">{course.title}</h1>
        </div>
        {course.status === 'published' && (
          <Link className="button-secondary" href={`/cursos/${course.slug}`}>
            Ver página pública ↗
          </Link>
        )}
      </div>
      <AdminNotice error={query.error} success={query.success} />
      <nav className="studio-editor-nav" aria-label="Secciones del editor">
        <a href="#curso-informacion">
          <FilePenLine size={14} />
          Información
        </a>
        <a href="#curso-temario">
          <ListVideo size={14} />
          Temario y archivos <span>{lessons.length} clases</span>
        </a>
        <a href="#curso-portada">
          <ImageIcon size={14} />
          Portada y publicación
        </a>
      </nav>
      <div className="grid items-start gap-6 xl:grid-cols-[1fr_320px]">
        <section
          id="curso-informacion"
          className="studio-editor-anchor studio-editor-general panel p-6 md:p-8"
        >
          <h2 className="section-heading mb-6">Información general</h2>
          <CourseForm key={`${id}:${course.status}`} course={course} />
        </section>
        <aside id="curso-portada" className="studio-editor-anchor space-y-5">
          <div className="panel p-5">
            {course.cover_url && (
              <div className="mb-4 aspect-[16/10] overflow-hidden rounded-xl">
                <img
                  src={course.cover_url}
                  alt={`Portada de ${course.title}`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}
            <UploadControl kind="cover" courseId={id} />
          </div>
          <div className="panel space-y-4 p-5">
            <h2 className="font-medium">Disponibilidad</h2>
            <p className="text-sm leading-relaxed text-slate-400">
              {course.status === 'draft'
                ? 'Este curso está en borrador: todavía no aparece en la academia. Publicalo cuando esté preparado.'
                : course.status === 'published'
                  ? 'Este curso está publicado y aparece en el catálogo de la academia.'
                  : 'Este curso está archivado: no aparece en el catálogo, pero sus alumnos conservan el acceso.'}
            </p>
            <ul className="studio-readiness" aria-label="Preparación del curso">
              {[
                {
                  label: 'Información y precio definidos',
                  done: Boolean(course.title && course.description && course.price_cents),
                },
                { label: 'Portada cargada', done: Boolean(course.cover_url) },
                {
                  label: `${modules.length} módulos · ${lessons.length} clases`,
                  done: lessons.length > 0,
                },
                {
                  label: `${videos.filter((video) => video.status === 'ready').length} de ${lessons.length} videos vinculados`,
                  done:
                    lessons.length > 0 &&
                    videos.filter((video) => video.status === 'ready').length === lessons.length,
                },
              ].map((item) => (
                <li key={item.label} className={item.done ? '' : 'is-missing'}>
                  {item.done ? <CheckCircle2 size={15} /> : <Circle size={15} />}
                  <span>{item.label}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-500">
              Antes de publicar, probá la reproducción de los videos de cada clase.
            </p>
            {course.status !== 'archived' && (
              <form action={setCourseStatus}>
                <input type="hidden" name="course_id" value={id} />
                <input
                  type="hidden"
                  name="status"
                  value={course.status === 'published' ? 'draft' : 'published'}
                />
                <ConfirmSubmit
                  className={
                    course.status === 'published' ? 'button-secondary w-full' : 'button w-full'
                  }
                >
                  {course.status === 'published'
                    ? 'Volver a borrador'
                    : 'Publicar curso en la academia'}
                </ConfirmSubmit>
              </form>
            )}
            {course.status === 'published' && (
              <Link href={`/cursos/${course.slug}`} className="button-secondary w-full">
                Ver curso en la academia
              </Link>
            )}
            <form action={setCourseStatus}>
              <input type="hidden" name="course_id" value={id} />
              <input
                type="hidden"
                name="status"
                value={course.status === 'archived' ? 'draft' : 'archived'}
              />
              <ConfirmSubmit
                message={
                  course.status !== 'archived'
                    ? '¿Archivar este curso y retirarlo de la venta? Los alumnos conservarán su acceso.'
                    : undefined
                }
              >
                {course.status === 'archived' ? 'Restaurar como borrador' : 'Archivar curso'}
              </ConfirmSubmit>
            </form>
          </div>
        </aside>
      </div>
      <section id="curso-temario" className="studio-editor-anchor space-y-5">
        <div>
          <h2 className="section-heading">El recorrido de aprendizaje</h2>
          <p className="muted mt-2">
            Organizá módulos, clases y materiales. Los cambios se guardan por separado.
          </p>
        </div>
        {!modules?.length && (
          <div className="panel p-8 text-center text-slate-400">
            Todavía no hay módulos. Creá el primero para empezar a cargar clases.
          </div>
        )}
        {modules?.map((module, moduleIndex) => {
          const moduleLessons = (lessons || []).filter((lesson) => lesson.module_id === module.id);
          return (
            <section key={module.id} className="panel overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 bg-white/[.02] p-5">
                <GripVertical size={18} className="text-slate-600" />
                <span className="text-xs font-semibold text-violet-300">
                  MÓDULO {moduleIndex + 1}
                </span>
                <form action={saveModule} className="flex min-w-0 flex-1 flex-wrap gap-2">
                  <input type="hidden" name="course_id" value={id} />
                  <input type="hidden" name="id" value={module.id} />
                  <label className="min-w-40 flex-1">
                    <span className="sr-only">Título del módulo</span>
                    <input
                      className="input"
                      name="title"
                      required
                      minLength={2}
                      maxLength={160}
                      defaultValue={module.title}
                    />
                  </label>
                  <ConfirmSubmit>Guardar título</ConfirmSubmit>
                </form>
                <div className="flex gap-1">
                  <OrderButton
                    courseId={id}
                    id={module.id}
                    kind="modules"
                    direction="up"
                    disabled={moduleIndex === 0}
                  />
                  <OrderButton
                    courseId={id}
                    id={module.id}
                    kind="modules"
                    direction="down"
                    disabled={moduleIndex === modules.length - 1}
                  />
                </div>
              </div>
              <div className="space-y-3 p-5">
                {moduleLessons.map((lesson, index) => (
                  <div key={lesson.id} className="rounded-xl border border-white/10">
                    <div className="flex items-center justify-between gap-4 px-4 pt-4">
                      <div className="min-w-0">
                        <p className="text-xs text-slate-500">
                          CLASE {index + 1}
                          {lesson.is_preview ? ' · MUESTRA GRATUITA' : ''}
                        </p>
                        <h3 className="mt-1 font-medium">{lesson.title}</h3>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <OrderButton
                          courseId={id}
                          moduleId={module.id}
                          id={lesson.id}
                          kind="lessons"
                          direction="up"
                          disabled={index === 0}
                        />
                        <OrderButton
                          courseId={id}
                          moduleId={module.id}
                          id={lesson.id}
                          kind="lessons"
                          direction="down"
                          disabled={index === moduleLessons.length - 1}
                        />
                      </div>
                    </div>
                    <details className="p-4">
                      <summary className="cursor-pointer text-sm text-violet-300">
                        Editar clase y archivos
                      </summary>
                      <div className="mt-5 grid items-start gap-5 lg:grid-cols-2">
                        <form action={saveLesson} className="space-y-4">
                          <input type="hidden" name="course_id" value={id} />
                          <input type="hidden" name="module_id" value={module.id} />
                          <input type="hidden" name="id" value={lesson.id} />
                          <label className="field">
                            <span className="field-label">Título</span>
                            <input
                              className="input"
                              name="title"
                              required
                              minLength={2}
                              maxLength={180}
                              defaultValue={lesson.title}
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Descripción</span>
                            <textarea
                              name="description"
                              className="input min-h-24"
                              maxLength={10000}
                              defaultValue={lesson.description || ''}
                            />
                          </label>
                          <label className="field">
                            <span className="field-label">Duración estimada (minutos)</span>
                            <input
                              className="input"
                              name="duration_minutes"
                              type="number"
                              min="0"
                              max="1440"
                              step="0.1"
                              defaultValue={Math.round(lesson.duration_seconds / 6) / 10}
                            />
                          </label>
                          <label className="flex items-start gap-2 text-sm">
                            <input
                              className="mt-1 accent-violet-500"
                              type="checkbox"
                              name="is_preview"
                              defaultChecked={lesson.is_preview}
                            />
                            <span>
                              Permitir como clase de muestra gratuita
                              <span className="mt-1 block text-xs text-slate-500">
                                El video será accesible desde la página pública del curso.
                              </span>
                            </span>
                          </label>
                          <ConfirmSubmit>Guardar clase</ConfirmSubmit>
                        </form>
                        <div className="space-y-4">
                          <LessonVideoControl
                            key={
                              videos.find((video) => video.lesson_id === lesson.id)?.stream_uid ||
                              lesson.id
                            }
                            lessonId={lesson.id}
                            initialVideo={videos.find((video) => video.lesson_id === lesson.id)}
                          />
                          <UploadControl kind="resource" lessonId={lesson.id} />
                          {resources
                            ?.filter((resource) => resource.lesson_id === lesson.id)
                            .map((resource) => (
                              <div
                                key={resource.id}
                                className="flex items-center gap-2 text-sm text-slate-400"
                              >
                                <FileText size={14} />
                                {resource.title}
                              </div>
                            ))}
                        </div>
                      </div>
                    </details>
                  </div>
                ))}
                <details className="rounded-xl border border-dashed border-violet-400/30 p-4">
                  <summary className="cursor-pointer text-sm text-violet-300">
                    + Agregar clase
                  </summary>
                  <form action={saveLesson} className="mt-4 space-y-4">
                    <input type="hidden" name="course_id" value={id} />
                    <input type="hidden" name="module_id" value={module.id} />
                    <input type="hidden" name="duration_minutes" value="0" />
                    <label className="field">
                      <span className="field-label">Título de la nueva clase</span>
                      <input
                        className="input"
                        name="title"
                        required
                        minLength={2}
                        maxLength={180}
                        placeholder="Introducción al módulo"
                      />
                    </label>
                    <label className="field">
                      <span className="field-label">Descripción (opcional)</span>
                      <textarea className="input" name="description" maxLength={10000} />
                    </label>
                    <ConfirmSubmit className="button">Crear clase</ConfirmSubmit>
                  </form>
                </details>
              </div>
            </section>
          );
        })}
        <form action={saveModule} className="panel flex flex-wrap items-end gap-3 p-5">
          <input type="hidden" name="course_id" value={id} />
          <label className="field min-w-48 flex-1">
            <span className="field-label">Nuevo módulo</span>
            <input
              className="input"
              name="title"
              required
              minLength={2}
              maxLength={160}
              placeholder="Nombre del módulo"
            />
          </label>
          <ConfirmSubmit className="button">
            <Plus size={16} />
            Crear módulo
          </ConfirmSubmit>
        </form>
        <p className="text-xs leading-relaxed text-slate-500">
          El contenido se conserva para proteger los cursos ya vendidos. Para retirar un curso
          completo de la venta, usá la opción de archivar.
        </p>
      </section>
    </div>
  );
}

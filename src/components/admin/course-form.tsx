'use client';

import { useId, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, ArrowLeft, BookOpen, Eye, Info, Save } from 'lucide-react';
import { saveCourse } from '@/app/admin/actions';
import { formatMoney } from '@/lib/utils';
import { ConfirmSubmit } from './confirm-submit';
import { learningPaths } from '@/lib/offering';
export type EditableCourse = {
  id?: string;
  title?: string;
  slug?: string;
  subtitle?: string | null;
  description?: string;
  category?: string;
  level?: string;
  price_cents?: number;
  status?: string;
  instructor?: string;
  learning_outcomes?: string[];
  requirements?: string[];
  featured?: boolean;
};
const steps = ['Presentación', 'Aprendizaje', 'Venta'];
const slugify = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180);
export function CourseForm({
  course = {},
  preview = false,
}: {
  course?: EditableCourse;
  preview?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [previewMessage, setPreviewMessage] = useState('');
  const [title, setTitle] = useState(course.title || '');
  const [slug, setSlug] = useState(course.slug || '');
  const [slugEdited, setSlugEdited] = useState(Boolean(course.slug));
  const [category, setCategory] = useState(course.category || '');
  const [price, setPrice] = useState(course.price_cents ? String(course.price_cents / 100) : '');
  const formRef = useRef<HTMLFormElement>(null);
  const prefix = useId();
  function selectStep(next: number) {
    if (next > step) {
      const fields = formRef.current?.querySelectorAll<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >(
        `[data-step="${step}"] input, [data-step="${step}"] textarea, [data-step="${step}"] select`,
      );
      const invalid = [...(fields || [])].find((field) => !field.checkValidity());
      if (invalid) {
        invalid.reportValidity();
        return;
      }
    }
    setStep(next);
  }
  return (
    <form
      ref={formRef}
      action={preview ? undefined : saveCourse}
      className="course-wizard"
      noValidate
      onSubmit={(event) => {
        const invalid = event.currentTarget.querySelector<
          HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        >('input:invalid,textarea:invalid,select:invalid');
        if (invalid) {
          event.preventDefault();
          const targetStep = Number(invalid.closest('[data-step]')?.getAttribute('data-step') || 0);
          flushSync(() => setStep(targetStep));
          invalid.reportValidity();
          return;
        }
        if (preview) {
          event.preventDefault();
          setPreviewMessage(
            'Vista de diseño: para guardar cursos necesitás ingresar como administrador.',
          );
        }
      }}
    >
      {course.id && <input type="hidden" name="id" value={course.id} />}
      <div className="course-wizard-main">
        <span className="sr-only" aria-live="polite">
          Paso {step + 1} de 3: {steps[step]}
        </span>
        <div className="course-stepper" role="tablist" aria-label="Pasos de edición del curso">
          {steps.map((label, index) => (
            <button
              type="button"
              key={label}
              role="tab"
              id={`${prefix}-tab-${index}`}
              aria-controls={`${prefix}-step-${index}`}
              aria-selected={step === index}
              tabIndex={step === index ? 0 : -1}
              onClick={() => selectStep(index)}
              onKeyDown={(event) => {
                if (['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(event.key)) {
                  event.preventDefault();
                  const next =
                    event.key === 'Home'
                      ? 0
                      : event.key === 'End'
                        ? 2
                        : (step + (event.key === 'ArrowRight' ? 1 : 2)) % 3;
                  selectStep(next);
                  // Move keyboard focus only after a validated step change.
                  requestAnimationFrame(
                    () =>
                      document
                        .getElementById(`${prefix}-tab-${next}`)
                        ?.getAttribute('aria-selected') === 'true' &&
                      document.getElementById(`${prefix}-tab-${next}`)?.focus(),
                  );
                }
              }}
            >
              <span>{`0${index + 1}`}</span>
              {label}
            </button>
          ))}
        </div>
        <section
          data-step="0"
          role="tabpanel"
          id={`${prefix}-step-0`}
          aria-labelledby={`${prefix}-tab-0`}
          hidden={step !== 0}
        >
          <h3>Dale una primera impresión.</h3>
          <p>Contá qué ofrece el curso y quién lo va a enseñar.</p>
          <div className="form-grid">
            <label className="field md:col-span-2">
              <span className="field-label">Nombre del curso</span>
              <input
                className="input"
                name="title"
                required
                minLength={3}
                maxLength={180}
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (!slugEdited) setSlug(slugify(e.target.value));
                }}
                placeholder="Diseño de interfaces desde cero"
              />
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Dirección del curso</span>
              <input
                className="input"
                name="slug"
                required
                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                minLength={3}
                maxLength={180}
                value={slug}
                onChange={(e) => {
                  setSlugEdited(true);
                  setSlug(e.target.value);
                }}
                placeholder="diseno-de-interfaces"
              />
              <span className="text-xs text-slate-500">/cursos/{slug || 'nombre-del-curso'}</span>
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Una frase para presentarlo</span>
              <input
                className="input"
                name="subtitle"
                maxLength={300}
                defaultValue={course.subtitle || ''}
                placeholder="De tu primera idea a un producto que funciona"
              />
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Descripción</span>
              <textarea
                className="input min-h-36"
                name="description"
                required
                minLength={10}
                maxLength={20000}
                defaultValue={course.description}
                placeholder="Describí el recorrido, los proyectos y a quién está dirigido."
              />
            </label>
            <label className="field">
              <span className="field-label">Categoría</span>
              <input
                className="input"
                name="category"
                required
                minLength={2}
                maxLength={80}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="IA aplicada"
                list={`${prefix}-categories`}
              />
              <datalist id={`${prefix}-categories`}>
                {learningPaths.map((path) => (
                  <option value={path.category} key={path.id} />
                ))}
              </datalist>
              <span className="text-xs muted">
                Elegí una categoría sugerida o escribí una nueva.
              </span>
            </label>
            <label className="field">
              <span className="field-label">Instructor</span>
              <input
                className="input"
                name="instructor"
                required
                minLength={2}
                maxLength={160}
                defaultValue={course.instructor}
                placeholder="Nombre y apellido"
              />
            </label>
          </div>
        </section>
        <section
          data-step="1"
          role="tabpanel"
          id={`${prefix}-step-1`}
          aria-labelledby={`${prefix}-tab-1`}
          hidden={step !== 1}
        >
          <h3>Definí lo que se van a llevar.</h3>
          <p>
            Ayudá a cada persona a saber si este curso es para ella. Los módulos y las clases se
            agregan después de guardar.
          </p>
          <div className="form-grid">
            <label className="field md:col-span-2">
              <span className="field-label">Nivel del curso</span>
              <select className="input" name="level" defaultValue={course.level || 'Inicial'}>
                {['Inicial', 'Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles'].map(
                  (level) => (
                    <option key={level}>{level}</option>
                  ),
                )}
              </select>
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Qué van a aprender</span>
              <textarea
                className="input min-h-36"
                name="learning_outcomes"
                required
                defaultValue={course.learning_outcomes?.join('\n')}
                placeholder={'Diseñar interfaces accesibles\nCrear un proyecto completo'}
              />
              <span className="text-xs text-slate-500">
                Un objetivo por línea. Hasta 30 objetivos, de 300 caracteres cada uno.
              </span>
            </label>
            <label className="field md:col-span-2">
              <span className="field-label">Qué necesitan para empezar</span>
              <textarea
                className="input min-h-28"
                name="requirements"
                defaultValue={course.requirements?.join('\n')}
                placeholder="Un requisito por línea. Dejalo vacío si no requiere conocimientos previos."
              />
            </label>
          </div>
        </section>
        <section
          data-step="2"
          role="tabpanel"
          id={`${prefix}-step-2`}
          aria-labelledby={`${prefix}-tab-2`}
          hidden={step !== 2}
        >
          <h3>Prepará su próximo destino.</h3>
          <p>
            {course.id
              ? 'Definí el precio y cuándo estará disponible en la academia.'
              : 'Tu curso comienza como borrador. Después podés agregar la portada, cargar las clases y publicarlo.'}
          </p>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Precio · pesos argentinos</span>
              <input
                className="input"
                name="price"
                type="number"
                step="0.01"
                min="1"
                max="10000000"
                required
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="49000"
              />
              <span className="text-xs text-slate-500">Un pago. Acceso sin vencimiento.</span>
            </label>
            {course.id ? (
              <label className="field">
                <span className="field-label">Disponibilidad</span>
                <select className="input" name="status" defaultValue={course.status || 'draft'}>
                  <option value="draft">Borrador</option>
                  <option value="published">Publicado</option>
                  {course.status === 'archived' && <option value="archived">Archivado</option>}
                </select>
              </label>
            ) : (
              <>
                <input type="hidden" name="status" value="draft" />
                <div className="field">
                  <span className="field-label">Disponibilidad</span>
                  <span className="input flex items-center text-slate-400">
                    Borrador · visible solo para el equipo
                  </span>
                </div>
              </>
            )}
            <label className="flex items-center gap-3 text-sm md:col-span-2">
              <input
                type="checkbox"
                name="featured"
                defaultChecked={course.featured}
                className="h-4 w-4 accent-violet-400"
              />
              Destacar en la portada de la academia
            </label>
          </div>
        </section>
        {previewMessage && (
          <p role="status" className="notice mt-6">
            {previewMessage}
          </p>
        )}
        <div className="course-wizard-footer">
          {step > 0 ? (
            <button type="button" className="button-secondary" onClick={() => selectStep(step - 1)}>
              <ArrowLeft size={14} />
              Volver
            </button>
          ) : (
            <span>Paso {step + 1} de 3</span>
          )}
          {step < 2 ? (
            <button type="button" className="button" onClick={() => selectStep(step + 1)}>
              Continuar <ArrowRight size={14} />
            </button>
          ) : (
            <ConfirmSubmit className="button">
              <Save size={15} />
              {course.id ? 'Guardar cambios' : 'Crear borrador'}
            </ConfirmSubmit>
          )}
        </div>
      </div>
      <aside className="course-preview" aria-label="Vista previa del nombre y precio">
        <p>
          <Eye size={12} className="inline mr-2" />
          ASÍ EMPIEZA A VERSE
        </p>
        <div className="studio-course-card">
          <div className="studio-course-art">
            <BookOpen size={42} strokeWidth={1} />
            <span className="badge">Vista previa</span>
          </div>
          <div className="studio-course-body">
            <p>{category || 'Tu categoría'}</p>
            <h2>{title || 'El nombre de tu próximo curso'}</h2>
            <div className="studio-course-bottom">
              <span>
                {price ? formatMoney(Math.round(Number(price) * 100) || 0) : 'Precio por definir'}
              </span>
              <ArrowRight size={15} />
            </div>
          </div>
        </div>
        <div className="course-preview-note">
          <Info size={14} />
          <span>
            Es una vista previa. La portada y el contenido se cargan desde el editor del curso.
          </span>
        </div>
      </aside>
    </form>
  );
}

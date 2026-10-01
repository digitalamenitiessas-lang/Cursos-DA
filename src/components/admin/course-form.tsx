import { saveCourse } from '@/app/admin/actions';
import { ConfirmSubmit } from './confirm-submit';
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
export function CourseForm({ course = {} }: { course?: EditableCourse }) {
  return (
    <form action={saveCourse} className="space-y-6">
      {course.id && <input type="hidden" name="id" value={course.id} />}
      <div className="form-grid">
        <label className="field">
          <span className="field-label">Nombre del curso</span>
          <input
            className="input"
            name="title"
            required
            minLength={3}
            maxLength={180}
            defaultValue={course.title}
            placeholder="Diseño de interfaces desde cero"
          />
        </label>
        <label className="field">
          <span className="field-label">URL del curso</span>
          <input
            className="input"
            name="slug"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            minLength={3}
            maxLength={180}
            defaultValue={course.slug}
            placeholder="diseno-de-interfaces"
          />
          <span className="text-xs text-slate-400">Solo letras minúsculas, números y guiones.</span>
        </label>
        <label className="field md:col-span-2">
          <span className="field-label">Bajada</span>
          <input
            className="input"
            name="subtitle"
            maxLength={300}
            defaultValue={course.subtitle || ''}
            placeholder="Una frase que cuente la transformación"
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
            defaultValue={course.category}
            placeholder="Diseño"
          />
        </label>
        <label className="field">
          <span className="field-label">Nivel</span>
          <select className="input" name="level" defaultValue={course.level || 'Principiante'}>
            {['Inicial', 'Principiante', 'Intermedio', 'Avanzado', 'Todos los niveles'].map(
              (level) => (
                <option key={level}>{level}</option>
              ),
            )}
          </select>
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
          />
        </label>
        <label className="field">
          <span className="field-label">Precio en pesos argentinos</span>
          <input
            className="input"
            name="price"
            type="number"
            step="0.01"
            min="1"
            max="10000000"
            required
            defaultValue={course.price_cents ? course.price_cents / 100 : ''}
            placeholder="49000"
          />
          <span className="text-xs text-slate-400">
            Pago único. El importe se guarda en centavos.
          </span>
        </label>
        <label className="field">
          <span className="field-label">Qué va a aprender</span>
          <textarea
            className="input min-h-32"
            name="learning_outcomes"
            required
            defaultValue={course.learning_outcomes?.join('\n')}
            placeholder={'Diseñar interfaces accesibles\nCrear un proyecto completo'}
          />
          <span className="text-xs text-slate-400">Un objetivo por línea, hasta 30.</span>
        </label>
        <label className="field">
          <span className="field-label">Requisitos</span>
          <textarea
            className="input min-h-32"
            name="requirements"
            defaultValue={course.requirements?.join('\n')}
            placeholder="Un requisito por línea"
          />
        </label>
        <label className="field">
          <span className="field-label">Estado</span>
          <select className="input" name="status" defaultValue={course.status || 'draft'}>
            <option value="draft">Borrador</option>
            <option value="published">Publicado</option>
            {course.status === 'archived' && <option value="archived">Archivado</option>}
          </select>
        </label>
        <label className="flex items-center gap-3 self-center text-sm">
          <input
            type="checkbox"
            name="featured"
            defaultChecked={course.featured}
            className="h-4 w-4 accent-violet-500"
          />
          Destacar en el inicio
        </label>
      </div>
      <ConfirmSubmit className="button">
        {course.id ? 'Guardar cambios' : 'Crear curso'}
      </ConfirmSubmit>
    </form>
  );
}

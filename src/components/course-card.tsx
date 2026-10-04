import Link from 'next/link';
import {
  Code2,
  Layers3,
  ChartNoAxesCombined,
  Sparkles,
  Clock3,
  BookOpen,
  Workflow,
  Wrench,
} from 'lucide-react';
import type { Course } from '@/lib/types';
import { formatMoney, formatDuration } from '@/lib/utils';
import { courseStats } from '@/lib/data/courses';
import { normalizeSearch } from '@/lib/offering';
export function CourseArtwork({ course, large = false }: { course: Course; large?: boolean }) {
  const category = normalizeSearch(course.category);
  const kind = /desarrollo|programacion|web/.test(category)
    ? 'code'
    : category.includes('diseno')
      ? 'design'
      : category.includes('datos')
        ? 'data'
        : category.includes('automatiza')
          ? 'automation'
          : /inteligencia artificial|ia aplicada/.test(category)
            ? 'ai'
            : 'tools';
  const Icon = {
    code: Code2,
    design: Layers3,
    data: ChartNoAxesCombined,
    ai: Sparkles,
    automation: Workflow,
    tools: Wrench,
  }[kind];
  const captions = {
    code: 'Tu idea, en una web.',
    design: 'Diseñá materiales que se usan.',
    data: 'De los datos a una decisión.',
    ai: 'IA aplicada, con criterio.',
    automation: 'Menos pasos en una tarea.',
    tools: 'Herramientas para el día a día.',
  };
  return (
    <div className={`course-art art-${kind} ${large ? 'art-large' : ''}`}>
      {course.cover_url ? (
        <img src={course.cover_url} alt="" className="course-cover" />
      ) : (
        <>
          <div className="art-grid" />
          <span className="art-label">DA / {course.category.toLocaleUpperCase('es')}</span>
          <div className="art-icon">
            <Icon size={large ? 76 : 58} strokeWidth={1} />
          </div>
          <span className="art-caption">{captions[kind]}</span>
        </>
      )}
    </div>
  );
}
export function CourseCard({ course }: { course: Course }) {
  const stats = courseStats(course);
  return (
    <div className="course-card-frame">
      <Link href={`/cursos/${course.slug}`} className="course-card group">
        <CourseArtwork course={course} />
        <div className="course-card-content">
          <div className="course-meta">
            <span className="category-label">{course.category}</span>
            <span>{course.level}</span>
          </div>
          <h3>{course.title}</h3>
          <p className="instructor">Por {course.instructor}</p>
          <div className="course-facts">
            <span>
              <BookOpen size={14} />
              {stats.count} {stats.count === 1 ? 'clase' : 'clases'}
            </span>
            <span>
              <Clock3 size={14} />
              {formatDuration(stats.duration)}
            </span>
          </div>
          <div className="course-price">
            <strong>
              {formatMoney(course.price_cents)} <small>ARS</small>
            </strong>
            <span>
              Ver curso <span aria-hidden="true">↗</span>
            </span>
          </div>
        </div>
      </Link>
    </div>
  );
}

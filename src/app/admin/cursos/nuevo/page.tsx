import Link from 'next/link';
import { CourseForm } from '@/components/admin/course-form';
import { AdminNotice } from '@/components/admin/notice';
export default async function NewCourse({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const query = await searchParams;
  return (
    <div className="space-y-6">
      <Link href="/admin/cursos" className="text-sm text-slate-400 hover:text-white">
        ← Todos los cursos
      </Link>
      <div>
        <h1 className="page-heading">Creá tu próximo curso.</h1>
        <p className="muted mt-2">
          Tres pasos para darle forma. Guardalo como borrador y después cargá las clases.
        </p>
      </div>
      <AdminNotice error={query.error} />
      <section className="panel p-6 md:p-8">
        <CourseForm />
      </section>
    </div>
  );
}

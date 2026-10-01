import { notFound } from 'next/navigation';
import Link from 'next/link';
import { AdminWorkspace } from '@/components/admin/workspace';
import { StudioWelcome } from '@/components/admin/studio-welcome';
import { CourseForm } from '@/components/admin/course-form';
import { UploadControl } from '@/components/admin/upload-control';
import '@/components/admin/admin.css';
export default async function StudioPreview({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { view } = await searchParams;
  return (
    <AdminWorkspace preview>
      <nav className="studio-editor-nav">
        <Link href="/studio-preview">Vista general</Link>
        <Link href="/studio-preview?view=curso">Editor de curso</Link>
        <Link href="/studio-preview?view=archivos">Carga de archivos</Link>
      </nav>
      <div className="mt-8">
        {view === 'curso' ? (
          <section className="panel p-8">
            <CourseForm preview />
          </section>
        ) : view === 'archivos' ? (
          <section className="grid gap-5 md:grid-cols-2">
            <UploadControl preview kind="cover" />
            <UploadControl preview kind="video" />
            <UploadControl preview kind="resource" />
          </section>
        ) : (
          <StudioWelcome />
        )}
      </div>
    </AdminWorkspace>
  );
}

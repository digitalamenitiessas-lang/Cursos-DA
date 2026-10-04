import Link from 'next/link';
import {
  CheckCircle2,
  CircleDashed,
  Database,
  Play,
  CreditCard,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react';
import { requireAdminPage } from '@/app/admin/access';
import { isSupabaseConfigured } from '@/lib/env';
export default async function AdminConfiguration() {
  await requireAdminPage();
  const connections = [
    {
      title: 'Cuentas y archivos',
      subtitle: 'Supabase',
      Icon: Database,
      ready: isSupabaseConfigured() && Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
      description: 'Registro de alumnos, cursos, progreso y materiales protegidos.',
    },
    {
      title: 'Clases con YouTube',
      subtitle: 'YouTube',
      Icon: Play,
      ready: true,
      description:
        'Pegá el enlace de un video oculto con inserción permitida. No requiere clave API. El enlace puede compartirse fuera del aula.',
    },
    {
      title: 'Videos privados',
      subtitle: 'Cloudflare Stream',
      Icon: Play,
      ready: Boolean(
        process.env.CLOUDFLARE_ACCOUNT_ID &&
        process.env.CLOUDFLARE_API_TOKEN &&
        process.env.CLOUDFLARE_ALLOWED_ORIGINS,
      ),
      description: 'Carga de clases, procesamiento y reproducción para alumnos con acceso.',
    },
    {
      title: 'Cobros online',
      subtitle: 'Mercado Pago',
      Icon: CreditCard,
      ready: Boolean(
        process.env.MP_ACCESS_TOKEN && process.env.MP_WEBHOOK_SECRET && process.env.MP_COLLECTOR_ID,
      ),
      description: 'Checkout, confirmación de pagos y habilitación automática del curso.',
    },
  ];
  return (
    <div className="space-y-7">
      <div>
        <p className="eyebrow">LISTOS PARA EL PRÓXIMO PASO</p>
        <h1 className="page-heading mt-2">Tu academia, conectada.</h1>
        <p className="muted mt-3">
          Revisá qué servicios están configurados para acompañar la operación.
        </p>
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {connections.map(({ title, subtitle, Icon, ready, description }) => (
          <section className="panel p-6" key={title}>
            <Icon size={25} strokeWidth={1.5} className="text-violet-300 mb-6" />
            <p className="eyebrow">{subtitle}</p>
            <h2 className="mt-3 font-medium text-lg">{title}</h2>
            <p className="muted mt-3">{description}</p>
            <p
              className={`mt-6 flex items-center gap-2 text-xs ${ready ? 'text-emerald-300' : 'text-amber-200'}`}
            >
              {ready ? <CheckCircle2 size={15} /> : <CircleDashed size={15} />}{' '}
              {ready ? 'Configuración disponible' : 'Pendiente de configuración'}
            </p>
          </section>
        ))}
      </div>
      <section className="panel p-6 space-y-4">
        <h2 className="section-heading">
          <ShieldCheck size={19} className="inline mr-2 text-violet-300" />
          Antes de abrir las inscripciones
        </h2>
        <p className="muted">
          Que un servicio tenga configuración disponible no significa que haya superado la prueba
          completa. Confirmá registro y correos, subí una clase, reproducila con un alumno y
          completá un pago de prueba.
        </p>
        <p className="muted">
          El equipo técnico configura las conexiones en el servidor. Las claves privadas se
          mantienen fuera de este panel.
        </p>
        <Link href="/admin/cursos" className="button-secondary">
          Preparar mis cursos <ArrowUpRight size={15} />
        </Link>
      </section>
    </div>
  );
}

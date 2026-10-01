# Digital Amenities

MVP de academia en español: Next.js App Router + TypeScript, Tailwind v4, primitivas Shadcn/UI, Supabase PostgreSQL/Auth/Storage, Mercado Pago Checkout Pro y Cloudflare Stream. Preparado para Vercel. No usa pagos ni autenticación simulados.

## Ejecutar

Requiere Node 22 o superior.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000. Para explorar el diseño sin servicios, establecer `DEMO_MODE=true` en `.env.local`: sólo muestra catálogo ficticio en desarrollo y desactiva la compra. Con Supabase configurado o en producción nunca se cargan esos ejemplos. No existe inicio de sesión ni acceso privado ficticio.

```sh
npm run typecheck
npm test
npm run build
bash supabase/tests/run-local.sh  # requiere PostgreSQL 17; ver docs/supabase.md
```

## Conectar los servicios

1. [Supabase, migraciones, RLS, correo y primer administrador](docs/supabase.md).
2. [Mercado Pago, webhook, pruebas y conciliación](docs/payments.md).
3. [Cloudflare Stream y archivos privados](docs/media.md).
4. [Administración y definición de métricas](docs/admin.md).
5. [Despliegue y verificación de extremo a extremo](docs/deployment.md).

Comenzar por crear Supabase, aplicar las tres migraciones, configurar `.env.local`, registrarse/verificar correo y promover ese usuario desde SQL de servidor. Luego completar pagos/videos. `.env.local` está excluido de Git.

## Recorridos

- `/`, `/cursos`, `/cursos/[slug]`: catálogo, búsqueda/filtros, ficha y temario público.
- `/registro`, `/ingresar`, `/recuperar`, `/actualizar-clave`: cuentas verificadas y recuperación.
- `/mi-aula`: cursos activos, retomar y progreso; `/mi-aula/compras`, `/mi-aula/perfil`.
- `/mi-aula/[courseId]/[lessonId]`: aula con video firmado, posición, navegación y recursos.
- `/admin`: métricas; `/admin/cursos`, `/admin/alumnos`, `/admin/pagos`.
- `/pago/resultado?order=…`: consulta al servidor; la URL jamás habilita acceso.

Nombre/logo en `src/lib/brand.ts` y `src/components/brand.tsx`; originales de Digital Amenities en `public/brand/`. El sello se usa en la navegación y el logo completo al pie, con adaptación visual al fondo oscuro mediante CSS. El favicon `src/app/icon.svg` conserva el monograma original y adapta su color al tema del navegador. Tokens cromáticos en `src/app/globals.css`. Los ejemplos están aislados en `src/lib/data/demo.ts` y el seed explícito en `supabase/dev/seed.sql`.

## Revisar el diseño del panel

En desarrollo, `/studio-preview` permite revisar la navegación, el efecto Dither Veil, el formulario y las cargas sin iniciar sesión. Está identificado como una vista de diseño, no muestra datos administrativos y desactiva guardados y transferencias. En producción responde 404. El panel operativo `/admin` siempre exige una cuenta verificada con rol administrador.

React Bits también está integrado en el sitio público: Dither Veil en la ilustración interactiva de la portada y Spotlight Card en las tarjetas del catálogo. La portada conserva la ilustración estática sin WebGL o con movimiento reducido; el efecto se carga por separado, pausa fuera de vista y mantiene el scroll nativo en celular. Los componentes adaptados y su licencia están en `src/components/react-bits/`.

## Modelo de seguridad

`orders` conserva precio/moneda; `payment_attempts` representa cada checkout; `payments` representa estados oficiales consultados a Mercado Pago; `access_grants` representa permisos independientes. Cambios financieros son transaccionales y exclusivos de `service_role`. Ningún formulario admite asignar rol. RLS protege cada consulta directa. Videos tienen metadata separada del temario y tokens temporales; materiales usan bucket privado. Se conservan cursos vendidos al archivarlos.

## Estado de verificación

Ver [registro de entrega](docs/verification.md). Las pruebas locales no acreditan cobros, correos, uploads ni reproducción contra cuentas reales. Esas pruebas requieren credenciales y recursos del propietario.

# Digital Amenities

MVP de academia en español: Next.js App Router + TypeScript, Tailwind v4, primitivas Shadcn/UI, Supabase PostgreSQL/Auth/Storage, Mercado Pago Checkout Pro y Cloudflare Stream. Preparado para Vercel. No usa pagos ni autenticación simulados.

## Ejecutar

Requiere Node 22 o superior.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

Abrir http://localhost:3000. El diseño público funciona sin cursos publicados y muestra estados vacíos explícitos. Los cursos de ejemplo permanecen como borradores y fuera del catálogo público, incluso con `DEMO_MODE=true`. No existe inicio de sesión ni acceso privado ficticio. La vista `/studio-preview` permite revisar administración sólo en desarrollo.

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

- `/`, `/cursos`, `/cursos/[slug]`: portada comercial, catálogo, búsqueda/filtros por objetivo, ficha y temario público.
- `/recursos`, `/soluciones`: presentación de recursos digitales y servicios; funciones comerciales nuevas en preparación.
- `/registro`, `/ingresar`, `/recuperar`, `/actualizar-clave`: cuentas verificadas y recuperación.
- `/mi-aula`: cursos activos, retomar y progreso; `/mi-aula/compras`, `/mi-aula/perfil`. `/mi-aula/recursos` y `/mi-aula/certificados` muestran el estado de preparación de esas funciones.
- `/mi-aula/[courseId]/[lessonId]`: aula con video firmado, posición, navegación y recursos.
- `/admin`: métricas; `/admin/cursos`, `/admin/alumnos`, `/admin/pagos`.
- `/pago/resultado?order=…`: consulta al servidor; la URL jamás habilita acceso.

Nombre/logo en `src/lib/brand.ts` y `src/components/brand.tsx`; originales de Digital Amenities en `public/brand/`. El sello se usa en la navegación y al pie, y el monograma en las piezas gráficas, con adaptación visual al fondo oscuro mediante CSS. El favicon `src/app/icon.svg` conserva el monograma original y adapta su color al tema del navegador. Tokens cromáticos en `src/app/globals.css`. Los ejemplos están aislados en `src/lib/data/demo.ts` y el seed explícito en `supabase/dev/seed.sql`.

## Revisar el diseño del panel

En desarrollo, `/studio-preview` permite revisar la navegación, el resumen administrativo, el formulario y las cargas sin iniciar sesión. Está identificado como una vista de diseño, no muestra datos administrativos y desactiva guardados y transferencias. En producción responde 404. El panel operativo `/admin` siempre exige una cuenta verificada con rol administrador.

La portada utiliza piezas gráficas propias con el monograma de la marca, una retícula y material en tono papel. La explicación de compra y aprendizaje muestra sus tres pasos sin requerir varias pantallas de scroll. Las tarjetas conservan bordes y elevación discretos, con movimiento reducido respetado. Los componentes históricos de React Bits y su licencia se mantienen en `src/components/react-bits/`, aunque ya no se usan en estas pantallas.

## Modelo de seguridad

`orders` conserva precio/moneda; `payment_attempts` representa cada checkout; `payments` representa estados oficiales consultados a Mercado Pago; `access_grants` representa permisos independientes. Cambios financieros son transaccionales y exclusivos de `service_role`. Ningún formulario admite asignar rol. RLS protege cada consulta directa. Videos tienen metadata separada del temario y tokens temporales; materiales usan bucket privado. Se conservan cursos vendidos al archivarlos.

## Estado de verificación

Ver [registro de entrega](docs/verification.md). Las pruebas locales no acreditan cobros, correos, uploads ni reproducción contra cuentas reales. Esas pruebas requieren credenciales y recursos del propietario.

## Orientación comercial y etapa de diseño

La plataforma presenta formación práctica, recursos digitales y soluciones a medida. Esta etapa incorpora la navegación, las páginas comerciales y los estados de preparación de Mis recursos y Mis certificados. La venta independiente de archivos, la emisión/verificación de certificados y el guardado de consultas requieren la ampliación funcional documentada en [docs/platform-scope.md](docs/platform-scope.md). El formulario de soluciones no recibe envíos todavía. La implementación existente de compra, aula y progreso se conserva.

Dirección visual en [docs/design.md](docs/design.md); requisitos del propietario en [docs/platform-brief.md](docs/platform-brief.md).

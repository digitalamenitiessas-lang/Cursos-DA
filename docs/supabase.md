# Supabase: instalación y seguridad

## Crear el proyecto

Creá un proyecto nuevo de Supabase para la academia. Mantené separados desarrollo, pruebas y producción. Guardá en el servidor `SUPABASE_SERVICE_ROLE_KEY`; la aplicación pública usa únicamente `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

Las migraciones deben aplicarse **antes** de registrar los usuarios de la academia. Crean perfiles y roles mediante un trigger de Auth; cada registro obtiene el rol `student`, incluso si alguien envía `role: admin` dentro de sus metadatos.

Con Supabase CLI configurado:

```sh
supabase init
supabase login
supabase link --project-ref TU_PROJECT_REF
supabase db push --dry-run
supabase db push
```

Si ya existe `supabase/config.toml`, omití `supabase init`. Las tres migraciones, en orden, son:

1. `supabase/migrations/202609290001_academy.sql`: tablas, restricciones, índices, triggers, permisos SQL, RLS y buckets.
2. `supabase/migrations/202609290002_transactions.sql`: operaciones transaccionales privilegiadas de checkout, pagos, accesos y reordenamiento.
3. `supabase/migrations/202609290003_progress.sql`: guardado atómico de progreso para que una actualización atrasada no desmarque una clase completada.

Para un proyecto nuevo también se puede ejecutar completo `supabase/setup.sql` en el SQL Editor: agrupa las tres migraciones en una transacción y se ejecuta una sola vez. Como alternativa, ejecutá los tres archivos completos en ese orden. Elegí un procedimiento de migración y mantené su historial consistente. No ejecutes `supabase/tests/local-bootstrap.sql` en Supabase: sólo crea interfaces mínimas para pruebas en PostgreSQL vacío.

Las migraciones requieren los esquemas `auth`, `storage` y `extensions` que provee Supabase. No incluyen usuarios, cursos ficticios, compras ni accesos de ejemplo. La integración no crea ni modifica un proyecto remoto automáticamente.

## Auth y correos

Habilitá Email/Password y la confirmación de correo. Configurá SMTP para entrega de correos en producción. En Auth → URL Configuration definí Site URL como `NEXT_PUBLIC_APP_URL`, y autorizá los callbacks de cada ambiente:

```text
https://tu-dominio/auth/callback
https://tu-dominio/auth/callback?next=/actualizar-clave
http://localhost:3000/auth/callback
http://localhost:3000/auth/callback?next=/actualizar-clave
```

Sin SMTP propio, el correo predeterminado de Supabase sólo entrega a direcciones de miembros del equipo de la organización y actualmente limita el proyecto a dos mensajes por hora. Un correo externo puede fallar con `email_address_not_authorized`; el límite devuelve `over_email_send_rate_limit`. Configurá el proveedor en Authentication → Email → SMTP Settings para admitir registros de alumnos. Consultá las [restricciones oficiales de SMTP](https://supabase.com/docs/guides/auth/auth-smtp), ya que los límites pueden cambiar.

Si el registro falla, el formulario distingue estos casos sin mostrar mensajes internos del proveedor. El servidor registra `[auth:signup]` con el código y estado HTTP, sin correo, contraseña ni tokens. Un `unexpected_failure` requiere revisar Auth Logs y Postgres Logs del proyecto: puede indicar un fallo del trigger de perfiles o del servicio. No vuelvas a ejecutar `setup.sql` sobre una base que ya tiene las migraciones; primero diagnosticá el error concreto.

`email_address_invalid` indica que Supabase rechaza la dirección, incluyendo dominios de ejemplo o prueba. Registrá el primer administrador con un correo real al que tengas acceso; no uses las direcciones ilustrativas de esta documentación. Referencia: [códigos de error de Auth](https://supabase.com/docs/guides/auth/debugging/error-codes).

La aplicación implementa el intercambio PKCE en `/auth/callback`. Para enlaces de confirmación utilizables en otro navegador, podés usar la ruta `/auth/confirm` y la plantilla de confirmación:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email">Confirmar mi correo</a>
```

Y para recuperación de contraseña:

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery"
  >Elegir una nueva contraseña</a
>
```

`SiteURL` debe corresponder al ambiente correcto. No desactives verificación de correo para resolver un callback mal configurado. Probá registro, confirmación, ingreso, salida y recuperación con SMTP real antes de abrir el sitio.

## Primer administrador

1. Registrate desde la interfaz y confirmá el correo.
2. Desde el **SQL Editor del proyecto**, conectado como administrador de la base, ejecutá con tu correo:

```sql
select public.bootstrap_first_admin('tu-correo@ejemplo.com');
```

3. Recargá la sesión y entrá a `/admin`.

El procedimiento verifica que el usuario tenga correo confirmado, permite crear únicamente el primer administrador y registra auditoría. Está revocado para `anon` y `authenticated`: no puede invocarse con la clave pública ni desde el navegador. No existe un selector de rol al registrarse. Para añadir administradores más adelante, un operador con acceso autorizado a la base debe gestionar `user_roles` explícitamente; el MVP no expone ese poder en el perfil del alumno.

## Qué protege la base

- El público ve cursos publicados y el temario de módulos/clases. `lessons.description` es texto **público del temario**: no colocar allí instrucciones privadas ni URLs de reproducción.
- Perfiles, órdenes, intentos, pagos y progreso se filtran por dueño. Un alumno puede editar solamente su nombre de perfil; el email se sincroniza desde Auth.
- Los roles, pagos, eventos y accesos no admiten escritura desde el navegador, incluso cuando éste conoce el nombre del RPC.
- `lesson_videos` separa el identificador de Stream y sus metadatos privados del temario público. Ni siquiera el alumno comprador puede consultar su UID directamente. La emisión de tokens requiere backend autorizado.
- `has_course_access` requiere un permiso activo y un curso publicado o archivado. No permite consultar el acceso de otro usuario salvo al administrador o al backend.
- Las órdenes conservan un snapshot inmutable de alumno, curso, centavos y moneda. Los pagos y permisos son independientes. El proveedor se vincula por ID de pago único y el evento, estado y acceso se aplican atómicamente.
- Cada permiso de pago tiene origen propio; revocarlo no elimina una beca manual ni otro pago aprobado. Los accesos manuales requieren administrador, motivo y auditoría.
- Un curso archivado deja de venderse y sigue disponible a compradores. Las relaciones y triggers evitan borrar cursos, clases, videos o archivos con compras/accesos. Usá archivar para retirar un curso vendido.

La clave de servicio evita RLS y por eso se utiliza exclusivamente en módulos `server-only`, después de validar autenticación, rol o firma del proveedor. El navegador nunca recibe esa clave.

## Storage

Las migraciones crean `course-covers` público (hasta 5 MB) y `course-materials` privado (hasta 50 MB). Las portadas admiten imágenes; los materiales admiten PDF, ZIP, TXT, CSV, DOCX, XLSX, PPTX, PNG, JPEG y WebP. Sólo administración solicita autorizaciones de carga. No hay política de borrado de objetos desde clientes.

Los alumnos no descargan directamente el bucket privado, aunque conozcan el path. El backend comprueba acceso al curso y devuelve enlaces de corta duración. Mantener `course-materials` privado es indispensable; un bucket público permitiría servir objetos independientemente de sus políticas de lectura.

## Datos ficticios y pruebas

El catálogo sin servicios puede usar `DEMO_MODE=true` **sólo en desarrollo**; esa vista no procesa pagos. Para probar CRUD sobre una base persistente de desarrollo existe `supabase/dev/seed.sql`, fuera de las migraciones y de la ruta convencional de seed automático. Sus cursos están marcados `[DEMO]`, no incluye pagos ni permisos, y exige una habilitación explícita:

```sh
psql "$DEV_DATABASE_URL" -v ON_ERROR_STOP=1 \
  -c "SET app.allow_development_seed = 'true'" \
  -f supabase/dev/seed.sql
```

No lo ejecutes en producción. Agregá videos de prueba desde administración; los datos ficticios no inventan archivos ni IDs de Stream.

Para las políticas y transacciones, `supabase/tests/security.sql` crea sus propias fixtures dentro de una transacción que termina con rollback:

```sh
psql "$TEST_DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/tests/security.sql
```

Usá una base de pruebas con las migraciones aplicadas y conexión administrativa. Alternativamente, con PostgreSQL 17+ instalado, este script crea y destruye un clúster local aislado, sin escuchar TCP:

```sh
bash supabase/tests/run-local.sh
```

**Verificado en esta entrega:** las tres migraciones se aplicaron en PostgreSQL 17.11 real y pasaron 70 aserciones SQL: aislamiento, escalamiento de privilegios, inmutabilidad, checkout repetido, pendiente→aprobado, duplicados, eventos atrasados, reembolsos, contracargos, mediación, permisos independientes, archivos/videos privados y reordenamiento. El ensayo local usa interfaces SQL mínimas de Auth y Storage; no sustituye probar los servicios reales de Supabase, la entrega de correos ni la API de Storage con credenciales del proyecto.

## Documentación oficial

- [Permisos y RLS](https://supabase.com/docs/guides/database/postgres/row-level-security).
- [Migraciones reproducibles](https://supabase.com/docs/guides/deployment/database-migrations).
- [Clientes SSR para Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?queryGroups=framework&framework=nextjs).
- [Acceso de buckets públicos y privados](https://supabase.com/docs/guides/storage/buckets/fundamentals).
- [Políticas de Storage](https://supabase.com/docs/guides/storage/security/access-control).

Consultada el 29 de septiembre de 2026.

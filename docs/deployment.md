# Configuración y despliegue

## Recursos a crear

1. Repositorio GitHub: [digitalamenitiessas-lang/Cursos-DA](https://github.com/digitalamenitiessas-lang/Cursos-DA), proporcionado por el propietario. El proyecto usa la rama `main`. Las variables privadas se guardan en `.env.local`, excluido de Git.
2. Un proyecto Supabase y SMTP para correo. Aplicar las **tres** migraciones por orden. Seguir [Supabase](supabase.md), completar `.env.local`, registrar/verificar usuario y crear el primer administrador mediante `bootstrap_first_admin`.
3. Una aplicación Mercado Pago con Checkout Pro, credenciales separadas de prueba/producción y secreto webhook. Ver [pagos](payments.md).
4. Cloudflare Stream con token limitado a la cuenta y dominios autorizados. Ver [videos y materiales](media.md).
5. Un proyecto Vercel importado del repositorio GitHub.

## Vercel

- Framework Next.js, directorio raíz del repositorio, Node 22 o posterior, comando `npm run build`.
- La compilación usa Webpack soportado por Next.js para evitar un problema de procesos de Turbopack en el entorno local restringido. El servidor de desarrollo usa Turbopack.
- Cargar todas las variables de `.env.example` en cada entorno. `NEXT_PUBLIC_*` se incorporan al cliente durante la compilación: después de cambiarlas hay que desplegar otra vez. Las claves privadas nunca llevan ese prefijo.
- `NEXT_PUBLIC_APP_URL` debe ser el origen HTTPS exacto del ambiente. Se usa para OAuth/correos, retorno de pago, webhook y controles de origen. Preferir dominios estables para staging y producción.
- `DEMO_MODE=false`. Además, la aplicación ignora los ejemplos cuando está en producción o Supabase está configurado.
- Configurar en Supabase las URLs de callback y en Stream los dominios autorizados, incluyendo el dominio final. No habilitar comodines generales.
- En Mercado Pago, registrar `https://tu-dominio/api/webhooks/mercadopago`, eventos de pago y el secreto de ese ambiente.
- No habilitar caché pública/CDN adicional sobre `/mi-aula`, `/admin`, `/auth` ni `/api`. Las páginas privadas y respuestas firmadas no se comparten entre usuarios.

`vercel.json` incluye una conciliación diaria compatible con la frecuencia de Hobby, a las 05:00 UTC (02:00 Argentina; el proveedor puede ejecutarla con variación horaria). El webhook es el mecanismo principal de habilitación. La conciliación procesa hasta seis órdenes por ejecución, incluyendo el historial en una cola persistente, y pagina sus pagos. En producción con más volumen, **configurar una ejecución cada cinco minutos** con un plan o scheduler que lo admita (`*/5 * * * *`) y comprobar que la cola se recorre a tiempo. También existe conciliación manual por orden y por lote en administración.

Establecer `CRON_SECRET` de al menos 24 caracteres aleatorios. Vercel lo envía en `Authorization: Bearer …`. La ruta de conciliación devuelve 207 si una parte falló; revisar resultados y logs, no asumir éxito sólo por ser una respuesta 2xx.

## Prueba completa antes de vender

Usar entornos y usuarios de prueba, con dos alumnos distintos y un administrador:

1. Registro, confirmación de correo, ingreso/salida, recuperación y guardado del perfil. Intentar modificar `user_roles`, otro perfil y precios con el JWT de alumno: rechazar.
2. Crear un curso borrador; agregar/reordenar módulos y clases; cargar video y esperar estado listo; portada/material; publicar. La API anónima sólo debe ver temario, nunca `lesson_videos` ni archivos privados.
3. Alumno A inicia checkout. Alterar importe/currency enviados por navegador no puede cambiar el precio; el endpoint rechaza campos extra. El alumno B no puede consultar la orden de A.
4. Completar pago de prueba con los usuarios y medios de pago oficiales del proveedor. La pantalla puede mostrar pendiente hasta el webhook. Confirmar acceso sólo después de un pago consultado y validado.
5. Repetir una notificación y entregar una vieja después de la aprobada. Debe existir una única venta y un permiso por pago. Enviar webhook sin firma: rechazo.
6. Pago pendiente que pasa a aprobado. Si se omite webhook, ejecutar conciliación desde administración y comprobar el cambio.
7. Reembolso total, contracargo y reembolso parcial desde Mercado Pago. Verificar revocación del permiso originado y flag de revisión en parcial. Una beca u otro pago independiente debe conservar el acceso.
8. El alumno B intenta abrir el enlace de clase/material de A por API: denegar. Para A, abrir video, avanzar, recargar y comprobar posición; completar y verificar persistencia. Revisar expiración/renovación y falta de descarga pública en Stream.
9. Archivar el curso: desaparece de venta pero A mantiene su aula. Consultar métricas: becas no suman ventas, bruto no se presenta como ganancia.
10. Probar en celular, teclado, conexión interrumpida y preferencia de movimiento reducido. La animación de portada se detiene fuera de vista y con la pestaña oculta; el scroll usa el comportamiento nativo, sin interceptar la rueda.

Ninguna prueba de este apartado se presenta como ejecutada contra servicios reales sin sus credenciales. El [registro de verificación](verification.md) distingue lo comprobado localmente de lo pendiente.

## Fuentes oficiales

- [Next.js: autenticación](https://nextjs.org/docs/app/guides/authentication)
- [Next.js: variables de entorno](https://nextjs.org/docs/app/guides/environment-variables)
- [Shadcn/UI con Tailwind v4](https://ui.shadcn.com/docs/tailwind-v4)
- [Vercel: variables de entorno](https://vercel.com/docs/environment-variables)
- [Vercel: asegurar Cron Jobs](https://vercel.com/docs/cron-jobs/manage-cron-jobs)
- [Vercel: frecuencia y planes de Cron](https://vercel.com/docs/cron-jobs/usage-and-pricing)

Documentación consultada el 29 de septiembre de 2026.

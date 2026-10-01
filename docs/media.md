# Videos y materiales

## Cloudflare Stream

1. Activar Stream en una cuenta Cloudflare. Crear API token con permiso Stream Edit limitado a esa cuenta.
2. Configurar `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` en servidor. Ninguna usa prefijo `NEXT_PUBLIC_`.
3. Establecer `CLOUDFLARE_ALLOWED_ORIGINS` con hostnames exactos de desarrollo, producción y previews admitidas, separados por coma; no protocolos. Evitar `*`.
4. Crear curso/módulo/clase en administración. Elegir un archivo y subirlo. El backend obtiene una URL TUS de un solo uso. El navegador transfiere los bytes directamente a Cloudflare, con progreso, reintentos y chunks de 50 MB. No pasan por Next.js. Límite de aplicación: 30 GB y 10 horas por clase.
5. Mantener abierto el editor hasta completar la carga. El estado de procesamiento se consulta cada 12 segundos. Si se cerró el editor, abrirlo nuevamente y actualizar estado. No hace falta configurar webhook de Stream para este MVP.
6. Los videos se crean con `requiresignedurls` y `allowedorigins`. Comprobar ambas propiedades en el panel de Cloudflare con el primer video. No se habilita descarga.

`POST /api/lessons/:lessonId/playback` autentica y verifica acceso activo en servidor, salvo muestras de cursos publicados. Sólo entonces consulta metadata privada y solicita token. Devuelve `Cache-Control: private, no-store`. Token: duración de la clase × 2 + 1 hora, mínimo 2 horas, máximo 24 horas. El reproductor renueva antes del vencimiento y retoma posición. Los archivos MP4 descargables no se habilitan (`downloadable:false`). Un token ya emitido sigue válido hasta su vencimiento aunque se revoque el acceso; las nuevas emisiones quedan bloqueadas inmediatamente. Las URLs firmadas controlan acceso, no evitan captura de pantalla.

Muestras: marcar una clase como gratuita. El contenido se sirve mediante el mismo firmador, sólo si el curso está publicado. El visitante nunca recibe la metadata de todos los videos del curso.

## Storage

Migraciones crean `course-covers` público (sólo imágenes, 5 MB) y `course-materials` privado (50 MB, formatos permitidos explícitos). Sólo administrador puede autorizar y finalizar cargas. Tras verificar que el archivo existe en Storage, se guarda su referencia. Ante un fallo se puede reintentar; los objetos subidos y no finalizados pueden quedar huérfanos y requieren revisión antes de eliminarlos.

Descargas: `GET /api/resources/:id` verifica cuenta, RLS y acceso al curso antes de emitir enlace de 60 segundos. No hay lectura pública del bucket ni política de borrado de materiales vendidos.

Reemplazar video requiere confirmación y deja la clase temporalmente en procesamiento. El video anterior se conserva en el proveedor; la limpieza del contenido reemplazado es una operación administrativa externa, nunca un borrado automático de contenido vendido.

## Documentación oficial consultada

- [Carga directa de creadores](https://developers.cloudflare.com/stream/uploading-videos/direct-creator-uploads/)
- [TUS y archivos grandes](https://developers.cloudflare.com/stream/uploading-videos/resumable-uploads/)
- [Reproducción privada y tokens](https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/)
- [API del reproductor](https://developers.cloudflare.com/stream/viewing-videos/using-the-stream-player/using-the-player-api/)
- [Storage: enlaces firmados de subida](https://supabase.com/docs/reference/javascript/storage-from-createsigneduploadurl)

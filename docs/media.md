# Videos y materiales

## YouTube

Crear una clase, abrir **Editar clase y archivos**, pegar su enlace en **Video de la clase · YouTube** y guardar. Usar **Probar video guardado** para verificar la inserción antes de publicar. No requiere una clave de YouTube ni configurar Cloudflare. El reproductor utiliza la IFrame API oficial y el dominio `youtube-nocookie.com`, conserva posición, guarda al pausar y marca finalización al terminar. Los controles, enlaces y políticas de reproducción siguen siendo los de YouTube.

Usar videos **ocultos/no listados** con inserción habilitada. Cualquier persona con el enlace puede verlos fuera del aula; los videos privados tienen sus propios permisos de YouTube y no se habilitan por comprar un curso. No hay restricción de reproducción exclusiva por dominio para un video oculto. Referencia: [privacidad de videos](https://support.google.com/youtube/answer/157177), [IFrame Player API](https://developers.google.com/youtube/iframe_api_reference).

El identificador sólo se entrega después de `authorizeLesson`, salvo muestras gratuitas explícitas de cursos publicados. Nunca se agrega a `lessons`, al temario público ni a la descripción. `lesson_videos.stream_uid` conserva su nombre histórico, pero admite referencias privadas `youtube:<videoId>:<lessonId>`; los valores anteriores siguen siendo IDs de Cloudflare. La referencia por clase permite reutilizar un video sin romper la restricción de unicidad existente. Esta adaptación no requiere migraciones y conserva las políticas RLS de `lesson_videos`. Los procesos externos que lean esa columna deben distinguir el prefijo antes de llamar a Cloudflare.

La duración de una clase con YouTube se carga manualmente. Usar la duración real o dejarla en 0: una duración menor que el video limita la posición guardada por el RPC existente. El estado `ready` de YouTube indica que el enlace se guardó, no que se haya verificado su disponibilidad. La vista previa y el reproductor muestran fallos de inserción; una prueba con el video del propietario sigue siendo necesaria.

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

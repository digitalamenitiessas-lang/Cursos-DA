# Registro de verificación — 29 de septiembre de 2026

## Actualización — 1 de octubre de 2026

- Proyecto publicado en la rama `main` de [digitalamenitiessas-lang/Cursos-DA](https://github.com/digitalamenitiessas-lang/Cursos-DA). Primer commit: `c085e86`.
- Verificación previa a la publicación: TypeScript sin errores, 21 pruebas aprobadas y formato correcto.
- `.env.local` permanece excluido de Git; `.env.example` contiene únicamente nombres de variables y valores de ejemplo sin credenciales.
- Continúan pendientes la configuración y las pruebas de Supabase, Mercado Pago, Cloudflare Stream y el despliegue Vercel descritas abajo. El registro del 29 de septiembre conserva el estado de aquella entrega local.

## Digital Amenities Studio — 1 de octubre de 2026

- Nuevo espacio administrativo con navegación lateral, sección activa y menú móvil; resumen con Dither Veil y Spotlight Card adaptados de React Bits, licencia preservada e ilustración local.
- Cursos con búsqueda por título, estado, tarjetas y recuentos de módulos/clases; formulario de tres pasos, dirección automática editable, vista previa y creación inicial como borrador. Editor con accesos a información, temario y portada/publicación, indicadores de preparación y selección/arrastre de archivos.
- Configuración de servicios muestra únicamente disponibilidad de variables; nunca sus valores ni un supuesto resultado de pruebas reales.
- TypeScript, formato y compilación de producción aprobados. Las 21 pruebas de código pasaron. El archivo consolidado `supabase/setup.sql` se aplicó desde cero en PostgreSQL local y superó las 70 aserciones de seguridad.
- Revisión visual usando `/studio-preview`: validación antes de avanzar, campos conservados, URL generada con acentos normalizados, vista previa de precio y envío bloqueado con retorno al paso incompleto. Editor móvil de 384 px sin desborde horizontal; navegación plegable revisada. Sin errores del efecto WebGL en consola durante la revisión.
- La vista de diseño no guarda cursos ni transfiere archivos, no muestra datos administrativos y responde 404 en producción. `/admin` sin sesión redirigió al ingreso en la prueba de navegador.
- Con las credenciales del propietario, Supabase Auth respondió y no informó usuarios; las consultas a `courses`, `user_roles`, `lesson_videos` y `resources` respondieron 404 por esquema pendiente. Falta ejecutar el SQL inicial en el proyecto real, registrar/verificar la cuenta y habilitar el primer administrador. No se probaron CRUD, cargas ni pagos contra esos servicios.

## Ejecutado localmente

### React Bits en el sitio público — 1 de octubre de 2026

- La portada pública utiliza Dither Veil en una ilustración propia, con revelado al mover el cursor y expansión al hacer clic. Se reemplazó el Canvas geométrico de esta ruta; la narrativa mantiene el scroll nativo.
- Las tarjetas compartidas por portada y catálogo incorporan Spotlight Card. Los estilos administrativos se limitaron a sus accesos rápidos para evitar que alteren las tarjetas públicas.
- La ilustración permanece disponible sin WebGL o con movimiento reducido. El efecto se carga por separado, limita la frecuencia de renderizado y pausa fuera de vista o con la pestaña oculta.
- Verificación visual en Chrome: escritorio de 1301 px y celular de 390 px, sin desborde horizontal; canvas montado e interacción de clic observada, sin errores de consola. El catálogo conectado estaba vacío, por lo que no se verificó visualmente una tarjeta con un curso real. La alternativa de movimiento reducido se revisó en código.
- TypeScript, formato y compilación de producción aprobados. Estas comprobaciones locales no verifican la configuración de Vercel ni operaciones de compra o administración.

- `npm run typecheck`: TypeScript estricto sin errores.
- `npm test`: **21 pruebas aprobadas**. Firmas webhook válidas/falsificadas, binding de ID/query/body, vencimiento, montos en centavos, moneda, cuenta receptora, entorno, referencias, transiciones de pago y deduplicación; redirects locales y verificación de autorización de videos/muestras, duración de tokens y nombres de archivos.
- `bash supabase/tests/run-local.sh`: **70 aserciones aprobadas en PostgreSQL 17.11**, con las tres migraciones aplicadas desde cero. Crea clúster temporal sólo con socket Unix y lo elimina al terminar. Cubre perfiles aislados, roles inmutables, accesos no comprados, escritura de progreso ajeno rechazada, snapshots de precios, duplicados/eventos atrasados, pendiente→aprobado, devolución, contracargo, reembolso parcial, permisos independientes, preservación de accesos al archivar, reordenamiento y guardado atómico de completado frente a autosaves atrasados.
- `npm run build`: compilación de producción Next.js 16.3.7 con Webpack completada, con todas las rutas de aula/administración dinámicas. Turbopack de producción falló por restricciones del entorno al crear procesos; se eligió el compilador Webpack soportado. Desarrollo continúa usando Turbopack.
- Dependencias instaladas y lockfile generado; auditoría npm al instalar: cero vulnerabilidades reportadas.
- Revisión en navegador local: portada, recorrido que cambia con scroll y botones, navegación al catálogo, búsqueda sin resultados, limpieza, filtro de categoría y detalle. Viewports reales leídos del DOM: 1846 px y 384 px; sin desborde horizontal en la portada móvil.
- La nueva portada tiene fondo Canvas geométrico que responde al cursor y al scroll, limitado a aproximadamente 30 FPS, y se detiene al salir de vista, al ocultar la pestaña y con `prefers-reduced-motion`. La sección narrativa conserva scroll nativo y ofrece controles de teclado. La preferencia de movimiento reducido fue revisada en código, no modificando la configuración del usuario.

El navegador muestra el catálogo ficticio explícitamente señalado para desarrollo. La compra está desactivada en esa vista. No hay sesiones, pagos ni accesos privados simulados.

## Pendiente de los recursos del propietario

- Aplicar migraciones al proyecto real Supabase y probar su API, JWT, Auth, SMTP y Storage. El ensayo PostgreSQL usa interfaces mínimas locales de Auth/Storage; no certifica sus servicios alojados.
- Crear/verificar el primer usuario y promoverlo con el procedimiento documentado; probar los formularios administrativos con esa sesión.
- Checkout real de prueba, webhook firmado real, conciliación con la cuenta Mercado Pago y reflejo de devoluciones/contracargos.
- Carga y procesamiento de un video real, propiedad `requireSignedURLs`, dominios, reproducción/renovación y progreso en el reproductor Cloudflare.
- Subida real de portada/material, finalización y descarga firmada desde Supabase Storage.
- Repositorio GitHub remoto, despliegue Vercel y dominio final. Se inicializó Git local; no se publicó código fuera del equipo.

## Límites operativos documentados

- La conciliación predeterminada es diaria y procesa seis órdenes por ejecución. Ajustar a cinco minutos y validar capacidad para volumen de producción.
- Un token de video emitido sigue siendo válido hasta su vencimiento tras una revocación. Las nuevas solicitudes quedan bloqueadas.
- Videos reemplazados y archivos subidos sin finalizar se conservan para evitar borrados irreversibles; su limpieza requiere revisión administrativa.
- El administrador revisa reembolsos parciales. No se emiten reembolsos desde la academia ni se inventan comisiones/neto.

Ver [despliegue](deployment.md) para los pasos de prueba integral antes de abrir ventas.

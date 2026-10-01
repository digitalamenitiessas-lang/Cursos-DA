# Registro de verificación — 29 de septiembre de 2026

## Ejecutado localmente

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

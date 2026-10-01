# Administración de la academia

El panel está en `/admin`. Todas sus páginas verifican sesión, correo verificado y rol mediante `requireAdmin`; cada acción y endpoint repite la comprobación. La asignación del primer administrador se realiza con el procedimiento de servidor documentado en la guía de Supabase. El registro público nunca acepta un rol.

## Cursos y contenido

- En **Cursos → Crear curso** se guarda título, URL, descripción, objetivos, requisitos, nivel, instructor, precio ARS y estado. Los precios se convierten en centavos enteros y se validan también en el servidor.
- Publicado permite la venta. Borrador permite trabajar sin aparecer en el catálogo. Archivado retira el curso de la venta y conserva contenido, progreso y accesos anteriores.
- Cada módulo y clase se guarda por separado. Las flechas cambian el orden mediante una transacción que verifica el conjunto completo de IDs. No hay límite de clases impuesto por la aplicación; los listados internos se leen por páginas para superar el límite de respuesta por defecto de Supabase.
- No se ofrece eliminación irreversible de contenido vendido.
- Una clase puede habilitarse como muestra pública; la casilla explica que su video queda disponible sin compra.
- Las portadas y materiales se transfieren desde el navegador a Supabase Storage con una autorización temporal; el backend confirma que el archivo existe antes de guardar la portada o el recurso. Los videos viajan directamente a Cloudflare Stream mediante TUS, con progreso y reintentos. No pasan por el servidor de Next.js.
- El panel consulta el estado del video cada 12 segundos durante el procesamiento. Mantener abierta la página hasta que termine la carga; después, el procesamiento continúa en Cloudflare. Hay actualización manual del estado.

## Alumnos y auditoría

El listado permite buscar por correo y paginar. Para una beca o cortesía, seleccionar alumno y curso publicado o archivado y escribir un motivo de 5 a 1000 caracteres. Un acceso manual es independiente de cualquier compra. Dar o revocar un permiso utiliza una función transaccional disponible solo para la clave de servicio y valida nuevamente que el actor sea administrador.

La revocación requiere motivo y confirmación. Solo opera sobre el permiso manual seleccionado. Otro permiso activo mantiene el acceso. Los accesos originados en pagos se gestionan por los estados verificados de Mercado Pago y los reembolsos se realizan en el proveedor. Se muestran las últimas 20 altas/revocaciones con motivo, actor, permiso y fecha; el historial completo permanece en `audit_logs`.

## Pagos

Filtros: fechas, curso, correo del alumno y estado. La fecha corresponde a `payments.created_at` (primera recepción local del pago); se usa zona horaria argentina para los límites de día. Cada fila representa un ID único de pago del proveedor. La paginación muestra 40 pagos por página. Se muestran importe original y reembolso sin calcular ganancias netas.

**Conciliar pagos** llama al backend para volver a consultar estados reales en Mercado Pago. El resultado informa órdenes revisadas y errores; si quedan más, puede repetirse. Los reembolsos parciales se identifican para revisión y suspenden el permiso originado por ese pago, sin afectar permisos independientes.

## Definiciones de métricas

Todas son acumuladas, sin filtro de período en el resumen:

| Métrica                     | Definición                                                                                                                                                             |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Alumnos registrados         | Cantidad de usuarios con rol `student`; excluye administradores.                                                                                                       |
| Alumnos con acceso          | Alumnos distintos con al menos un `access_grants.status = active`.                                                                                                     |
| Ventas aprobadas históricas | Cantidad de pagos únicos con `approved_at` informado. Una notificación repetida no duplica un ID de pago. Incluye pagos posteriormente reembolsados o con contracargo. |
| Importe bruto cobrado       | Suma de `amount_cents` de esos pagos. Es bruto histórico, antes de reembolsos y comisiones; no es beneficio ni saldo neto.                                             |
| Importe reembolsado         | Suma actual de `refunded_cents` de todos los pagos. Incluye parciales. Los contracargos se distinguen por su estado en Pagos.                                          |
| Cursos más vendidos         | Orden por cantidad histórica de pagos aprobados; el importe es bruto histórico.                                                                                        |
| Progreso promedio           | Promedio de clases completadas / clases actuales por pareja única alumno–curso con acceso activo y al menos una clase. Incluye alumnos que no comenzaron.              |
| Finalización                | Parejas alumno–curso anteriores con todas las clases actuales completadas.                                                                                             |
| Accesos manuales activos    | Parejas alumno–curso con un permiso manual activo. No se contabilizan como ventas.                                                                                     |

El resumen lee en páginas para no truncar métricas a 1000 filas. Las métricas se calculan en el servidor y no envían filas privadas al navegador. A mayor volumen puede reemplazarse la agregación en memoria por vistas SQL/RPC manteniendo estas definiciones. Como son varias consultas, no constituyen un cierre contable transaccional.

## Validación y configuración pendiente

Se verificó TypeScript con `npm run typecheck`. Las consultas, RLS, RPC, transferencias, publicaciones y conciliación deben probarse con Supabase/Cloudflare/Mercado Pago configurados: no se ejecutaron operaciones reales sin credenciales. La guía principal describe cómo aplicar migraciones y configurar los proveedores. Pruebas recomendadas para el panel:

1. Un alumno o visitante no puede invocar acciones administrativas ni cambiar cursos, precios o permisos por acceso directo.
2. Crear borrador, módulo y clases; mover arriba/abajo; subir portada, video y PDF; esperar procesamiento y publicar.
3. Archivar un curso comprado: desaparece de venta, el alumno conserva su aula.
4. Otorgar y revocar una beca con motivo; verificar auditoría y que otro permiso independiente siga activo.
5. Verificar filtros de fecha argentina y revisar un reembolso parcial desde Pagos.
6. Comparar métricas con un conjunto conocido de pagos aprobados, reembolsados, repetidos y permisos manuales.

## Digital Amenities Studio

El panel tiene navegación lateral con sección activa y menú plegable en celular. El resumen conserva las métricas reales e incorpora accesos rápidos. La gestión de cursos usa tarjetas con módulos/clases, búsqueda por título y filtro por estado. El formulario separa presentación, aprendizaje y venta, genera una URL editable y conserva los campos al cambiar de paso; los nuevos cursos comienzan como borradores.

El editor permite ir directamente a información, temario/archivos y portada/publicación. La lista de preparación muestra portada, clases y videos listos sin presentar estos indicadores como una validación del proveedor. Las cargas permiten elegir o arrastrar archivos, muestran nombre/tamaño y mantienen confirmación, progreso y estado de procesamiento.

`/admin/configuracion` muestra la disponibilidad de configuración de los servicios sin exponer sus credenciales. No sustituye las pruebas integrales.

Dither Veil y Spotlight Card fueron adaptados del código oficial de [React Bits](https://reactbits.dev/), con su licencia preservada en `src/components/react-bits/LICENSE.md`. El efecto visual se limita a una pieza del resumen, usa una ilustración SVG local, pausa al ocultar la pestaña y al salir de vista, y tiene alternativa estática para movimiento reducido o falta de WebGL. Los formularios mantienen validación en el servidor y requieren un administrador confirmado.

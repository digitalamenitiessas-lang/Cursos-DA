# Plataforma de formación y recursos de Digital Amenities

## Estado actual — 4 de octubre de 2026

Se conserva el stack Next.js, React, TypeScript, Supabase, Mercado Pago y Cloudflare Stream, con YouTube como opción principal para vincular videos de clases. El repositorio tiene catálogo de cursos, administración de cursos/módulos/clases, compra, verificación de pagos desde el proveedor, accesos, reproducción de YouTube dentro del aula, video firmado con Stream como alternativa, materiales de clase con URLs firmadas y progreso. YouTube oculto no ofrece exclusividad de reproducción: cualquiera con el enlace puede verlo. La existencia de la implementación no certifica que los servicios externos estén configurados o probados en producción.

Esta etapa aplica la orientación comercial al diseño y a los contenidos, manteniendo la prioridad indicada por el propietario: primero diseño, después verificación funcional y ajustes.

## Aplicado

- Propuesta orientada a IA aplicada, desarrollo web, automatizaciones y herramientas para el trabajo.
- Jerarquía de inicio: cursos, objetivos del visitante, recursos, explicación de compra/aprendizaje, información sobre certificados y servicios de Digital Amenities.
- Navegación pública y menú móvil con Inicio, Cursos, Recursos digitales, Soluciones para empresas y acceso a la cuenta.
- Recorridos enlazados a filtros reales del catálogo. Categorías existentes preservadas; cuatro categorías sugeridas y ampliables desde el editor de cursos existente.
- Páginas de presentación de recursos y servicios, sin productos de ejemplo ni precios inventados. Formulario de consulta deshabilitado con estado explícito de preparación.
- Mis recursos y Mis certificados dentro del área protegida existente, con información explícita sobre funcionalidades pendientes.
- Ejemplos de cursos mantenidos como borradores y fuera del catálogo público.
- Textos más directos en catálogo, detalle, acceso y aula. Sin testimonios, métricas o avales inventados.

## Ampliación funcional pendiente

| Área                 | Trabajo necesario                                                                                                                                  |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cursos               | Agregar público, resultado/proyecto, modalidad, materiales incluidos y condiciones de acceso como campos administrables compatibles.               |
| Categorías           | Tabla y gestión central de categorías ampliables, preservando las categorías de cursos existentes y sus relaciones.                                |
| Recursos             | Productos, vistas previas, formatos, edición, herramientas, licencia, precio, archivos privados y relaciones con cursos.                           |
| Compra de recursos   | Extender snapshots, órdenes y accesos de forma compatible; reutilizar firma, validación, deduplicación y reversión ante reembolso de Mercado Pago. |
| Mis recursos         | Leer compras con acceso vigente y generar descargas autorizadas desde el servidor con URLs breves.                                                 |
| Certificados         | Configuración por curso, condiciones verificadas en servidor, emisión idempotente con UUID y datos de emisión inmutables.                          |
| Actividades          | La aprobación debe proceder de una evaluación o revisión real; mirar una clase no equivale a aprobar.                                              |
| Verificación pública | Página por identificador que muestre solo alumno, curso, emisor y fecha; sin correo, perfil ni datos de cuenta.                                    |
| Consultas            | Guardado de nombre, correo, empresa opcional y necesidad; validación, protección contra abuso, RLS y gestión administrativa de estados.            |
| Administración       | Gestión de productos/archivos, certificados, consultas, categorías y contenidos destacados; separar métricas de ventas según producto real.        |

Las migraciones deberán ser aditivas y no destructivas. Los recursos pagos no deben reutilizar enlaces públicos de portadas ni confundir la tabla actual de materiales de clase (`resources`) con productos independientes. La implementación existente de pagos está vinculada a `course_id`: ampliarla requiere adaptar transacciones y permisos, no solo agregar un botón.

## Validación futura

Aplicar las migraciones en un entorno de prueba con los servicios del propietario y verificar compra confirmada desde backend, acceso, devoluciones, descargas autorizadas/denegadas, progreso, requisitos y emisión única de certificados, privacidad de verificación pública y consultas administrativas. No modificar producción sin distinguir pruebas y datos reales.

La inspección visual en navegador sigue pendiente: en la sesión anterior se rechazó el permiso de acceso local y no se intentó eludir esa restricción. Las verificaciones de esta entrega son compilación, TypeScript y formato; no una certificación de funcionamiento externo.

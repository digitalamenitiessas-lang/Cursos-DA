# Diseño de Digital Amenities

Referencia elegida: [AgentQL — Refero Styles](https://styles.refero.design/style/d5307f56-76de-4d13-9741-f969c42e9aa5). Adaptación aplicada el 4 de octubre de 2026.

## Dirección visual

Una academia digital con fondo oscuro, tipografía clara y espacio para respirar. Conservamos la identidad, el contenido y los recorridos de Digital Amenities. La referencia aporta el sistema visual: superficies azul oscuro, bordes finos, botones blancos y luz ambiental violeta y rosa en la portada.

La orientación comercial es formación práctica para profesiones, trabajo y negocios. Los cursos son la línea principal; los recursos digitales complementan la formación; las soluciones a medida presentan los servicios de la empresa.

La portada usa una pieza gráfica propia con el monograma de Digital Amenities, una retícula discreta y una hoja de trabajo en tono papel. Se eliminaron el código ficticio y los controles decorativos del aula. La tipografía, los números de sección y los recorridos en filas aportan jerarquía sin repetir una grilla de tarjetas en cada bloque.

Los títulos y textos explican tareas concretas. No se inventan alumnos, clientes, testimonios, productos, avales ni resultados. Los ejemplos de cursos permanecen como borradores y se excluyen de los catálogos públicos, incluso en desarrollo.

## Colores

| Uso                   | Token                       | Valor     |
| --------------------- | --------------------------- | --------- |
| Fondo                 | `--background`              | `#0b0c0e` |
| Tarjetas y paneles    | `--surface`                 | `#0e111b` |
| Superficies elevadas  | `--surface-raised`          | `#0d172b` |
| Selección y énfasis   | `--surface-highlight`       | `#12244f` |
| Texto principal y CTA | `--foreground`, `--primary` | `#ffffff` |
| Texto sobre CTA       | `--primary-foreground`      | `#050606` |
| Texto secundario      | `--muted`                   | `#abaebb` |
| Descripciones         | —                           | `#c7c9d1` |
| Bordes                | `--border`                  | `#172540` |
| Bordes destacados     | —                           | `#24375a` |
| Acento y foco         | `--accent`                  | `#85a6e9` |

La portada usa una luz violeta muy tenue y reserva los acentos azules para el monograma y pequeños detalles. Las hojas de trabajo usan `#e8e7e2` sobre el fondo oscuro. Los CTA principales son blancos; los enlaces secundarios se presentan como texto claro con una flecha, sin degradados.

## Tipografía y formas

- Inter para texto, navegación, formularios y botones; pesos 300–500.
- Figtree para títulos; peso 500, tracking de `-0.02em` y altura compacta.
- IBM Plex Mono para índices, notas y detalles numéricos decorativos; no se usa código de programación como mensaje comercial.
- Fuentes descargadas en compilación y servidas por Next.js desde el propio sitio.
- Botones y categorías en forma de píldora; tarjetas con radio de 12 px y campos de 8 px.
- Contenedor de hasta 1200 px, secciones con aproximadamente 80 px de separación y tarjetas con 24 px de padding.

## Comportamiento y adaptación

La portada pasa de dos columnas a una en celular. El menú móvil nativo conserva Inicio, Cursos, Recursos digitales, Soluciones para empresas y la cuenta. Los cuatro recorridos llevan al catálogo con un filtro por objetivo que acepta las categorías anteriores y las sugeridas; la búsqueda ignora acentos.

La explicación de compra y acceso se muestra como tres pasos visibles. Se reemplazó la sección fijada de más de dos pantallas por contenido de lectura directa, sin exigir scroll para descubrir cómo funciona. Se mantiene el enlace `#metodo`.

Las piezas gráficas se renderizan sin JavaScript de cliente ni WebGL. Las tarjetas usan cambios discretos de borde y elevación al pasar el cursor. Los estados vacíos explican si todavía no hay contenido publicado. Los enlaces y campos mantienen foco visible; las transiciones se desactivan con movimiento reducido.

## Alcance comercial de esta etapa

La prioridad de esta sesión es cerrar diseño y contenido, según el orden solicitado anteriormente. La página de recursos presenta las familias de materiales, sin inventar productos o precios. Soluciones para empresas presenta servicios y un formulario deshabilitado que informa que no recibe envíos. Mis recursos y Mis certificados muestran estados honestos de preparación dentro de la cuenta protegida existente.

No se implementaron todavía venta independiente de recursos, archivos privados comprados, emisión/verificación de certificados, evaluaciones, consultas persistidas ni nuevas tablas. Ver [platform-scope.md](platform-scope.md) para el alcance pendiente y [platform-brief.md](platform-brief.md) para el documento del propietario. Compra y acceso a cursos, reproducción, progreso y administración existente conservan su implementación.

## Estado de verificación

Compilación de producción y TypeScript aprobados. La inspección visual en navegador, incluyendo desbordes y espaciado en tamaños reales, queda pendiente: el navegador rechazó el permiso para abrir la vista local durante esta sesión. Las pruebas funcionales de pagos, sesiones y cargas se realizarán en la etapa posterior solicitada.

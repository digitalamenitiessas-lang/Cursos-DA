# Mercado Pago: configuración, flujo y pruebas

Esta integración utiliza **Checkout Pro con Preferences API**. El servidor crea preferencias en `/checkout/preferences` y verifica pagos en `/v1/payments/{id}`. No utiliza la alternativa Orders API de Mercado Pago. Los pagos reales no se simulan en modo demo.

## Configuración

1. Creá una aplicación de Checkout Pro en **Tus integraciones** de Mercado Pago, con país Argentina. Separá credenciales de prueba y producción.
2. Configurá `MP_ACCESS_TOKEN`, `MP_COLLECTOR_ID` (ID numérico de la cuenta vendedora), `MP_LIVE_MODE=false` para pruebas o `true` para producción y `MP_WEBHOOK_SECRET`. Son variables exclusivas del servidor; ninguna lleva prefijo `NEXT_PUBLIC_`.
3. Usá `NEXT_PUBLIC_APP_URL=https://tu-dominio` con un dominio público HTTPS, también durante pruebas mediante un túnel. El retorno y las notificaciones se construyen desde esta URL configurada; nunca desde el encabezado Host enviado por el navegador.
4. En Webhooks registrá `https://tu-dominio/api/webhooks/mercadopago` y seleccioná **Pagos**. Copiá la firma secreta a `MP_WEBHOOK_SECRET`. La preferencia también fija `notification_url` con `source_news=webhooks`. No habilites IPN para este endpoint.
5. Configurá `CRON_SECRET` aleatorio de al menos 24 caracteres. El scheduler debe enviar `Authorization: Bearer <CRON_SECRET>` a `GET /api/cron/reconcile`. Vercel agrega ese encabezado al configurar la variable `CRON_SECRET`.

Verificá que token, vendedor, firma y `MP_LIVE_MODE` pertenezcan al mismo ambiente. La integración rechaza pagos de otra cuenta o ambiente. Para probar Checkout Pro usá los usuarios y medios de prueba indicados por Mercado Pago, con comprador distinto del vendedor. No utilices medios reales en pruebas.

## Contratos HTTP

- `POST /api/checkout`, sesión con correo confirmado y mismo origen. Body estricto `{ "courseId": "uuid" }`. Devuelve `{ "orderId": "uuid", "checkoutUrl": "https://…mercadopago…" }`. Cualquier campo adicional, incluido un monto, se rechaza. Si otra solicitud ya está preparando la misma preferencia devuelve 409 y `Retry-After: 5`.
- `GET /api/orders/{id}`, autenticado, sólo para el dueño de la orden. Devuelve `{ order: { id, status, amount_cents, currency, course_id, created_at }, hasAccess }`. Las respuestas privadas tienen `Cache-Control: no-store`.
- `POST /api/webhooks/mercadopago?data.id=<payment-id>&type=payment`. Requiere cuerpo con `type=payment`, `data.id` y encabezados auténticos `x-signature` y `x-request-id`.
- `GET /api/cron/reconcile` requiere el secreto del cron. `POST` al mismo endpoint acepta ese secreto o sesión de administrador y mismo origen, con body `{}` o `{ "orderId": "uuid" }`. Devuelve resultados y `hasMore`; 207 indica fallos parciales que deben revisarse y reintentarse.

El retorno de checkout siempre es `/pago/resultado?order=<uuid>`. **Visitar esta página o modificar sus parámetros no habilita el curso**: la interfaz consulta el estado interno verificado. No se confía en `status`, `payment_id`, `collection_status` ni otro parámetro de retorno.

## Persistencia y concurrencia

`create_checkout_order` toma el precio desde PostgreSQL, bloquea por alumno/curso y conserva importe/moneda de la orden pendiente. Rechaza si ya existe un acceso activo. Los estados pendientes reutilizan la orden; si ya hay un pago pendiente conocido se pide esperar su resolución, evitando un segundo pago accidental. Después de un rechazo o cancelación se puede crear otra compra con el precio vigente.

`reserve_checkout_attempt` bloquea la orden y reserva un intento por UUID del servidor. Una solicitud concurrente no genera otra preferencia; reutiliza el checkout listo o espera. Las preferencias duran una hora. Un intento sin respuesta se puede reemplazar después de dos minutos. Se envía `X-Idempotency-Key` como protección complementaria, pero la exclusión entre solicitudes depende de la reserva en PostgreSQL, porque la documentación de Preferences API no promete la misma semántica de idempotencia que Payments API. Un timeout después de crear una preferencia puede dejar una preferencia huérfana; todas conservan la misma referencia de orden y cada pago se contabiliza por su ID único.

El webhook valida HMAC-SHA256 con comparación constante y une el ID firmado de la URL al ID del cuerpo. Rechaza encabezados ambiguos, IDs no canónicos y firmas con más de cinco minutos de antigüedad o del futuro. Admite timestamps en segundos y milisegundos, presentes en ejemplos oficiales. Un reintento legítimo que mantenga una firma antigua puede ser rechazado; la conciliación recupera el estado directamente desde Mercado Pago.

Después se consulta la API y se verifica ID de pago, referencia exacta de orden, centavos exactos sin redondeos, moneda ARS, cuenta receptora y ambiente. Sólo el RPC privilegiado `apply_verified_payment` aplica el resultado, el evento y el permiso en una transacción. Los eventos repetidos son idempotentes; versiones anteriores no revierten versiones posteriores. Los pagos reembolsados, con contracargo o reembolso parcial no vuelven a habilitar acceso mediante notificaciones tardías de aprobación.

Cada pago tiene su permiso independiente. Un reembolso/contracargo revoca exclusivamente el permiso de ese pago. Un acceso manual u otro pago aprobado sigue siendo válido. Un reembolso parcial se guarda como `partial_refund`, revoca conservadoramente ese permiso y queda para revisión del administrador. Una mediación (`in_mediation`) también suspende ese permiso; una resolución posterior aprobada y más reciente puede restaurarlo. Los reembolsos se hacen en Mercado Pago.

## Conciliación y operación

La conciliación busca por referencia interna, obtiene cada pago por ID y reutiliza exactamente la validación del webhook. Revisa todos los estados, incluidas ventas antiguas aprobadas, para recuperar devoluciones o aprobaciones tardías. No limita las devoluciones a una ventana arbitraria de días.

Cada ejecución toma hasta seis órdenes de la cola que lleva más tiempo sin revisarse, excluyendo las revisadas en los últimos cinco minutos. El cursor `orders.reconcile_offset` persiste el avance entre páginas; `reconciled_at` rota la cola incluso si una orden falla. La ejecución reserva 42 segundos para trabajo y tiempo adicional para el último request y persistencia. Programá ejecuciones frecuentes en un plan que lo permita y vigilá el tamaño de la cola: con cientos de compras puede necesitarse mayor frecuencia o un worker dedicado. Una ejecución manual por orden permite atención inmediata. No desactives la conciliación por recibir normalmente los webhooks.

Los diagnósticos contienen IDs internos, ID de pago, código de causa y, cuando corresponde, código HTTP del proveedor. No guardan tokens, firmas, datos de tarjeta, documento, nombre ni correo del pagador. Los eventos en PostgreSQL son visibles sólo para administración. Los errores transitorios del webhook devuelven error para que Mercado Pago reintente. Alertá sobre respuestas 5xx, `verification_failed`, `diagnostic_write_failed` y conciliaciones 207.

## Validación antes de producción

Ejecutá `npm test`, `npm run typecheck` y las pruebas SQL documentadas en la guía de Supabase. Las pruebas locales de seguridad cubren firma falsa/replay, alteración del ID firmado, centavos, referencia, moneda, vendedor, ambiente y estados financieros. Las pruebas transaccionales verifican deduplicación, orden de eventos, aprobación posterior de un pendiente y revocación independiente.

Con credenciales de prueba y un dominio HTTPS, verificá además el flujo extremo a extremo:

1. Registrá dos alumnos y confirmá sus correos. Sólo el comprador puede leer su orden; una consulta directa desde el otro usuario debe fallar.
2. Comprá un curso publicado: la orden/preferencia deben conservar exactamente su precio. Agregar `amount` al request debe producir 400. Volver a comprar con acceso activo debe producir 409.
3. Probá aprobación, rechazo y pendiente con los medios de prueba oficiales. Mientras siga pendiente la pantalla debe decir que se está confirmando y el aula debe seguir cerrada.
4. Reenviá el mismo webhook desde Mercado Pago y comprobá una sola fila por `provider_payment_id` y un solo permiso por pago. Enviá una firma modificada: debe rechazarse.
5. Desactivá temporalmente la entrega de una notificación en el entorno de prueba y ejecutá conciliación. El estado debe recuperarse desde la API.
6. Hacé reembolso total/parcial desde Mercado Pago y verificá el cambio de estado y acceso. Verificá también que un permiso manual independiente siga vigente. Los contracargos se cubren con las pruebas SQL y deben verificarse con los mecanismos de prueba disponibles de la cuenta, sin generar disputas reales.
7. Revisá los eventos, RLS, variables de producción, restricciones del proveedor y frecuencia del cron antes de habilitar ventas.

Sin credenciales y servicios externos configurados, las pruebas locales no demuestran que la cuenta de Mercado Pago ni el webhook público funcionen. No se realizaron cobros reales como parte de la implementación.

## Fuentes oficiales consultadas

- [Preferences API: crear preferencia](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro-preferences/create-preference/post).
- [Obtener el estado autoritativo de un pago](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro-preferences/get-payment/get).
- [Buscar pagos por referencia](https://www.mercadopago.com.ar/developers/en/reference/online-payments/checkout-pro-preferences/search-payments/get).
- [Webhooks de Checkout Pro](https://www.mercadopago.com.mx/developers/es/docs/checkout-pro-preferences/additional-content/notifications/webhooks).
- [Esquema oficial de firma y notificaciones](https://github.com/mercadopago/openapi/blob/main/schemas/webhooks.yaml).

Documentación consultada el 29 de septiembre de 2026.

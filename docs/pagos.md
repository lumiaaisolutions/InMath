# Pagos — capa configurable de procesadores

El procesador se elige con la configuración `procesador_pago_activo`
(`stripe` | `conekta` | `mercadopago` | `simulado`) sin tocar código. Toda la
mecánica del embudo ya funciona con el driver `simulado`:

1. El bot detecta intención de pago (`accion: listo_para_pago`) → crea el pago,
   genera el link con el procesador activo y lo envía **dentro del chat**.
   Reutiliza el link pendiente si ya existía (no duplica cobros).
2. El procesador confirma vía webhook `POST /api/webhooks/pago/{procesador}`
   (sin API key: la autenticidad la valida el driver con la firma del procesador).
3. Confirmado el pago: alumno inscrito + prospecto a `inscrito`, en una transacción
   idempotente.
4. Carritos abandonados: `GET /api/pagos/abandonados` (umbral configurable
   `recuperacion_carrito_horas`) + flujo 07 de n8n → recordatorio por WhatsApp y
   marca `recordatorio_enviado_en` (un solo recordatorio por pago).

## Estado: MercadoPago elegido — driver real implementado, falta credenciales

El cliente eligió **MercadoPago**. `App\Pagos\DriverMercadoPago` ya implementa la
interfaz completa (`crearLink`, `verificarWebhook`) contra la documentación oficial
vigente al integrar (mercadopago.com.mx/developers, Checkout Pro — verificada en
vivo, no escrita de memoria):

- **Crear preferencia:** `POST https://api.mercadopago.com/checkout/preferences`
  con `Authorization: Bearer {access_token}`. La respuesta trae `init_point` (URL
  de pago) e `id` (referencia externa que se guarda en `pagos.referencia_externa`).
- **Webhook:** MercadoPago llama a `notification_url` con `{type, data:{id}}` y dos
  headers de firma: `x-signature` (formato `ts=...,v1=...`) y `x-request-id`. Se
  valida armando el manifest `id:{data.id en minúsculas};request-id:{x-request-id};ts:{ts};`,
  calculando HMAC-SHA256 con el secreto del webhook y comparando en tiempo
  constante contra `v1`. El cuerpo del webhook **no se usa directamente** para
  decidir el estado del pago (MercadoPago lo documenta como no confiable por sí
  solo) — el driver re-consulta `GET /v1/payments/{id}` antes de aplicar el evento.

**Para activarlo en producción** (todavía en `simulado` a propósito, ver abajo):

1. Obtener `MERCADOPAGO_ACCESS_TOKEN` (credenciales de producción) y
   `MERCADOPAGO_WEBHOOK_SECRET` (Webhooks → Configurar notificaciones) desde el
   panel de desarrolladores de MercadoPago — cuenta del cliente.
2. Ponerlos en `backend/.env` junto con `APP_URL` (URL pública del sitio, sin
   slash final — se usa para armar `notification_url`/`back_urls`).
3. Cambiar la fila `procesador_pago_activo` en la tabla `configuraciones` de
   `simulado` a `mercadopago`.

**Por qué sigue en `simulado` por ahora:** la integración de WhatsApp Business
Cloud API (Meta) todavía está pendiente — sin eso el bot no recibe/envía mensajes
reales, así que activar MercadoPago sin credenciales solo generaría un error si
alguien intentara pagar. El código ya está listo; falta el paso 1–3 de arriba
cuando el cliente tenga las credenciales a la mano.

### Candidatos no elegidos (quedan como esqueleto `DriverPendiente`)

| | Stripe | Conekta |
|---|---|---|
| Link de pago | Checkout Session (URL) | Checkout / Payment Link |
| Webhook | firma HMAC en header | validar re-consultando la orden |
| Credenciales | secret key + webhook signing secret | private key |

Si en el futuro se necesita alguno de estos, seguir el mismo principio que se usó
para MercadoPago: **no escribir integración especulativa** — verificar la
documentación oficial vigente al momento de integrar, no de memoria.

Cada driver implementa la interfaz `App\Pagos\ProcesadorPago` (2 métodos:
`crearLink`, `verificarWebhook`); integrar uno son ~100–150 líneas + credenciales en
`.env` + URL del webhook en el dashboard del procesador.

## Driver simulado (desarrollo)

- `procesador_pago_activo = simulado`
- Webhook firmado con HMAC-SHA256: header `X-Firma-Simulada = hmac_sha256(cuerpo, PAGO_WEBHOOK_SECRET)`
- Cuerpo: `{"referencia_externa": "SIM-...", "estado": "pagado|fallido"}`

## Fase 3.2/3.3 — Transferencia con comprobante y credenciales (ago 2026)

- Sin procesador en línea activo, `pago.php` crea un pago `transferencia` y
  muestra los datos bancarios (clave `datos_pago` en configuraciones — AÚN
  PLACEHOLDER) + formulario de comprobante (JPG/PNG/WebP/PDF ≤8MB, mime
  allowlist, autorizado por sesión). Archivo en `backend/storage/comprobantes/`
  (privado; el panel lo sirve con sesión+módulo vía `/comprobante/{id}`).
- Panel → Pagos: "Aprobar e inscribir" (confirmación + guard anti doble
  aprobación) marca pagado, inscribe vía `InscripcionServicio::porPago` y
  genera credenciales del alumno: usuario = su WhatsApp, contraseña temporal
  aleatoria (bcrypt) mostrada al asesor una sola vez.
- MercadoPago: driver listo; faltan credenciales de producción del cliente.

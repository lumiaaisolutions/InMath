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

## Estado: PENDIENTE DE DECISIÓN DEL CLIENTE

Los drivers reales son esqueletos (`DriverPendiente`) hasta que el cliente confirme
el procesador. **No se escribió integración especulativa**: las APIs de pago cambian
y deben verificarse contra la documentación oficial al momento de integrar.

### Plan de integración por candidato (a verificar en docs oficiales vigentes)

| | Stripe | Conekta | MercadoPago |
|---|---|---|---|
| Link de pago | Checkout Session (URL) | Checkout / Payment Link | Preferencia (init_point) |
| Webhook | firma HMAC en header | validar re-consultando la orden | firma x-signature o re-consulta |
| Credenciales | secret key + webhook signing secret | private key | access token |
| Consideración MX | tarjetas int'l, sin OXXO nativo fácil | fuerte en MX (OXXO, SPEI) | muy usado en MX (OXXO, transferencia) |

Recomendación preliminar (a validar con el cliente según sus cuentas bancarias y si
necesita pagos en efectivo): **Conekta o MercadoPago** si el público paga con
OXXO/SPEI — común en estudiantes —; Stripe si predominan tarjetas.

Cada driver implementa la interfaz `App\Pagos\ProcesadorPago` (2 métodos:
`crearLink`, `verificarWebhook`); integrar uno son ~100 líneas + credenciales en
`.env` + URL del webhook en el dashboard del procesador.

## Driver simulado (desarrollo)

- `procesador_pago_activo = simulado`
- Webhook firmado con HMAC-SHA256: header `X-Firma-Simulada = hmac_sha256(cuerpo, PAGO_WEBHOOK_SECRET)`
- Cuerpo: `{"referencia_externa": "SIM-...", "estado": "pagado|fallido"}`

# Corte de n8n al backend Next.js — sin perder mensajes

Las rutas que n8n consume ya existen idénticas en `inmath-next` (mismos paths,
mismo `X-API-Key`, mismos cuerpos JSON): `/api/bot/procesar`,
`/api/citas/por-recordar`, `PATCH /api/citas/{id}`, `/api/pagos/abandonados`,
`PATCH /api/pagos/{id}`, `/api/asesores`, `/api/reportes/generar`,
`/api/reportes/pendientes-envio`, `/api/reportes/{id}/archivo`,
`PATCH /api/reportes/{id}` y `/api/webhooks/pago/{procesador}`.

Por eso el corte es **solo cambiar la URL base** en n8n. Nada del estado vive
en n8n: todo se persiste en la MISMA MySQL, así que no hay migración de datos.

## Procedimiento (ventana de ~2 minutos, sin pérdida)

1. **Desplegar Next en el VPS** (F4) apuntando a la BD de producción y
   verificar `GET /api/asesores` con la API key desde el propio VPS.
2. **Pausar el workflow de mensajes entrantes** en n8n (flujo del webhook de
   WhatsApp). Meta REINTENTA los webhooks no confirmados y además
   `wa_message_id` es UNIQUE en `mensajes`, de modo que cualquier mensaje del
   minuto de pausa llega al reanudar y la ingesta es idempotente — no se
   duplica ni se pierde.
3. **Cambiar la URL base** de los nodos HTTP (variable/credencial de n8n con
   el host del backend) del host PHP al host Next. La API key es la misma.
4. **Reanudar el workflow** y mandar un mensaje de prueba al WhatsApp del
   negocio: debe responder el bot y quedar registrado en `mensajes`.
5. Los flujos de cron (recordatorios de cita, carritos, reportes semanales)
   no necesitan pausa: son lecturas idempotentes; basta cambiarles la URL.
6. **Webhook de MercadoPago**: cuando haya credenciales, `notification_url`
   se genera desde `APP_URL` del Next — no hay nada que cambiar en n8n.

## Rollback

Volver a poner la URL anterior en el paso 3. El PHP sigue vivo hasta F4
(retiro), así que el rollback es inmediato y sin datos perdidos.

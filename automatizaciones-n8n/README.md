# Automatizaciones — n8n (self-hosted)

n8n orquesta los flujos; **todo estado se persiste vía la API del backend**
(ver `docs/api.md`). Los workflows se exportan como JSON a `flujos/` y se versionan
en este repositorio.

## Despliegue (VPS Ubuntu)

```bash
cp .env.example .env   # editar
docker compose up -d
```

n8n queda en `http://<vps>:5678` (poner detrás de un reverse proxy con TLS antes de
conectar el webhook de Meta, que exige HTTPS).

## Flujos (exportados en `flujos/`)

| Flujo | Fase | Disparador |
|---|---|---|
| `01-whatsapp-entrante` — webhook de Meta → `POST /api/bot/procesar` → enviar respuestas | 2 | Webhook |
| `03-cita-google-calendar` — cita creada → evento con Meet → guardar `meet_link` → confirmar por WhatsApp | 3 | Webhook interno (lo dispara el flujo 01 cuando la respuesta trae `cita`) |
| `04-recordatorio-citas` — `GET /api/citas/por-recordar` → plantilla → marcar enviado | 3 | Cron (15 min) |
| `07-carritos-abandonados` — `GET /api/pagos/abandonados` → plantilla → marcar enviado | 4 | Cron (1 h) |
| `08-reportes-semanales` — generar PDFs → descargar → WhatsApp o correo → marcar enviado | 6 | Cron (lunes 08:00) |

Los flujos 02 (calificación), 05 (generar link) y 06 (webhook del procesador) que se
planearon originalmente **quedaron absorbidos por el backend**: la calificación y el
link de pago los resuelve el propio `POST /api/bot/procesar`, y el webhook del
procesador llega directo a `POST /api/webhooks/pago/{procesador}` sin pasar por n8n
(menos piezas móviles y la firma se valida en el mismo lugar que inscribe).

**Nota de estado**: los JSON son estructuralmente válidos pero no se han importado a
una instancia real de n8n (no hay Docker en este entorno) — al desplegarlos, revisar
que las versiones de nodos coincidan con la versión de n8n instalada.

## Variables de entorno que usan los flujos

- `BACKEND_URL`, `BACKEND_API_KEY` — API del backend
- `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_VERIFY_TOKEN` — Cloud API de Meta (Fase 2)
- `GEMINI_API_KEY` — motor conversacional (Fase 2, en `backend/.env`, no en n8n)
- Credenciales de Google Calendar (Fase 3) y de MercadoPago (Fase 4, en `backend/.env`)

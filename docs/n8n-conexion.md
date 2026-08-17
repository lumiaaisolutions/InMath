# n8n — conexión a la API del Next (estado 17-ago-2026)

n8n corre en Docker en el **mismo VPS** (`http://2.24.123.93:5678`, compose en
`/root/n8n-stack/docker-compose.yml`). Es una instancia **compartida** con otros
proyectos de LUMIA (existe un workflow `ClickToDo`), por eso todo aquí usa
variables con prefijo `INMATH_` para no colisionar.

## Lo que quedó conectado

- **Variables de entorno del contenedor n8n** (añadidas al compose, sin tocar las
  de otros proyectos):
  - `INMATH_BACKEND_URL=https://inmath.lumiaaisolutions.com`
  - `INMATH_BACKEND_API_KEY=<la misma X-API-Key del backend>`
  - `INMATH_WHATSAPP_PHONE_ID=` · `INMATH_WHATSAPP_TOKEN=` ·
    `INMATH_WHATSAPP_VERIFY_TOKEN=` (vacíos — placeholders para Meta)
- **Reachability probada**: desde el contenedor n8n, `GET /api/asesores` con la
  API key devuelve los asesores reales. La conexión n8n → Next funciona.
- **5 workflows importados** (INACTIVOS), apuntando ya a la API nueva:
  | Workflow | Qué hace | Para activarlo falta |
  |---|---|---|
  | 01 WhatsApp entrante → bot | recibe mensajes y responde con el motor del bot | **Meta WhatsApp Business Cloud API** (PHONE_ID + TOKEN + verify) |
  | 03 Cita → Google Calendar + Meet | crea el evento y el link de videollamada | **Google OAuth** (credencial en n8n) |
  | 04 Recordatorio de citas (cron 15 min) | consulta `/api/citas/por-recordar` y avisa | **Meta WhatsApp** (envío) |
  | 07 Carritos abandonados (cron 1 h) | consulta `/api/pagos/abandonados` y recuerda | **Meta WhatsApp** (envío) |
  | 08 Reportes semanales (cron lun 08:00) | genera PDFs y los envía | **Meta WhatsApp** o **SMTP** (envío) |

## Por qué están inactivos

El lado de LECTURA (consultar la API del Next) ya funciona. El lado de ENVÍO
—que es donde terminan los 5 flujos— depende de credenciales que el cliente aún
no entrega: la **API de WhatsApp Business de Meta** (decisión pospuesta por el
cliente; hoy se usa wa.me directo + Mathy), **Google OAuth** para el calendario,
y **SMTP** para el correo. Activarlos ahora solo generaría ejecuciones fallidas
en una instancia compartida.

## Cómo activarlos cuando lleguen las credenciales

1. Llenar en el compose de n8n (`/root/n8n-stack/docker-compose.yml`) las vars
   `INMATH_WHATSAPP_PHONE_ID` / `INMATH_WHATSAPP_TOKEN` /
   `INMATH_WHATSAPP_VERIFY_TOKEN` y recrear el contenedor
   (`docker compose up -d n8n`).
2. Para el correo (flujo 08): crear una credencial SMTP en la UI de n8n y
   asignarla al nodo `emailSend`.
3. Para Google Calendar (flujo 03): crear la credencial Google OAuth2 en n8n.
4. Activar cada workflow desde la UI (toggle Active) o
   `n8n update:workflow --id=<id> --active=true`.

Acceso a la UI de n8n: `http://2.24.123.93:5678` (cuenta del dueño). Los ids de
los workflows de Inmath empiezan con `inmath…`.

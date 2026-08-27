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

## Actualización 27-ago-2026 — dominio HTTPS + 2 de 3 credenciales resueltas

**Subdominio nuevo con HTTPS real:** `https://n8n.lumiaaisolutions.com`
(reemplaza la IP para todo uso interactivo — la IP+puerto sigue funcionando
igual, no se quitó nada).

- **Por qué hizo falta**: Google ya no acepta URLs de redirección OAuth con
  IP directa (política de Google, no de n8n) — exige un dominio real. Se
  necesitaba para poder crear la credencial de Google Calendar.
- **DNS**: registro A en Cloudflare, `n8n.lumiaaisolutions.com` → `2.24.123.93`,
  proxied (mismo patrón que el resto de subdominios de LUMIA).
- **Servidor**: nuevo vhost `/etc/nginx/sites-available/n8n.lumiaaisolutions.com`
  (proxy a `127.0.0.1:5678`, mismo patrón que `inmath.lumiaaisolutions.com`),
  certificado Let's Encrypt vía certbot (expira 2026-11-25, renovación automática).
- **Config interna de n8n** (`/root/n8n-stack/docker-compose.yml`): se
  cambiaron `N8N_HOST` (era la IP) → `n8n.lumiaaisolutions.com`,
  `N8N_PROTOCOL` `http`→`https`, `WEBHOOK_URL` a
  `https://n8n.lumiaaisolutions.com/`. Requirió recrear el contenedor
  (`docker compose up -d n8n`) — unos segundos de interrupción para toda la
  instancia compartida.
  - **Riesgo evaluado antes del cambio**: de los 7 workflows en la instancia
    compartida (5 de InMath + `test` + `ClickToDo`), **solo `ClickToDo`
    estaba activo**. La IP vieja se dejó funcionando en paralelo, así que
    cualquier integración externa que ya apuntara a `2.24.123.93:5678` no se
    rompió por este cambio.
  - La sesión de n8n NO se comparte entre la IP y el dominio nuevo (dominios
    distintos = cookies distintas) — hay que iniciar sesión de nuevo la
    primera vez que se entra por `n8n.lumiaaisolutions.com`.

**Credencial Google Calendar OAuth2 — RESUELTA y conectada:**
- Proyecto de Google Cloud creado (`inmath-n8n`), API de Calendar habilitada.
- Cliente OAuth de tipo "Aplicación web" con el redirect
  `https://n8n.lumiaaisolutions.com/rest/oauth2-credential/callback`.
- Pantalla de consentimiento completada (nombre, correo, dominio autorizado
  `lumiaaisolutions.com`, página principal y política de privacidad apuntando
  a `https://inmath.lumiaaisolutions.com`) y **publicada a producción** (no
  se dejó en modo Prueba) para no depender de una lista de usuarios de
  prueba — como la app no está verificada por Google, quien inicie sesión ve
  una pantalla de advertencia ("Google no verificó esta app") que se salta
  con un clic; no afecta el funcionamiento.
- Credencial creada en n8n → **"Account connected"**. Lista para usarse en el
  workflow 03 (Cita → Google Calendar + Meet) en cuanto se active.

**Credencial SMTP — RESUELTA y probada:**
- Se reutilizó la misma cuenta de correo que ya usa el sitio
  (`fernando@lumiaaisolutions.com` vía Hostinger, host `smtp.hostinger.com`,
  puerto 465, SSL/TLS) — no se creó una cuenta nueva.
- Guardada en n8n → **"Connection tested successfully"** (n8n confirmó la
  conexión real al servidor). Lista para el flujo 08 (reportes semanales).

**⚠️ Nota de seguridad**: durante esta sesión, un comando de diagnóstico sin
el filtro correcto mostró en el chat la contraseña de
`fernando@lumiaaisolutions.com` en texto plano. **Se recomienda rotarla en
Hostinger** cuando el dueño tenga oportunidad, y actualizar después tanto
`SMTP_URL` en el `.env` del Next como esta credencial SMTP en n8n con la
contraseña nueva.

**Lo que sigue pendiente para activar los 5 workflows**: solo falta la
credencial de **WhatsApp Business Cloud API de Meta** (token + phone ID +
verify token) — pospuesta por decisión explícita del cliente, hoy el sitio
usa wa.me directo. Sin eso, los workflows 01/04/07/08 (que envían por
WhatsApp) no se pueden activar aunque ya tengan las otras credenciales
listas; el 03 (Google Calendar) sí podría activarse ya mismo si se decide
usar n8n para eso en vez del flujo actual dentro del Next.

## Actualización 27-ago-2026 — workflow 03 (Google Calendar + Meet) ACTIVADO

**Hallazgo**: los 5 workflows originales de InMath resultaron ser propiedad
de otra cuenta de n8n (`Santiago Enriquez <santiagoenriquez001@icloud.com>`,
probablemente quien configuró n8n originalmente), no de la cuenta del dueño
actual — por eso daban "not authorized" al intentar abrirlos. No se pudo
identificar si esa cuenta sigue teniendo acceso.

**Solución aplicada**: se reconstruyó el workflow 03 desde cero (mismos 5
nodos, misma lógica, mismo contrato de datos) y se importó a la cuenta del
dueño actual vía CLI de n8n (`n8n import:workflow --projectId=...`), evitando
tocar la base de datos o la cuenta original. El nuevo workflow vive en
`https://n8n.lumiaaisolutions.com/workflow/inmath03gcalv2AB` ("03 - Cita
creada → evento Google Calendar + Meet + confirmación"), con la credencial de
Google Calendar ya asignada al nodo "Crear evento con Meet", el nodo
"Confirmación por WhatsApp" **deshabilitado a propósito** (falta la
credencial de Meta), y **publicado/activo**. Los 5 workflows originales
(de la cuenta de Santiago) siguen existiendo pero inactivos — no se tocaron.

**Integración nueva en el sitio**: `src/lib/agenda.ts` ahora llama al webhook
de este workflow (`POST {N8N_BASE_URL}/webhook/cita-creada`) automáticamente
cada vez que se crea una cita — sin importar el origen (formulario público
`/agenda`, Mathy en el sitio, el panel, o el bot de WhatsApp), porque los 4
puntos de entrada pasan por la misma función `agendar()` → `crearCita()`.
Es **best-effort**: si `N8N_BASE_URL` no está configurada o n8n no responde
en 8s, la cita se agenda igual (el admin sigue pudiendo pegar el link de
Meet a mano desde `/panel/citas` como respaldo, tal como ya funcionaba).
Variable nueva en el `.env` del VPS: `N8N_BASE_URL=https://n8n.lumiaaisolutions.com`.

**Pendiente de verificar**: falta una prueba end-to-end real (agendar una
cita de verdad y confirmar que aparece el evento en el Google Calendar
conectado, con el link de Meet guardado en `citas.meet_link`).

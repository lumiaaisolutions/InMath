# Portal del alumno + pago con tarjeta (Fases 3 y 4) — 19-ago-2026

Desarrollado en local (aún NO desplegado a producción por indicación del dueño).
Build limpio y verificado end-to-end con Playwright (emulación iPhone 13) contra
un servidor de desarrollo con datos sembrados y luego limpiados.

## Idea central: el pago es el validador del acceso

No hay discrepancia entre "pagó" y "puede entrar": un alumno solo puede iniciar
sesión en su portal si tiene **al menos un pago confirmado** (`pagos.estado =
pagado`). Esto se valida en `src/lib/portal/auth.ts` (`tienePagoConfirmado`) tanto
para el login con usuario/contraseña como para el login con Google.

Además, las **credenciales solo se generan al confirmar el pago**: el usuario
(`= WhatsApp`) y el `password_hash` del alumno se crean en
`provisionarAccesoAlumno` (`src/lib/inscripcion.ts`), que ahora corre por las DOS
rutas de confirmación:
- **Webhook de tarjeta** (MercadoPago) → `aplicarEventoPago` → `inscribirPorPago`.
- **Aprobación manual** en el panel → `pagoAprobarAccion` → `inscribirPorPago`.

Antes, solo la aprobación manual generaba credenciales; el webhook de tarjeta NO
lo hacía. Se unificó en `inscribirPorPago`, así el alumno recibe **exactamente el
mismo acceso** venga el pago de donde venga, y se le mandan sus credenciales por
correo (`enviarBienvenidaAlumno`).

## Login ÚNICO para staff y alumnos — `/panel/login`

**Hay un solo login** para todos (decisión del dueño: "el login de usuario y de
admin debe ser el mismo"). Vive en `/panel/login` (el split con carrusel
personalizable de "Personalizar login", que se conserva). El mismo formulario
resuelve quién es cada quien y a dónde va (`src/lib/auth-unificado.ts`):

- **Staff** (tabla `usuarios`, por correo) → sesión de panel → **/panel**. Sin
  gate de pago.
- **Alumno** (tabla `alumnos`, por usuario=WhatsApp **o** correo) → sesión de
  portal → **/portal**. Validado por el pago.

El campo es "Correo o usuario" (acepta el correo del staff o el WhatsApp/correo
del alumno). El botón **"Continuar con Google"** aparece solo si
`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` están configurados; el callback también
resuelve staff-primero-luego-alumno. Freno de fuerza bruta en memoria por
identificador.

- **El login aparece en la landing:** el enlace **"Entrar"** del nav del sitio y
  del footer apunta a `/panel/login`.
- `/portal/login` quedó como **redirección** a `/panel/login` (compatibilidad).

## Portal del alumno — `/portal`

Route group nuevo `src/app/(portal)/` con su propio layout (barra ligera, sin el
chat ni el footer de marketing). Reusa los tokens y superficies de `inmath.css` +
`portal.css`.

> **Rediseño 21-ago (v60):** el dashboard se rediseñó con estilo "panel
> educativo moderno" (regla 60-30-10, tarjetas hero de gradiente con cifra
> gigante, chips de métricas, material como tarjetas, cifras que cuentan al
> entrar en viewport). Detalle en `alertas-y-diseno-v37.md` §v60–v62. La lista
> de abajo describe el **contenido**; el layout ahora es el rediseñado.

- **`/portal`** — dashboard con:
  1. **Inscripción activa** — curso y fecha de inscripción.
  2. **Tu próxima asesoría** — la próxima cita agendada; si tiene `meet_link`
     (lo pone n8n), botón para entrar a la videollamada; si no, invita a agendar.
  3. **Tus reportes de avance** — lista de `reportes_generados` del alumno, con
     descarga autenticada (`/portal/reporte/[id]` verifica que el reporte sea del
     alumno logueado antes de servir el PDF).
  4. **Material de tu curso** — enlaces que el admin gestiona (ver abajo).
- **`/portal/logout`** — cierra la sesión del alumno.

**Sesión:** cookie httpOnly `inmath_alumno` (`aid.exp.hmac` firmada con
`APP_SECRET`, prefijo `alumno:` para no colisionar con la del panel
`inmath_panel`), 30 días, path `/portal`. Se re-verifica que el alumno siga
`activo` en cada carga (`src/lib/portal/sesion.ts`).

## Login con Google (en el login único)

Flujo OAuth Authorization Code, solo identidad (openid/email/profile) — NO es el
OAuth de Google Calendar de n8n. Enlaza por correo: si el correo es de un staff
entra al panel; si es de un alumno con pago confirmado entra al portal.

- `GET /api/portal/google/inicio` — guarda un `state` (CSRF) en cookie y redirige
  a la pantalla de consentimiento de Google.
- `GET /api/portal/google/callback` — valida el `state`, canjea el `code` por el
  `id_token`, saca el correo verificado y **enlaza por correo** con un alumno que
  ya pagó (`accesoPorEmail`). Si el correo no corresponde a un alumno con pago
  confirmado, rechaza con mensaje claro.

El correo del alumno (`alumnos.email`) se rellena desde `prospectos.correo` al
provisionar el acceso, para que el enlace por Google funcione.

**Para activarlo** (tarea del dueño — requiere credenciales de Google):
1. En Google Cloud Console, crear un proyecto y una credencial **OAuth 2.0 Client
   ID** tipo "Web application".
2. En "Authorized redirect URIs" agregar:
   `https://inmath.lumiaaisolutions.com/api/portal/google/callback`
3. Copiar el Client ID y Client Secret al `.env` del VPS (fuente y standalone):
   ```
   GOOGLE_CLIENT_ID="...apps.googleusercontent.com"
   GOOGLE_CLIENT_SECRET="..."
   ```
   y reiniciar la app. En cuanto estén, el botón "Continuar con Google" aparece
   solo en `/portal/login`.

## Pago con tarjeta (MercadoPago) — LISTO, sin activar

El driver (`src/lib/pagos-drivers.ts`, `driverMercadoPago`) ya crea la preferencia
de Checkout Pro y verifica el webhook firmado; el botón **"Pagar de forma
segura"** de `/pago` aparece en cuanto el pago tiene `link_pago`. Todo el flujo
está cableado y el webhook ahora provisiona el acceso al portal (arreglo de
arriba). Solo falta la credencial del cliente.

**Para activarlo** (tarea del dueño):
1. En el `.env` del VPS: `MERCADOPAGO_ACCESS_TOKEN="..."` (y opcional
   `MERCADOPAGO_WEBHOOK_SECRET="..."` para verificar la firma del webhook).
2. En la BD, poner la configuración `procesador_pago_activo = mercadopago`
   (tabla `configuraciones`). Sin esto, `/pago` sigue funcionando por
   transferencia/OXXO con comprobante manual.
3. En el panel de MercadoPago, configurar la URL de webhook:
   `https://inmath.lumiaaisolutions.com/api/webhooks/pago/mercadopago`

## Material del curso (admin) — `/panel/materiales`

Página nueva (solo admin, en el nav) para gestionar los enlaces que el alumno ve
en su portal: título, tipo (documento/video/enlace) y URL, reordenables. Se
guardan como JSON (texto) en `configuraciones` (clave `materiales_curso`), sin
migrar el esquema. Son **enlaces** (Drive, YouTube, PDF): no se suben archivos al
servidor. Lib: `src/lib/portal/materiales.ts`.

## Variables de entorno nuevas

| Variable | Para qué | Estado |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Login con Google del portal | Falta (cliente) |
| `GOOGLE_CLIENT_SECRET` | Login con Google del portal | Falta (cliente) |
| `MERCADOPAGO_ACCESS_TOKEN` | Cobro con tarjeta | Falta (cliente) |
| `MERCADOPAGO_WEBHOOK_SECRET` | Verificar firma del webhook | Opcional |

Todas degradan con gracia: si faltan, la función queda oculta/inactiva y el resto
del sistema funciona igual (transferencia, login por usuario/contraseña).

## Verificación hecha (local, Playwright + iPhone 13)

- `/portal` sin sesión → redirige a `/portal/login`. ✅
- Login con alumno **sin** pago confirmado → **rechazado** ("Aún no confirmamos tu
  pago…"). ✅ (el pago valida el acceso)
- Login con alumno **con** pago confirmado → entra al dashboard. ✅
- Contraseña incorrecta → rechazada. ✅
- Botón de Google aparece con credenciales configuradas y
  `/api/portal/google/inicio` redirige a `accounts.google.com` con el `state`
  correcto. ✅
- Material del curso sembrado → aparece en el portal con sus enlaces. ✅
- Sin scroll horizontal en móvil (390px) en login ni dashboard. ✅

## Pendiente de n8n (tareas interactivas del dueño — no las puede hacer Claude)

Estas dos requieren credenciales y consentimiento interactivo DENTRO de la UI de
n8n; no se pueden completar por código. Ver también `n8n-conexion.md`.

1. **Google Calendar OAuth (flujo 03):** en la UI de n8n
   (`http://2.24.123.93:5678`), crear una credencial **Google Calendar OAuth2 API**
   y darle "Connect my account" (abre el consentimiento de Google con la cuenta
   del dueño). Requiere un OAuth Client de Google Cloud (puede ser el mismo
   proyecto que el login del portal, pero con su propio Client ID de tipo web y el
   redirect URI que n8n indique). Luego asignar la credencial al nodo de Calendar
   y activar el workflow. Esto es lo que rellena `citas.google_event_id` y
   `citas.meet_link` — que el portal ya muestra.
2. **SMTP en n8n (flujo 08, reportes semanales):** crear una credencial **SMTP**
   en la UI de n8n (host `smtp.hostinger.com`, puerto 465, el correo
   `noreply@lumiaaisolutions.com` y su contraseña) y asignarla al nodo `emailSend`
   del flujo 08, luego activarlo. Nota: es una credencial SEPARADA de la
   `SMTP_URL` que ya tiene el Next.js — n8n gestiona sus propias credenciales.

El lado de código (Next.js) ya está listo para ambas: el portal muestra el
`meet_link` en cuanto n8n lo escribe, y `/api/reportes/generar` ya produce los
PDFs que el flujo 08 enviaría.

## Cierre de las tareas de n8n POR CÓDIGO (21-ago) — sin depender de n8n

Las credenciales de n8n (OAuth de Google + SMTP) NO se pueden configurar por
código: requieren iniciar sesión en la cuenta de Google del dueño + consentir
el OAuth, y escribir la contraseña SMTP dentro de la UI de n8n — acciones
interactivas del dueño. En vez de esperar a n8n, se cerró el **hueco práctico**
por código:

**1. Reportes por correo → cron de Next.js (reusa el SMTP que ya funciona):**
- Nuevo `POST /api/reportes/enviar` (protegido por x-api-key): genera los
  reportes de la semana (idempotente) y avisa por correo a cada alumno con
  correo que su reporte está listo, con enlace a `/portal` (donde lo descarga
  autenticado); marca `enviado_en`. Reusa `enviarCorreo` (noreply Hostinger).
- Verificado en local: `{"generados":3,"enviados":1,"sinCorreo":3}` y rechaza
  sin API key (401).
- **Al desplegar**, instalar el cron semanal en el VPS (lunes 8:00), igual que
  los otros: un script `scripts/reportes-semanales.sh` que hace `curl` al
  endpoint con la `x-api-key`, y `0 8 * * 1` en el crontab. Esto **sustituye al
  flujo 08 de n8n**; ya no hace falta la credencial SMTP dentro de n8n.

**2. Meet link → campo manual al crear la cita (sin Google Calendar):**
- El alta manual de cita (`/panel/citas`) ahora tiene un campo opcional
  **"Enlace de videollamada"** (Zoom/Meet); se guarda en `citas.meet_link` y el
  alumno lo ve en su portal. Así las asesorías tienen enlace **sin depender del
  OAuth de Google Calendar de n8n**.
- La **creación automática** de eventos de Google Calendar + Meet (flujo 03)
  sigue necesitando credenciales de Google; queda como mejora futura opcional.
  El resultado que ve el alumno (un enlace a la videollamada) ya está cubierto.

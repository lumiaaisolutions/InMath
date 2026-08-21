# Conectar MercadoPago (cobro automático) y Google Sign-In

Guía operativa. Estado a 21-ago-2026: ambos **inactivos en producción** (degradan
sin romper nada). El pago funciona hoy en **modo manual** (WhatsApp + subir
comprobante, texto en config `datos_pago`). El login funciona con
usuario/contraseña + wizard; el botón de Google se oculta solo si no hay credencial.

Lo que el código espera (verificado en `src/lib/pagos-drivers.ts`,
`src/lib/portal/google.ts`):

| Función | Variables `.env` del VPS | Config en BD/panel | URL que Google/MP deben conocer |
|---|---|---|---|
| MercadoPago | `MERCADOPAGO_ACCESS_TOKEN`, `MERCADOPAGO_WEBHOOK_SECRET` | `procesador_pago_activo = mercadopago` (panel → Configuración) | Webhook: `https://inmath.lumiaaisolutions.com/api/webhooks/pago/mercadopago` |
| Google Sign-In | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | — | Redirect: `https://inmath.lumiaaisolutions.com/api/portal/google/callback` |

---

## A) MercadoPago — qué pedir al cliente y de dónde sale

El cliente necesita una **cuenta de Mercado Pago (México)** con la verificación de
identidad/negocio completa (sin eso, MP no libera credenciales de producción). Se
usa **Checkout Pro** (MP hospeda la pantalla de pago: tarjeta, OXXO, saldo MP).

Pídele al cliente estos **tres datos** (todos salen del panel de desarrolladores de
su propia cuenta MP, no de nosotros):

1. **Access Token de PRODUCCIÓN**
   - Entrar a https://www.mercadopago.com.mx/developers/panel con su cuenta.
   - "Tus integraciones" → **Crear aplicación** (nombre: "Cursos Inmath",
     producto: *Pagos online / Checkout Pro*).
   - Dentro de la app → **Credenciales de producción** → copiar el
     **Access Token** (empieza con `APP_USR-…`).
   - ⚠️ Que copie el de **producción**, no el de *prueba* (`TEST-…`).

2. **Clave secreta del Webhook (firma)**
   - En la misma app → sección **Webhooks / Notificaciones**.
   - Configurar la URL de notificación:
     `https://inmath.lumiaaisolutions.com/api/webhooks/pago/mercadopago`
   - Evento a suscribir: **Pagos (payment)**.
   - MP genera una **"clave secreta"** para firmar las notificaciones → copiarla.

3. **Confirmar cobros a su banco**
   - Que la cuenta MP tenga una **CLABE/banco** ligada para retirar el dinero, y
     que la moneda sea **MXN**. (No es un dato que nos pase, solo confirmación de
     que ya puede recibir pagos reales.)

**Qué hago yo con eso (5 min):**
- Agrego al `.env` del VPS: `MERCADOPAGO_ACCESS_TOKEN=…` y
  `MERCADOPAGO_WEBHOOK_SECRET=…`.
- En el panel → **Configuración**, pongo el procesador activo en `mercadopago`
  (clave `procesador_pago_activo`).
- Reinicio (`pm2 delete + start`) y hago una compra de prueba real de bajo monto
  para confirmar que el link se crea y el webhook confirma el pago.
- (Opcional) ajusto el texto `datos_pago` que ve el alumno.

**Cómo queda:** el wizard de `/pago` generará el enlace de Checkout Pro
automáticamente; al aprobarse el pago, MP avisa por webhook (firmado y
re-verificado contra su API) y el alumno queda con **pago confirmado** → se le
abre el portal sin intervención manual.

### Mensaje listo para enviar al cliente
> Para activar el cobro automático con tarjeta/OXXO necesito 3 cosas de tu cuenta
> de Mercado Pago (todas se sacan desde tu panel de desarrollador):
> 1) El **Access Token de producción** (empieza con `APP_USR-…`), desde
>    mercadopago.com.mx/developers/panel → tu aplicación → Credenciales de producción.
> 2) La **clave secreta del webhook**: en tu app, sección Webhooks, registra esta
>    URL `https://inmath.lumiaaisolutions.com/api/webhooks/pago/mercadopago`
>    (evento "Pagos") y me pasas la clave secreta que te genera.
> 3) Confirmarme que tu cuenta ya tiene banco/CLABE ligada y opera en pesos (MXN).
> Con eso lo dejo cobrando solo. Mientras tanto seguimos con el pago por WhatsApp
> + comprobante, que ya funciona.

---

## B) Google Sign-In — ✅ CONFIGURADO Y EN PRODUCCIÓN (21-ago-2026)

**Estado: HECHO y verificado en vivo.** El botón "Continuar con Google" aparece en
`/panel/login` y `/api/portal/google/inicio` redirige a Google con el client_id y
redirect correctos. La pantalla de consentimiento está **publicada "En producción"**
(cualquier cuenta de Google puede entrar; permisos no sensibles → sin verificación
obligatoria de Google; puede aparecer el aviso "app no verificada", que el usuario
descarta con *Continuar*).

- **Proyecto Google Cloud:** `inmath-506223`.
- **Client ID:** `746722705015-…apps.googleusercontent.com` (no es secreto).
- **Secreto (`GOCSPX-…`):** vive SOLO en `/var/www/inmath/web/.env` del VPS
  (variables `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`) y su copia en
  `.next/standalone/.env`. **NO se guarda en este repo.** Si algún día hay que
  rotarlo: Google Cloud → Clientes → el cliente OAuth → generar secreto nuevo →
  reemplazar en el `.env` del VPS y `pm2 delete + start inmath-web`.
- Redirect autorizado en Google: `https://inmath.lumiaaisolutions.com/api/portal/google/callback`.

Guía original de referencia (cómo se hizo), por si se recrea en otro entorno:

### B.1) Cómo se creó (referencia)

Credenciales **OAuth 2.0** de **Google Cloud Console** (cuenta Google del proyecto,
puede ser la del negocio). Scopes que pide el código: `openid email profile`
(no sensibles → no requiere verificación de Google para producción básica).

Pasos (10–15 min):

1. **Proyecto**
   - Entrar a https://console.cloud.google.com → crear/seleccionar proyecto
     (ej. "Inmath Portal").

2. **Pantalla de consentimiento OAuth** (menú → *APIs y servicios* →
   *Pantalla de consentimiento de OAuth*)
   - Tipo de usuario: **Externo**.
   - Nombre de la app: **Cursos Inmath**; correo de asistencia; logo (opcional).
   - **Dominio autorizado:** `lumiaaisolutions.com`.
   - Scopes: agregar solo `.../auth/userinfo.email`, `.../auth/userinfo.profile`
     y `openid` (los "no sensibles").
   - **Publicar la app** (botón "Publicar" → estado *En producción*). Si se deja
     en *Prueba*, solo entran los correos que agregues como "usuarios de prueba".

3. **Crear credenciales** (menú → *Credenciales* → *Crear credenciales* →
   *ID de cliente de OAuth*)
   - Tipo de aplicación: **Aplicación web**.
   - Nombre: "Inmath web".
   - **Orígenes autorizados de JavaScript:**
     `https://inmath.lumiaaisolutions.com`
   - **URIs de redirección autorizados** (exacto, sin barra final):
     `https://inmath.lumiaaisolutions.com/api/portal/google/callback`
   - Crear → Google muestra **ID de cliente** y **Secreto de cliente**.

4. **Pasarme (o poner en el `.env`):**
   - `GOOGLE_CLIENT_ID=` (el ID de cliente, termina en `.apps.googleusercontent.com`)
   - `GOOGLE_CLIENT_SECRET=` (el secreto, empieza con `GOCSPX-…`)

**Qué hago yo:** agrego esas dos variables al `.env` del VPS, reinicio pm2, y el
botón **"Continuar con Google"** aparece en el login. Si el correo de Google no
tiene cuenta, ya está cableado para mandarlo al **wizard de registro** antes de
entrar al portal.

⚠️ El **redirect URI debe coincidir carácter por carácter** con
`https://inmath.lumiaaisolutions.com/api/portal/google/callback` (lo arma el
código desde `APP_URL`). Si no coincide, Google devuelve `redirect_uri_mismatch`.

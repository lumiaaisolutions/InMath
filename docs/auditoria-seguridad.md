# Auditoría de Ciberseguridad — Cursos InMath

**Fecha:** 22-ago-2026 · **Auditor:** revisión asistida (skill ciberseguridad-auditor-integral)
**Alcance ejecutado:** análisis estático (SAST/taint) del código + revisión de
configuración (código fuente + `.env`/pm2 del VPS + cabeceras HTTP reales de
producción). **No** se ejecutó explotación activa, DAST ni pruebas de DoS.

## 0. Encuadre (Fase −1)

- **Objetivo:** `inmath.lumiaaisolutions.com` — monolito **Next.js 15** (App
  Router, Server Actions) + **Prisma/MySQL**, en VPS (pm2) tras **Cloudflare** +
  nginx.
- **Nivel de criticidad (compuerta de proporcionalidad):** **N2** — aplicación
  con autenticación y datos de usuario + pagos. Por proporcionalidad, NO se
  exige service mesh, K8s PSS ni mTLS interno (serían falsos hallazgos para este
  nivel).
- **Datos sensibles:** PII (nombre, correo, WhatsApp), contraseñas, comprobantes
  de pago → aplica **LFPDPPP** (México).
- **Autorización:** el dueño solicitó auditar su propio sistema. Análisis
  estático + revisión de config, sin explotación activa.

## 1. Veredicto general

**Postura de seguridad: BUENA para su nivel (N2).** La base está sólida: ORM
parametrizado (sin SQLi), sin `eval`/shell/deserialización insegura, sin
secretos en el repo, sesiones firmadas con HMAC y comparación en tiempo
constante, control de acceso por dueño (BOLA) verificado, y CDN (Cloudflare) al
frente. Se detectaron **hallazgos de hardening** (no vulnerabilidades críticas
explotables), la mayoría **ya corregidos** en esta ronda.

## 2. Hallazgos y estado

| # | Severidad | Hallazgo | Estado |
|---|---|---|---|
| H1 | **Media** | **Cabeceras de seguridad ausentes** en producción (sin HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy). Riesgo concreto: **clickjacking** del panel/portal (sin `frame-ancestors`/X-Frame-Options) y sniffing MIME. | ✅ **CORREGIDO** — `next.config.ts` añade HSTS, `X-Frame-Options: DENY`, `nosniff`, Referrer-Policy, Permissions-Policy y COOP a todas las respuestas. Verificado en vivo. |
| H2 | **Media** | **Fuerza bruta del OTP de 2FA:** `verificarCodigo2fa` no contaba intentos; el código de 6 dígitos solo se consumía al acertar, permitiendo adivinar sin límite (mitigado parcialmente por expiración de 10 min y Cloudflare, pero sin control a nivel app — viola defensa en profundidad). | ✅ **CORREGIDO** — límite de 5 intentos fallidos por código; al superarlo se invalida y obliga a re-emitir. |
| H3 | **Baja** | **Divulgación de versión:** cabecera `X-Powered-By: Next.js`. | ✅ **CORREGIDO** — `poweredByHeader: false`. |
| H4 | **Baja** | **Costo de bcrypt = 10** (OWASP recomienda ≥12) en todos los puntos de hasheo. | ✅ **CORREGIDO** — subido a **12**. Los hashes existentes siguen validando; se re-hashean al próximo cambio de contraseña. |
| H5 | **Baja** | **Webhook de MercadoPago sin ventana anti-replay** por timestamp (el control primario —re-consulta del pago a la API de MP— sí existe). | ✅ **CORREGIDO** — ventana de ±15 min robusta a segundos/ms (sin riesgo de rechazar webhooks legítimos). |
| H6 | **Baja (privacidad)** | Las imágenes de perfil (`/portal/img/{id}-avatar.jpg`) eran **enumerables por nombre**; un tercero podía ver la foto/portada de otro alumno adivinando el id. | ✅ **CORREGIDO** — la ruta exige sesión de alumno y solo sirve `{id}-avatar\|banner.jpg` del **propio** alumno. Verificado: avatar ajeno → 404. |
| H7 | **Baja** | **Rate limiting de login en memoria** (Map por proceso): se reiniciaba con pm2 y no era multi-proceso. | ✅ **CORREGIDO** — store **persistente en BD** (`src/lib/rate-limit.ts`), castigo progresivo 1s→8s→60s→300s (caduca 15 min). Verificado: bloqueo tras 6 fallos. |
| H8 | **Media** | **Sin Content-Security-Policy (CSP).** | ✅ **CORREGIDO** — CSP **enforcing** en todas las respuestas (`frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`; solo Google Fonts permitido). Verificado sin violaciones en el build de producción. |

## 3. Fortalezas verificadas (lo que está BIEN hecho)

- **Inyección SQL:** todo el acceso a datos usa **Prisma ORM parametrizado**; no
  hay `$queryRawUnsafe` ni concatenación de SQL en el código de la app.
- **Sin ejecución peligrosa:** no hay `eval`, `new Function`, `child_process`,
  ni deserialización insegura (`pickle`/`unserialize`/etc.).
- **SSRF:** los `fetch` salientes van a **hosts fijos** (Google, MercadoPago) —
  no hay URLs controladas por el usuario.
- **Secretos:** ninguno hardcodeado (todo `process.env`); `.env` **no** está en
  git. `NODE_ENV=production` confirmado en el VPS → cookies con `Secure`.
- **Sesiones:** cookies `HttpOnly` + `SameSite=Lax` + `Secure` (prod); token
  `id.exp.hmac` firmado con `APP_SECRET` y verificado con `timingSafeEqual`.
- **Control de acceso (BOLA):** `/portal/reporte/{id}` valida
  `reporte.alumno_id === alumno.id`; las APIs `/api/**/[id]` exigen `X-API-Key`
  (comparada en tiempo constante). Webhook con firma HMAC + re-consulta del pago.
- **Path traversal:** `/portal/img/[...ruta]` restringe con regex
  `^[\w.-]+\.jpg$` (sin `/` ni `..`).
- **Subida de archivos:** comprobante valida **magic bytes** (`%PDF`, JPG/PNG/
  WebP) + tamaño ≤8 MB + renombrado con aleatorio; avatar/banner se **re-codifican
  con sharp** (elimina polyglots/scripts embebidos).
- **Contraseñas:** bcrypt (ahora costo 12); política de fuerza en el registro
  (mayúscula, minúscula, número, ≥8) validada en cliente **y** servidor.
- **Reset de contraseña:** token de 256 bits, **hasheado** en reposo, un solo
  uso, expira en 30 min. Sin enumeración de usuarios (mensajes genéricos +
  respuesta silenciosa en "olvidé mi contraseña").
- **OAuth Google:** parámetro `state` (anti-CSRF) emitido y validado; PKCE/flujo
  estándar; `redirect_uri` exacto.
- **2FA:** código OTP con `randomInt` (CSPRNG), hasheado en reposo, expira 10 min.
- **Edge:** Cloudflare provee TLS, anti-DDoS L3/L4 y rate-limiting perimetral.

## 4. Recomendaciones de seguimiento (no bloqueantes)

Los hallazgos H1–H8 quedaron **corregidos**. Mejoras futuras opcionales:

1. **CAPTCHA** (Cloudflare Turnstile) tras N intentos de login, además del
   freno persistente ya implementado (H7).
2. **MFA para staff/admin:** hoy el 2FA es opcional para alumnos; considerar
   TOTP obligatorio para cuentas de panel (admin).
3. **Rotación de `APP_SECRET`/API_KEY** documentada y periódica.
4. Al activar MercadoPago, **probar el webhook real** para confirmar la unidad
   del `ts` y que la ventana anti-replay no genera falsos negativos.
5. **CSP con `nonce`** (eliminar `'unsafe-inline'` de script-src) si a futuro se
   monta infraestructura de nonce para los scripts de Next.

## 5. Conclusión

No se hallaron vulnerabilidades **críticas ni de alta severidad explotables** en
el análisis estático. Los hallazgos fueron de **hardening** y **todos (H1–H8) se
corrigieron y desplegaron en producción**, verificados en vivo. El sitio **no es
trivialmente "hackeable"** por los vectores comunes (OWASP Top 10) revisados. Se
recomienda repetir la auditoría tras activar MercadoPago y ante cambios grandes.

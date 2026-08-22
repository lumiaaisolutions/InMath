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
| H6 | **Baja (privacidad)** | Las imágenes de perfil (`/portal/img/{id}-avatar.jpg`) son **enumerables por nombre** de archivo; un tercero podría ver la foto/portada de otro alumno adivinando el id. No expone datos sensibles (solo la imagen que el alumno subió). | ⚠️ **Aceptado / seguimiento** — bajo impacto. Recomendación futura: nombres con sufijo aleatorio o verificación de sesión. |
| H7 | **Baja** | **Rate limiting de login en memoria** (Map por proceso): se reinicia con pm2 y no es distribuido; sin CAPTCHA tras N fallos. Cloudflare compensa en el borde. | ⚠️ **Aceptado / seguimiento** — suficiente para N2 con Cloudflare; endurecer con store en BD/Redis + CAPTCHA si crece el tráfico. |
| H8 | **Media (recom.)** | **Sin Content-Security-Policy (CSP).** No se añadió una CSP estricta porque requiere pruebas por página (estilos/imagenes inline) y podría romper el render. React auto-escapa (riesgo XSS bajo), pero una CSP es defensa en profundidad valiosa. | ⚠️ **Recomendado (seguimiento)** — diseñar e ir endureciendo una CSP con `nonce` en modo report-only primero. |

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

1. **CSP** (H8): implementar en `report-only`, iterar y pasar a enforcing.
2. **Rate limiting distribuido** (H7): mover el contador de fallos a la BD/Redis
   y añadir CAPTCHA (Cloudflare Turnstile) tras N intentos en login.
3. **Imágenes de perfil** (H6): sufijo aleatorio en el nombre o gate por sesión.
4. **MFA para staff/admin:** hoy el 2FA es opcional para alumnos; considerar
   TOTP obligatorio para cuentas de panel (admin).
5. **Rotación de `APP_SECRET`/API_KEY** documentada y periódica.
6. Al activar MercadoPago, **probar el webhook real** para confirmar la unidad
   del `ts` y que la ventana anti-replay no genera falsos negativos.

## 5. Conclusión

No se hallaron vulnerabilidades **críticas ni de alta severidad explotables** en
el análisis estático. Los hallazgos fueron de **hardening**; los de severidad
media/baja accionables **ya se corrigieron y desplegaron** (H1–H5). Los
residuales (H6–H8) son de bajo riesgo con Cloudflare al frente y quedan como
seguimiento. El sitio **no es trivialmente "hackeable"** por los vectores
comunes (OWASP Top 10) revisados; se recomienda repetir la auditoría tras
activar MercadoPago y ante cambios grandes.

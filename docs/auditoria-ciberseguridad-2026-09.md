# Auditoría de ciberseguridad — septiembre 2026 (EN CURSO, pausada)

**Estado: Fase 0 y Fase 1 COMPLETADAS · Fases 2-4 PENDIENTES — dedicar
sesión propia.** Metodología: skill `ciberseguridad-auditor-integral`
(~/Desktop/Claude/Seguridad/Seguridad.md) + prompt del 05-sep (OWASP Top
10 2021, ASVS, CWE Top 25). Solo análisis estático + lectura de config
del VPS autorizada. Sin cambios de código ni pruebas activas.

## Fase 0 — Reconocimiento (hecho)

- **Stack**: Next.js 16.3.0 App Router (standalone, pm2 :3010), React
  19.2.8, Prisma 6.19.3→MySQL, bcryptjs, nodemailer, sharp, Ollama local
  (qwen2.5:3b) + Gemini respaldo, n8n (Docker, VPS compartido), crons
  shell. Dep vendorizada `liquid-gooey` (revisar a mano, pendiente).
- **PHP legacy (64 archivos)**: NO servido — vhost solo hace proxy a
  :3010 (verificado en nginx). Queda como código muerto (Fase 3).
- **Endpoints**: 30 route.ts + 14 archivos de server actions + 35
  páginas. 23/30 con guard verificado; 7 sin guard con justificación
  (webhook firmado, chat público con rate-limit, OAuth) — salvo
  /panel/img (hallazgo A-04).
- **Auth**: cookies HMAC-SHA256 `uid.exp.firma` (panel path=/panel,
  alumno path=/), API key única `x-api-key` para n8n/crons, Google OAuth
  con state, 2FA por correo, reset con token 32B hasheado.
- **Historial git**: 2,963 objetos escaneados → LIMPIO (solo
  placeholders). `.env` reales fuera del repo. APP_SECRET/API_KEY 64
  chars.

## Fase 1 — Hallazgos críticos y altos (hecho; SIN remediar)

| ID | Hallazgo | CVSS | Estado |
|---|---|---|---|
| C-01 | **Ollama 0.0.0.0:11434 sin auth + UFW inactivo** → uso/borrado de modelos y DoS de CPU del VPS entero desde internet | 8.6 | ABIERTO |
| C-02 | **Apps accesibles por IP:puerto** (Next :3010, n8n :5678, clientes 3001-3007) → bypass de TLS/nginx/Cloudflare | 7.4 | ABIERTO |
| A-03 | **SSH :8080 con PasswordAuthentication yes** (usuario deploy con sudo docker, dueño de todo el VPS) | 7.5 | ABIERTO |
| A-04 | **/panel/img sirve `materiales/` y `reactivos/` SIN sesión** (contenido de pago re-compartible; cache public). Código: `src/app/(panel)/panel/img/[...ruta]/route.ts` | 5.3 | ABIERTO |
| A-05 | **Rate-limit del chat burlable** (toma el 1er valor de X-Forwarded-For, que controla el cliente; nginx usa proxy_add_x_forwarded_for) + `/api/cta` sin límite (spam + upsert de prospectos) | 6.5 | ABIERTO |
| A-06 | **.env 664 (legible por grupo/otros)** en VPS multi-cliente con usuario único `deploy` → movimiento lateral trivial | 6.7 | ABIERTO |
| A-07 | **Editor n8n expuesto a internet** con credenciales de varios clientes; sin allowlist/2FA verificado | 6.8 | ABIERTO |
| M-08 | (adelanto de Fase 2) `aplicarEventoPago`: si MP no reporta monto, el candado de monto se salta (fail-open); no compara moneda | — | ABIERTO |

**Remediación exprés sugerida para C-01/C-02** (~20 min, máxima
reducción de riesgo): `OLLAMA_HOST=127.0.0.1` + `ufw allow 80,443,8080 &&
ufw enable` + `HOSTNAME=127.0.0.1` en pm2 + n8n publicado en
127.0.0.1:5678. A-03: `PasswordAuthentication no` (confirmar llave
ANTES). A-06: `chmod 600 /var/www/*/.env`.

## Revisados y NO explotables (no perseguir)

Webhook MercadoPago (firma+anti-replay+re-consulta+piso de monto), IDOR
en recibos/reportes/comprobantes/imágenes de alumno (ownership OK),
subida de comprobantes (magic bytes+token HMAC+nombre aleatorio+fuera de
webroot), $queryRawUnsafe del pipeline (parametrizado — falso positivo),
dangerouslySetInnerHTML (solo íconos estáticos), CSP enforzada, bcrypt
12, lockout de login persistente, MySQL/Redis/Postgres en loopback.

## PENDIENTE para la sesión dedicada

1. **Fase 2** — medios y bajos: monto null en webhook, moneda, expiración
   de tokenPago, prompt-injection residual del chat (saneado ya existe),
   fuga de info en errores, cabeceras faltantes (Permissions-Policy ya
   está; COEP/CORP evaluar), auditoría de `liquid-gooey`, CVEs de deps
   (npm audit), fail2ban, expiración/rotación de sesiones (sin
   revocación por jti), logging de datos sensibles.
2. **Fase 3** — deuda: árbol PHP muerto (borrar del repo o mover a
   rama), archivos sueltos en raíz (screenshots, .docx), imágenes/copias.
3. **Fase 4** — plan de implementación en 3 olas + controles preventivos
   (SAST en CI, dependabot, rotación de secretos, usuario por app,
   respaldos cifrados) + riesgo residual + LFPDPPP (cifrado en reposo de
   PII NO existe — evaluar; aviso de privacidad ya publicado ✓).

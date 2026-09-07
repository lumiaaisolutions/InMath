# Auditoría de ciberseguridad — septiembre 2026 (EN CURSO, pausada)

**Estado: Fases 0-4 COMPLETADAS (análisis) · Ola 1 EJECUTADA el 07-sep-2026**
(C-01, C-02, A-03 y A-06-InMath resueltos y verificados — ver
[`seguridad-remediacion-ola1.md`](seguridad-remediacion-ola1.md) para el
detalle fase por fase y la verificación contra los demás clientes del VPS).
Quedan abiertos A-04, A-05, A-07, el resto de A-06 (otros clientes), M-08 y
las Olas 2-3. Metodología: skill `ciberseguridad-auditor-integral`
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
| C-01 | **Ollama 0.0.0.0:11434 sin auth + UFW inactivo** → uso/borrado de modelos y DoS de CPU del VPS entero desde internet | 8.6 | ✅ RESUELTO 07-sep-2026 |
| C-02 | **Apps accesibles por IP:puerto** (Next :3010, n8n :5678, clientes 3001-3007) → bypass de TLS/nginx/Cloudflare | 7.4 | ✅ RESUELTO 07-sep-2026 |
| A-03 | **SSH :8080 con PasswordAuthentication yes** (usuario deploy con sudo docker, dueño de todo el VPS) | 7.5 | ✅ RESUELTO 07-sep-2026 |
| A-04 | **/panel/img sirve `materiales/` y `reactivos/` SIN sesión** (contenido de pago re-compartible; cache public). Código: `src/app/(panel)/panel/img/[...ruta]/route.ts` | 5.3 | ABIERTO |
| A-05 | **Rate-limit del chat burlable** (toma el 1er valor de X-Forwarded-For, que controla el cliente; nginx usa proxy_add_x_forwarded_for) + `/api/cta` sin límite (spam + upsert de prospectos) | 6.5 | ABIERTO |
| A-06 | **.env 664 (legible por grupo/otros)** en VPS multi-cliente con usuario único `deploy` → movimiento lateral trivial | 6.7 | 🟡 PARCIAL: InMath resuelto (600); otros clientes pendientes (ver Ola 1 doc) |
| A-07 | **Editor n8n expuesto a internet** con credenciales de varios clientes; sin allowlist/2FA verificado | 6.8 | ABIERTO |
| M-08 | (adelanto de Fase 2) `aplicarEventoPago`: si MP no reporta monto, el candado de monto se salta (fail-open); no compara moneda | — | ABIERTO |

**Remediación exprés C-01/C-02/A-03/A-06(InMath) — EJECUTADA el
07-sep-2026** en 4 fases verificadas (permisos `.env` de InMath → Ollama/n8n
a loopback → UFW activo → SSH solo llave). Detalle completo, hallazgo
inesperado (cloud-init anulaba un hardening SSH previo) y verificación
contra los demás clientes del VPS en
[`seguridad-remediacion-ola1.md`](seguridad-remediacion-ola1.md).

## Revisados y NO explotables (no perseguir)

Webhook MercadoPago (firma+anti-replay+re-consulta+piso de monto), IDOR
en recibos/reportes/comprobantes/imágenes de alumno (ownership OK),
subida de comprobantes (magic bytes+token HMAC+nombre aleatorio+fuera de
webroot), $queryRawUnsafe del pipeline (parametrizado — falso positivo),
dangerouslySetInnerHTML (solo íconos estáticos), CSP enforzada, bcrypt
12, lockout de login persistente, MySQL/Redis/Postgres en loopback.

## (histórico) Pendientes al pausar — YA EJECUTADOS abajo

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


## Fase 2 — Medios y bajos (05-sep, hecha)

- **M-08** Webhook pagos: fail-open si MP no reporta monto + moneda sin
  comparar (pagos-drivers.ts, aplicarEventoPago).
- **M-09** CVE High en deepmerge-ts vía prisma CLI (solo tooling).
- **M-10** CSP con unsafe-inline en script-src (nonces = backlog).
- **M-11** Sesiones sin revocación (panel 7d, portal 30d); guard sí
  re-verifica activo en BD (mitiga bloqueos, no robo de cookie).
- **M-12** Código de cambio de contraseña del portal sin throttle propio.
- **M-13** LFPDPPP: PII (incl. menores) sin cifrado de campo; refresh
  token de Google en claro en configuraciones. Aviso de privacidad ✓.
- **B-14** tokenPago sin expiración · **B-15** SVG inline desde /panel/img
  (stored XSS solo-staff) · **B-16** materiales sin magic-bytes ·
  **B-17** throttle del reset en memoria · **B-18** higiene de logs de
  APIs externas.
- Revisados NO explotables: liquid-gooey (sin eval/red), CSRF de Server
  Actions (Origin check de Next), logout POST, reset endurecido, 2FA tras
  contraseña, prompts sin secretos, cookies bien flaggeadas, fotos de
  alumnos re-encodadas con sharp.

## Fase 3 — Deuda técnica (05-sep, hecha)

- BORRAR SEGURO: screenshots/PHOTO versionados en raíz, CSS huérfano
  pw-config (0 refs), .DS_Store, JSONs de flujos n8n desactualizados
  (marcar como históricos).
- VALIDAR ANTES: árbol PHP (muerto en VPS — nginx solo proxy y storage
  overrideado por env — pero los DEFAULTS de dev del Next apuntan a
  ../backend y ../panel: mover a storage-dev/ primero); /api/asesores
  (consumidor eliminado del flujo 03 el 02-sep — confirmar en n8n);
  Módulos_específicos_carreras.docx (insumo del CLIENTE — decidir
  destino); docs históricos del PHP (cabecera "HISTÓRICO").
- CONSERVAR: /api/cta (lo usa ClienteSitio:351), ChatConversacion
  (decisión de producto), cero .bak/código comentado.

## Fase 4 — Plan de implementación (05-sep, hecho)

**Ola 1 · Contención 0-7 días (~6 h, ~80 % del riesgo)**: (1) Ollama a
127.0.0.1 + ufw enable [C-01, 0.5h]; (2) binds a loopback Next/n8n
[C-02, 0.5h]; (3) SSH solo-llave — VERIFICAR llave antes [A-03, 0.5h];
(4) chmod 600 .env [A-06, 0.2h]; (5) IP confiable (X-Real-IP) + límite
en /api/cta [A-05, 1.5h]; (6) sesión en /panel/img para
materiales/reactivos/avatars [A-04, 2h]; (7) allowlist para editor n8n +
2FA owner [A-07, 1.5h].

**Ola 2 · Endurecimiento 2-4 semanas (~8 h)**: M-08 monto/moneda; M-11
sesiones revocables (session_version en la firma; portal 14d — re-login
general al desplegar); M-12+B-17 throttles persistentes; M-09 subir
Prisma; B-14/15/16/18.

**Ola 3 · Sostenimiento (backlog ~20 h)**: limpieza F3 (storage-dev → rama
legacy-php → borrar de main; fecha de retiro del rollback PHP del VPS);
M-13 cifrado de PII/refresh-token + retención; M-10 CSP con nonces; 2FA
para STAFF del panel (ítem 16). Controles preventivos: semgrep+npm audit
en CI, Renovate, rotación semestral de secretos y API key por consumidor,
fail2ban, usuario de sistema por app, respaldos cifrados off-site (sacar
backup-*.sql de /var/www/inmath), política "n8n solo por editor+Publish".

**Riesgo residual**: usuario único multi-tenant hasta separar (lateral
persiste mitigado); n8n como concentrador de credenciales (aceptado con
auto-update); XSS teórico hasta nonces; PII en claro hasta M-13; DDoS
volumétrico delegado a Cloudflare; phishing a staff (mitigar con ítem 16).

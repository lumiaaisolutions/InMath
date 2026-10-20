# Auditoría de ciberseguridad — septiembre 2026 (Olas 1-2-3 de código EJECUTADAS)

**Estado: Fases 0-4 COMPLETADAS (análisis) · Ola 1 EJECUTADA el 07-sep-2026
· Ola 2 EJECUTADA el 19-oct-2026 · Ola 3 (parte de código) EJECUTADA el
19/20-oct-2026**
(C-01, C-02, A-03 y A-06-InMath resueltos y verificados — ver
[`seguridad-remediacion-ola1.md`](seguridad-remediacion-ola1.md) para el
detalle fase por fase y la verificación contra los demás clientes del VPS;
Olas 2-3 revisadas línea por línea y desplegadas, ver bitácora de LUMIA
19/20-oct-2026 y las notas por hallazgo más abajo).
Quedan abiertos A-04 y A-07 (parciales, por decisión deliberada — A-07 es
cross-cliente, no solo de Inmath), el resto de A-06 (otros clientes), M-13
parte 2 (PII de alumnos, requiere decisión del dueño antes de tocar datos
de posibles menores), y la parte de INFRAESTRUCTURA de la Ola 3 (usuario de
sistema por app, rotación de secretos — cross-cliente, proyecto aparte).
Metodología: skill `ciberseguridad-auditor-integral`
(~/Desktop/Claude/Seguridad/Seguridad.md) + prompt del 05-sep (OWASP Top
10 2021, ASVS, CWE Top 25). Solo análisis estático + lectura de config
del VPS autorizada. Sin cambios de código ni pruebas activas (análisis
original); las Olas 2-3 sí cambiaron código, revisado a mano y verificado
en vivo antes de desplegar.

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
| A-04 | **/panel/img sirve `materiales/` y `reactivos/` SIN sesión** (contenido de pago re-compartible; cache public). Código: `src/app/(panel)/panel/img/[...ruta]/route.ts` | 5.3 | 🟡 PARCIAL: materiales/reactivos ya gateados (12-sep); avatars/login/alertas sin tocar a propósito (ver `plan-seguridad-olas-2-3.md`) |
| A-05 | **Rate-limit del chat burlable** (toma el 1er valor de X-Forwarded-For, que controla el cliente; nginx usa proxy_add_x_forwarded_for) + `/api/cta` sin límite (spam + upsert de prospectos) | 6.5 | ✅ RESUELTO 12-sep-2026 (rate-limit persistente + IP real vía CF-Connecting-IP) |
| A-06 | **.env 664 (legible por grupo/otros)** en VPS multi-cliente con usuario único `deploy` → movimiento lateral trivial | 6.7 | 🟡 PARCIAL: InMath resuelto (600); otros clientes pendientes (ver Ola 1 doc) |
| A-07 | **Editor n8n expuesto a internet** con credenciales de varios clientes; sin allowlist/2FA verificado | 6.8 | 🟡 PARCIAL: ya exige login propio + rate-limit agregado (12-sep); falta allowlist/2FA (ver `seguridad-remediacion-ola1.md`) |
| M-08 | (adelanto de Fase 2) `aplicarEventoPago`: si MP no reporta monto, el candado de monto se salta (fail-open); no compara moneda | — | ✅ RESUELTO 19-oct-2026 (fail-closed real + compara moneda) |
| — | **(no estaba en el análisis original)** Next.js 16.3.0 con RCE no autenticado (9 CVEs) — encontrado de rebote revisando dependencias para M-09 | crítico | ✅ RESUELTO 19-oct-2026 (subido a 16.4.2, mismo rango, sin cambio mayor) |

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


## Fase 2 — Medios y bajos (05-sep, hecha; remediación 19/20-oct-2026)

- ~~**M-08** Webhook pagos: fail-open si MP no reporta monto + moneda sin
  comparar~~ ✅ RESUELTO 19-oct-2026 (pagos-drivers.ts, `aplicarEventoPago`
  ahora rechaza fail-closed si falta el monto; compara moneda).
- **M-09** CVE High en deepmerge-ts vía prisma CLI (solo tooling) —
  🟡 PARCIAL: `npm audit fix` sin `--force` resolvió sharp, js-yaml,
  source-map-js, brace-expansion (19-oct); deepmerge-ts/prisma CLI sigue
  abierto porque el fix bajaría Prisma de 6.19.3 a 6.12.0 (downgrade real,
  no se forzó). De paso, revisando dependencias apareció algo no listado
  aquí originalmente y más grave: **Next.js 16.3.0 tenía RCE no
  autenticado (9 CVEs)** — ✅ RESUELTO 19-oct-2026 (subido a 16.4.2, ver
  tabla de Fase 1 arriba). nodemailer también tenía CVEs reportados (fuga
  de credenciales SMTP entre transportes, entre otros) — ✅ RESUELTO
  20-oct-2026 (9.1.1→10.1.7; único breaking change real es requerir
  Node 20+, ya se cumplía).
- ~~**M-10** CSP con unsafe-inline en script-src (nonces = backlog)~~
  ✅ RESUELTO 19-oct-2026 (nonces por-request vía `src/proxy.ts` — Next 16
  renombró `middleware.ts`; forzó dynamic rendering en 8 rutas que antes
  eran estáticas, verificado sin romper el píxel de Meta).
- ~~**M-11** Sesiones sin revocación (panel 7d, portal 30d)~~ ✅ RESUELTO
  19-oct-2026 (`session_version` en la firma de la cookie — cambiar
  contraseña o resetear acceso invalida de golpe las demás sesiones.
  Decisión de diseño: cookies retrocompatibles, SIN forzar el re-login
  general que proponía el plan original de Ola 2 — pendiente de que
  Fernando confirme si esa desviación le parece bien. Portal bajó de 30 a
  14 días de vigencia).
- ~~**M-12** Código de cambio de contraseña del portal sin throttle
  propio~~ ✅ RESUELTO 19-oct-2026 (junto con B-17, ver abajo).
- **M-13** LFPDPPP: PII (incl. menores) sin cifrado de campo; refresh
  token de Google en claro en configuraciones. Aviso de privacidad ✓. —
  🟡 PARCIAL: refresh token de Google ✅ CIFRADO 19-oct-2026 (AES-256-GCM,
  `src/lib/cifrado.ts`, retrocompatible con el valor viejo). PII de
  alumnos/prospectos (nombre, teléfono, correo, teléfono de WhatsApp) SIGUE
  SIN CIFRAR — hay un plan de dos fases documentado (tensión entre AES-GCM
  y columnas buscables por igualdad en SQL: email/usuario/telefono_whatsapp
  necesitarían un hash determinista aparte) pero NO implementado, requiere
  decisión explícita de Fernando antes de tocar datos reales de alumnos.
- ~~**B-14** tokenPago sin expiración~~ ✅ RESUELTO 19-oct-2026 (expira a
  72h, mismo plazo que el vencimiento de pagos) · ~~**B-15** SVG inline
  desde /panel/img (stored XSS solo-staff)~~ ✅ RESUELTO 12-sep (quitado
  del MIME servible) · ~~**B-16** materiales sin magic-bytes~~ ✅ RESUELTO
  12-sep (`src/lib/magic-bytes.ts`) · ~~**B-17** throttle del reset en
  memoria~~ ✅ RESUELTO 19-oct-2026 (throttle persistente en BD para
  reset de contraseña Y cambio de contraseña del portal — M-12, reusa el
  mecanismo que ya resolvió A-05) · ~~**B-18** higiene de logs de APIs
  externas~~ ✅ RESUELTO 19-oct-2026 (investigado a fondo: único hallazgo
  real fue `google-calendar.ts` logueando el cuerpo completo de respuestas
  de error de Google — recortado a solo el status; el resto — Gemini,
  Ollama, MercadoPago, el chat — ya solo loguea status/montos, nunca
  payloads completos).
- **(nuevo, no tenía ID — "ítem 16" en el plan de Ola 3 de Fase 4)**
  2FA del STAFF del panel — ✅ RESUELTO 19-oct-2026: obligatorio para
  TODO rol (admin y asesor, sin excepción), por correo, en login con
  contraseña y con Google (el agente que lo implementó encontró y cerró de
  paso un bypass real: Google hubiera saltado el 2FA si no se tocaba el
  callback). Sin "recordar dispositivo" (decisión explícita).
- Revisados NO explotables: liquid-gooey (sin eval/red), CSRF de Server
  Actions (Origin check de Next), logout POST, reset endurecido, 2FA tras
  contraseña, prompts sin secretos, cookies bien flaggeadas, fotos de
  alumnos re-encodadas con sharp.

## Fase 3 — Deuda técnica (05-sep, hecha; ejecutada 19-oct-2026)

- ✅ BORRADO/MOVIDO 19-oct-2026: screenshots/PHOTO versionados y
  `Módulos_específicos_carreras.docx` (insumo del cliente) movidos a
  `respaldo/archivos-raiz/` en el repo (no se borraron, solo se sacaron de
  la raíz). `.DS_Store` borrado (no estaba trackeado). CSS huérfano
  `pw-config` (0 refs confirmadas) eliminado de `panel.css`. JSONs de
  flujos n8n desactualizados: sin tocar (bajo impacto, no se llegó a esa
  limpieza puntual).
- ✅ VALIDADO 19-oct-2026: árbol PHP — confirmado muerto en el VPS antes de
  mover (nginx solo hace proxy a :3010, las imágenes/materiales/reportes
  reales viven en carpetas separadas del servidor, nada cambiaba desde
  mediados de agosto) y movido a `respaldo/php-legacy/` en el repo (en vez
  de a una carpeta `storage-dev/` separada como se planeaba aquí — mismo
  resultado práctico: nada se borró, queda en git/GitHub, y se documentó en
  `respaldo/README.md` el aviso sobre los defaults de dev que apuntaban a
  `../backend`/`../panel`). La copia equivalente en el servidor (VPS) sigue
  pendiente de que el dueño la borre — es un borrado irreversible, el modo
  automático de Claude Code lo bloquea.
  **`/api/asesores`: ESTA NOTA ESTABA EQUIVOCADA** — decía "consumidor
  eliminado del flujo 03 el 02-sep". Verificado 19-oct-2026 contra los
  LOGS REALES de nginx del VPS (no solo el código): hay peticiones GET de
  n8n a esa ruta tan recientes como el 12-oct-2026, 200 OK — el flujo
  sigue usándola activamente. No se tocó el endpoint. Lección: no dar por
  buena una afirmación de "esto ya no se usa" sin verificar contra
  evidencia real (logs), un comentario en el código puede quedar
  desactualizado sin que nadie se dé cuenta.
- CONSERVAR (sin cambios): /api/cta (lo usa ClienteSitio:351),
  ChatConversacion (decisión de producto), cero .bak/código comentado.

## Fase 4 — Plan de implementación (05-sep, hecho)

**Ola 1 · Contención 0-7 días (~6 h, ~80 % del riesgo)**: (1) Ollama a
127.0.0.1 + ufw enable [C-01, 0.5h]; (2) binds a loopback Next/n8n
[C-02, 0.5h]; (3) SSH solo-llave — VERIFICAR llave antes [A-03, 0.5h];
(4) chmod 600 .env [A-06, 0.2h]; (5) IP confiable (X-Real-IP) + límite
en /api/cta [A-05, 1.5h]; (6) sesión en /panel/img para
materiales/reactivos/avatars [A-04, 2h]; (7) allowlist para editor n8n +
2FA owner [A-07, 1.5h].

**Ola 2 · Endurecimiento — ✅ EJECUTADA 19-oct-2026** (commit `fe72c4b`,
revisada a mano archivo por archivo antes de desplegar, 3 agentes en
paralelo + verificación cruzada): M-08 monto/moneda ✅; M-11 sesiones
revocables ✅ (session_version en la firma; portal bajado a 14d — pero SIN
forzar el re-login general que se planeaba aquí, ver nota en Fase 2, queda
pendiente de confirmación de Fernando); M-12+B-17 throttles persistentes
✅; M-09 dependencias (sharp/js-yaml/etc. sin --force) 🟡 parcial; B-14
✅. De regalo, revisando dependencias: Next.js crítico (RCE) ✅ resuelto
el mismo día.

**Ola 3 · Sostenimiento — parte de CÓDIGO ✅ EJECUTADA 19/20-oct-2026**
(commit `cd432b0` + nodemailer en commit aparte 20-oct, igual revisada a
mano antes de desplegar): M-13 cifrado del refresh token de Google ✅
(PII de alumnos queda como plan, NO implementado, pendiente de decisión);
M-10 CSP con nonces ✅; 2FA para STAFF del panel (ítem 16) ✅; B-18 ✅;
nodemailer actualizado (CVEs reportados en M-09) ✅. Limpieza de Fase 3
✅ (ver arriba) salvo el borrado final en el VPS del PHP (pendiente del
dueño). **Parte de INFRAESTRUCTURA de Ola 3 — SIN EJECUTAR, fuera de
alcance deliberado**: semgrep+npm audit en CI, Renovate, rotación
semestral de secretos y API key por consumidor, usuario de sistema por
app, respaldos cifrados off-site genérico, política "n8n solo por
editor+Publish" — son cambios que afectan a TODOS los clientes del VPS
compartido, no solo a Inmath, quedan como proyecto aparte de LUMIA.
fail2ban: ya estaba activo y bien configurado (jail sshd, maxretry 3,
bantime 1h) sin que nadie lo pidiera — nada que hacer ahí. Respaldo de
MySQL de Inmath específicamente: ✅ resuelto 19-oct-2026 (cron diario,
usuario de MySQL dedicado solo-lectura creado para esto, sin tocar
credenciales existentes de la app — off-site con Backblaze B2 sigue
apagado porque ningún cliente del VPS tiene cuenta B2 todavía).

**Riesgo residual (actualizado 20-oct-2026)**: usuario único multi-tenant
sin separar — PENDIENTE, cross-cliente; n8n como concentrador de
credenciales — PENDIENTE allowlist+2FA del owner, cross-cliente; XSS
teórico — RESUELTO (nonces); PII en claro — PARCIAL (refresh token de
Google resuelto, PII de alumnos pendiente de decisión); DDoS volumétrico
delegado a Cloudflare (sin cambio); phishing a staff — MITIGADO (2FA
obligatorio, ítem 16, ya no es solo "mitigar con" — ya está implementado).

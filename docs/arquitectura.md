# Arquitectura — Cursos Inmath

## Visión general

```
Facebook/Instagram Ads (clic-a-WhatsApp)
        │
        ▼
WhatsApp Business Cloud API (Meta) ──webhook──▶ n8n (self-hosted)
                                                  │
                                    ┌─────────────┼──────────────┐
                                    ▼             ▼              ▼
                              API de Gemini   Google Calendar  Procesador de pago
                              (bot IA, F2)    (citas, F3)      (links, F4)
                                    │
                                    ▼
                          Backend PHP/MySQL  ◀── Panel CRM (F5)
                          (fuente de verdad)
```

**Principio rector:** el backend PHP/MySQL es la única fuente de verdad. n8n orquesta
los flujos (recibe webhooks de WhatsApp, llama a Gemini, agenda, cobra) pero todo
estado — prospectos, etapas, mensajes, citas, pagos — se persiste a través de la API
del backend. Esto permite que el panel CRM (Fase 5) lea siempre datos consistentes y
que n8n pueda reiniciarse o reemplazarse sin perder información.

## Decisiones y su porqué

| Decisión | Razón |
|---|---|
| PHP sin framework, autoloader propio | Requisito: desplegable en hosting compartido; cero dependencias de Composer elimina fricción de despliegue |
| n8n consume la API, no al revés | El backend no depende de que n8n esté vivo; n8n es reemplazable |
| API key compartida (`X-API-Key`) | Un solo consumidor máquina-a-máquina (n8n); OAuth sería sobre-ingeniería. La autenticación de usuarios del panel (sesiones) llega en Fase 5 |
| Dinero en centavos (`INT`) | Evita errores de punto flotante |
| `utf8mb4` en todo | Mensajes de WhatsApp incluyen emojis |
| `wa_message_id` UNIQUE en `mensajes` | Meta reintenta webhooks; la unicidad hace la ingesta idempotente |
| Etapas del pipeline como ENUM | Son parte del contrato del producto (Prospecto → Calificado → Cita agendada → Pago pendiente → Inscrito); cambiarlas es decisión de producto, no de configuración |
| Tabla `prompts` versionada desde Fase 1 | Fase 2 exige prompts editables sin tocar código; versionar permite revertir un prompt que degrade la conversación |
| Tabla `configuraciones` clave-valor | Criterios de calificación, tiempos de recuperación de carrito y procesador de pago activo son ajustables por el cliente sin despliegue |
| URLs del sitio sin `.php` (`/agenda`, `/pago`) | Cosmético/SEO — el `.htaccess` de `sitio/public/` redirige 301 de `/agenda.php`→`/agenda` y reescribe internamente `/agenda`→`agenda.php`; `/api/*.php` queda excluido a propósito porque `agente.php` recibe POST y una redirección le rompería el body |

## Concurrencia (3 asesores, sin condiciones de carrera)

- **Asignación de prospectos:** `POST /api/prospectos/{id}/asignar` corre en una
  transacción que bloquea las filas de asesores (`SELECT … FOR UPDATE`), elige al
  asesor activo con menos prospectos vivos (round-robin por carga) y asigna con
  `UPDATE … WHERE asesor_id IS NULL` — si otra petición ganó la carrera, `rowCount = 0`
  y se responde 409 con la asignación existente.
- **Citas:** la creación verifica traslapes dentro de una transacción con
  `SELECT … FOR UPDATE` sobre las citas del asesor en el rango, y además la BD tiene
  `UNIQUE (asesor_id, inicio)` como última defensa.
- **Inscripción por pago:** marcar un pago como `pagado` crea el alumno y mueve la
  etapa en una sola transacción; `prospecto_id` es UNIQUE en `alumnos`, así que un
  webhook duplicado del procesador no puede inscribir dos veces.

## Escala

500 alumnos / ~algunos miles de prospectos en 6 meses es volumen bajo para MySQL con
los índices definidos (etapa, asesor, conversación+fecha). El punto de presión real
será el rate limit de la API de WhatsApp y la latencia de Gemini, no la base de datos.

## Zona horaria

Todo se almacena y opera en `America/Mexico_City` (configurable vía `APP_TZ` en
`.env`). Supuesto declarado: cliente y alumnos operan en una sola zona horaria de
México; si hubiera alumnos en otras zonas, las citas de Fase 3 deberán convertirse
por prospecto.

## Fuera de alcance (requiere confirmación explícita)

- Facturación fiscal (CFDI)
- Cualquier módulo no listado en las 7 fases

## DECISIÓN (13-ago-2026): migración total a Next.js + Prisma — CERO PHP

El cliente-dueño ordenó eliminar PHP por completo. Stack destino elegido:
**Next.js (TypeScript, App Router) + Prisma sobre la MISMA MySQL** (datos
intactos), desplegado en el **VPS** (el hosting compartido no corre Node).
Patrón strangler: el PHP sigue vivo en producción hasta que cada módulo
migrado lo reemplaza; nada de PHP nuevo desde hoy.

Proyecto: `inmath-next/` (creado; Prisma introspectó los 14 modelos y el
smoke test lee usuarios/cursos reales).

### Fases de la migración (cada una commiteada y verificada)
1. **F0 ✅** Scaffold + Prisma + conexión a BD real.
2. **F1** Sitio público (landing/agenda/pago) — portar `inmath.css` global,
   páginas server-rendered, API routes: agente Mathy (con agendado),
   comprobantes. Paridad visual 1:1.
3. **F2** Panel: auth (sesiones + bcrypt compatibles con hashes actuales),
   pipeline drag&drop, citas, alumnos, pagos, usuarios/permisos,
   personalizar-login (uploads + recorte con sharp), perfil.
4. **F3** Webhooks MercadoPago + reportes PDF + bot WhatsApp (n8n apunta a
   las rutas nuevas).
5. **F4** Deploy VPS (Node + proxy), corte de dominio, retirar PHP.

### F1a ✅ (13-ago) — Next.js sirve la landing + Mathy agenda real
- `inmath-next/` en :3005 (dev): landing SSR con Prisma (curso/precio reales,
  paridad de markup 1:1 con el CSS portado), layout con barra/pie/badge LUMIA,
  chat Mathy (React) y APIs `/api/agente` y `/api/cta`.
- Ports fieles: `lib/agenda.ts` (slots + agendar con FOR UPDATE, reintento en
  carrera y bitácora), `lib/prospectos.ts` (upsert con carrera), `lib/gemini.ts`
  (thinkingLevel low). E2E verificado: Mathy listó slots reales y creó cita
  con round-robin en la MISMA BD.
- **Convención de fechas crítica** (`lib/fechas.ts`): la BD guarda hora local
  de México; Prisma asume UTC → toda la agenda usa "hora de pared etiquetada
  UTC" (Date.UTC + getUTC*). Sin esto las citas se corrían 6 horas.
### F1b ✅ (13-ago) — /agenda y /pago portadas; F1 completa
- `/agenda`: calendario aurora 1:1 (tira de días, cabecera animada, slots por
  día) como server component + form cliente con server action; E2E verificado:
  cita real a las 15:30 exactas, round-robin, etapa y bitácora correctas.
- `/pago`: datos → pago `transferencia` (reutiliza pendiente con link vigente;
  drivers de procesador quedan para F3 — hoy `procesador_pago_activo` está
  vacío y el PHP cae a la misma rama) → subida de comprobante validada por
  magic bytes, guardada en `backend/storage/comprobantes` (mismo dir que lee
  el panel PHP). El `$_SESSION['pagos_propios']` se sustituyó por un token
  HMAC (`APP_SECRET` en .env); `bodySizeLimit` de server actions subido a 9 MB.
- Fix de hidratación: `Icono` ahora usa `useId` (el contador de módulo
  divergía entre SSR y cliente).
- Pendiente: F2 panel, F3 webhooks/PDF/bot, F4 deploy y borrado del PHP.

### F2 ✅ (13-ago) — Panel CRM completo en Next.js
- Route groups con root layouts separados (`(sitio)` / `(panel)`) porque cada
  app tiene su propio inmath.css con las mismas clases. Sesión: cookie HMAC
  firmada con APP_SECRET; login contra los hashes bcrypt `$2y$` existentes
  (compatibilidad Node↔PHP probada en ambos sentidos). Todos los módulos
  portados 1:1 y verificados E2E contra la BD real (drag&drop persiste con
  bitácora; aprobar pago inscribe alumno con credenciales). Uploads en
  panel/public/img (mismo dir que el PHP durante el strangler; en VPS se
  apunta con PANEL_IMG_DIR) servidos por route handler.

### F3 ✅ (13-ago) — Bot WhatsApp, drivers de pago, webhook y reportes PDF
- `lib/bot.ts`: port fiel de MotorBot (prompt de BD con reemplazos, historial
  fusionado, JSON {respuesta, accion, calificacion, cita}, calificación con
  pesos/umbral, BOT_SIMULADO=1 para pruebas). E2E verificado con el flujo
  completo: saludo → ofrecer_cita (slots reales) → "opción 2" agenda cita →
  listo_para_pago genera link (driver simulado) → webhook firmado inscribe.
- Drivers: simulado + MercadoPago (Checkout Pro: preferencia → init_point;
  webhook x-signature ts/v1 verificado + re-consulta del pago). **Pendiente
  del cliente: credenciales reales de MercadoPago** — solo falta poner
  MERCADOPAGO_ACCESS_TOKEN/WEBHOOK_SECRET y `procesador_pago_activo`.
- Rutas n8n idénticas en path/contrato (X-API-Key igual): bot/procesar,
  citas/por-recordar+PATCH, pagos/abandonados+PATCH (confirmar inscribe),
  asesores, reportes generar/pendientes/archivo/PATCH, webhooks/pago/{p}.
  Plan de corte sin perder mensajes: docs/corte-n8n.md.
- Reportes PDF: port del lienzo PDF puro (Helvetica WinAnsi con CP1252 para
  em-dash) + generador semanal idempotente; escribe en backend/storage
  (mismo dir que el PHP; en VPS se apunta con STORAGE_DIR). PDF verificado
  visualmente (banda de marca, barras, módulos).
### F4 ✅ (13-ago) — Desplegado en el VPS y dominio cortado al Next.js
- **En vivo**: `https://inmath.lumiaaisolutions.com` ya sirve el Next.js (no el
  PHP). Verificado público vía Cloudflare: home, /agenda (calendario aurora con
  slots reales), /pago, /panel/login, /api/asesores con X-API-Key; sin la
  cookie `inmath_sitio` del PHP.
- **Cómo se montó** (patrón de la casa, NO Docker — las otras apps Next del VPS
  corren con pm2): standalone en `/var/www/inmath/web`, build en el VPS (Node
  20, `prisma generate` regeneró el motor Linux), pm2 `inmath-web` en el puerto
  3010 (`pm2 save` + startup systemd ya persistente). SSH al VPS es por el
  **puerto 8080** y usuario **`deploy`** (root login deshabilitado por
  hardening). Los Dockerfile/compose del repo quedan como alternativa no usada.
- **Drift de esquema resuelto**: la BD de producción estaba en la migración 002
  (le faltaban `usuarios.modulos/es_asesor`, `pagos.comprobante(_subido_en)`,
  `alumnos.usuario/password_hash` y el config `datos_pago`). Respaldo previo en
  `/var/www/inmath/backup-inmath-*.sql` y se aplicaron 003/004/005.
- **nginx**: el vhost cambió de root PHP a `proxy_pass 127.0.0.1:3010`; el
  original quedó en `…inmath.lumiaaisolutions.com.php-backup` (rollback:
  restaurar + `systemctl reload nginx`, segundos).
- **PHP intacto en disco** (`/var/www/inmath/{public_html,backend}`) como red de
  seguridad; su retiro definitivo queda para después de unos días estables.
- Pendientes del dueño: credenciales MercadoPago + texto `datos_pago` (sigue en
  "PENDIENTE"); el VPS tiene auto-renovación activa (no vence solo el 23-ago).

### Post-lanzamiento (17-ago) — fixes, config del cliente en PROD y n8n
- **Bug de navegación (blur pegado)** corregido: el overlay de carga se mostraba
  al hacer clic en un enlace interno pero solo se ocultaba en `window load`, que
  no dispara en la navegación cliente de Next → quedaba el blur hasta recargar.
  `ScriptsSitio` ahora oculta el overlay al cambiar `usePathname`.
- **Botón flotante de WhatsApp** (wa.me con `WHATSAPP_NUMERO=5217224709235`).
- **Config del cliente aplicada a PRODUCCIÓN** (estaba solo en el dev local): 2
  cursos ($4,000, Premium 8m / Intensivo 3m), horario 8–21h todos los días,
  `datos_pago` con OXXO/Mercado Pago, y 3 usuarios reales (Magnolia y Jorge
  admin+asesor, José Domingo admin; seeds admin@/asesor1-3 desactivados). Ver
  `preguntas-cliente.md` y `credenciales.md`.
- **Fix de conexión MySQL** (crítico): Prisma sobre TCP no negocia
  `caching_sha2_password`; se cambió a socket + `mysql_native_password`. Detalle
  y otras trampas del redeploy (pm2 delete+start, rsync src/generated) en
  `despliegue-vps.md`.
- **n8n conectado** a la API del Next (env `INMATH_*`, reachability probada, 5
  workflows importados inactivos). Activación por flujo bloqueada por WhatsApp
  Meta / Google OAuth / SMTP. Ver `n8n-conexion.md`.

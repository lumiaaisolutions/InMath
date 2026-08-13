# inmath-next — Migración total a Next.js + Prisma

Sustituye a TODO el PHP (`sitio/`, `panel/`, `backend/`) con una sola app
Next.js (App Router, TypeScript) sobre la **misma MySQL** (patrón strangler:
cero pérdida de datos, el PHP sigue vivo hasta el corte de F4).

## Mapa de la aplicación

| Ruta | Qué es | Port de |
|---|---|---|
| `/` `/agenda` `/pago` | Sitio público (SSR, paridad 1:1) | `sitio/public/*.php` |
| `/api/agente` `/api/cta` | Mathy del sitio (Gemini) y CTA | `sitio/public/api/agente.php` |
| `/panel/login` | Login con carrusel personalizable | `panel/vistas/login.php` |
| `/panel` + módulos | CRM completo (pipeline, citas, alumnos, pagos, usuarios, configuración, prompts, personalizar-login, perfil) | `panel/` |
| `/api/bot/procesar` | Motor del bot de WhatsApp (para n8n) | `backend/src/Bot/MotorBot.php` |
| `/api/citas/*` `/api/pagos/*` `/api/asesores` `/api/reportes/*` | API máquina-a-máquina (X-API-Key, contrato idéntico al PHP) | `backend/src/Controllers/*` |
| `/api/webhooks/pago/{procesador}` | Webhooks de pago (firma por driver, sin API key) | `WebhooksController` |

## Estructura de `src/`

- `app/(sitio)/` y `app/(panel)/` — **dos root layouts** (route groups) porque
  sitio y panel tienen CSS distintos con las mismas clases (`inmath.css` /
  `panel.css`, copiados byte a byte del PHP).
- `app/api/` — rutas máquina-a-máquina (n8n / webhooks).
- `lib/` — ports fieles de los servicios PHP: `agenda.ts`, `prospectos.ts`,
  `conversaciones.ts`, `inscripcion.ts`, `pagos.ts`, `pagos-drivers.ts`
  (simulado + MercadoPago), `bot.ts` (MotorBot), `reportes/` (PDF puro),
  `gemini.ts`, `fechas.ts`, `panel/` (sesión, media, formato).
- `generated/prisma/` — cliente Prisma introspectado de la BD real (14 modelos).

## Convenciones críticas

1. **Fechas** (`lib/fechas.ts`): la BD guarda DATETIME en hora local de México
   (herencia del PHP). Prisma los trata como UTC, así que TODO usa "hora de
   pared etiquetada UTC" (`Date.UTC` + `getUTC*`). Romper esto corre las citas
   6 horas.
2. **Auth del panel** (`lib/panel/sesion.ts`): cookie HMAC firmada con
   `APP_SECRET`; las contraseñas se verifican con bcryptjs contra los hashes
   `$2y$` del PHP (compatible en ambos sentidos — verificado).
3. **Storage compartido durante el strangler**: comprobantes y reportes en
   `backend/storage/` y uploads del panel en `panel/public/img/` (los mismos
   directorios que lee el PHP). En el VPS se apuntan con `STORAGE_DIR`,
   `COMPROBANTES_DIR` y `PANEL_IMG_DIR`.
4. **API key** (`lib/api.ts`): header `X-API-Key` contra `API_KEY`, la misma
   del PHP, para que n8n (si se activa) no cambie nada más que la URL.

## Desarrollo local

```bash
npm run dev -- -p 3005     # con la MySQL local (ver ../docs/credenciales.md)
npx tsc --noEmit && npx eslint src
npm run build              # standalone (output en .next/standalone)
```

Usuario de prueba del panel local: `prueba@lumia.local` / `lumia-prueba-2026`
(solo existe en la BD local; se elimina con `../scripts/limpiar-datos-prueba.sql`).
`BOT_SIMULADO=1` en `.env` responde sin llamar a Gemini (mismos triggers que el PHP).

## Deploy

`Dockerfile` + `docker-compose.yml` listos; variables en
`.env.production.example`. Procedimiento completo, mapa real de producción y
plan de corte: **`../docs/despliegue-vps.md`**.

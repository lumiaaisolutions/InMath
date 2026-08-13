# Credenciales y accesos

> ⚠️ **TODOS los valores de este documento son de DESARROLLO/PRUEBA local.**
> Antes de producción hay que cambiar cada contraseña, API key y secreto. Este
> archivo no debe subirse con valores reales de producción a un repositorio público.

## URLs y puertos (entorno local de esta sesión)

| Servicio | URL local | Document root |
|---|---|---|
| Sitio web público | http://127.0.0.1:8125 | `sitio/public` |
| Panel CRM | http://127.0.0.1:8124 | `panel/public` |
| API backend | http://127.0.0.1:8123 | `backend/public` |
| Salud de la API | http://127.0.0.1:8123/api/health | — |
| **inmath-next (sitio + panel + API)** | http://localhost:3005 (`npm run dev -- -p 3005`) | `inmath-next/` |

Cómo levantarlos: ver [`instalacion-y-despliegue.md`](instalacion-y-despliegue.md).

## inmath-next (migración)

- Panel: http://localhost:3005/panel — usuario de prueba local
  `prueba@lumia.local` / `lumia-prueba-2026` (además funcionan los usuarios
  seed de abajo: mismos hashes bcrypt de la BD).
- `.env` local: `DATABASE_URL` (socket de la MySQL de prueba), `APP_SECRET`,
  `API_KEY` (la misma del backend PHP), `PAGO_WEBHOOK_SECRET`, `GEMINI_API_KEY`,
  `BOT_SIMULADO=1`. Plantilla de producción: `inmath-next/.env.production.example`.
- Producción real (verificado 13-ago-2026): VPS `srv1698236.hstgr.cloud`
  (`ssh root@2.24.123.93`), nginx → `/var/www/inmath/`, BD MySQL local `inmath`
  (credenciales en `/var/www/inmath/backend/.env` del VPS), DNS por Cloudflare
  proxied. Detalle: [`despliegue-vps.md`](despliegue-vps.md).

## Panel CRM — usuarios seed

Todos con la misma contraseña de prueba: **`Cambiar.123`** (obligatorio cambiarla).

| Rol | Correo | Puede |
|---|---|---|
| Administrador | `admin@inmath.mx` | Todo, incluye Prompts del bot y Configuración |
| Asesor | `asesor1@inmath.mx` | Operación del pipeline (sin Configuración) |
| Asesor | `asesor2@inmath.mx` | Operación del pipeline |
| Asesor | `asesor3@inmath.mx` | Operación del pipeline |

El hash de la contraseña se define en `database/seeds/001_datos_iniciales.sql`
(bcrypt). Para regenerarlo:

```bash
php -r "echo password_hash('TU_NUEVA_CONTRASEÑA', PASSWORD_BCRYPT), PHP_EOL;"
```

## API backend (máquina-a-máquina, la usa n8n)

- **Header:** `X-API-Key`
- **Valor local:** `clave-de-prueba-local-123`
- Se valida contra `API_KEY` en `backend/.env`.
- Excepciones sin API key: `GET /api/health` y `POST /api/webhooks/pago/{procesador}`
  (este último valida la firma del procesador, no la API key).

Generar una API key real:

```bash
php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
```

## Base de datos (instancia local de prueba)

Es una instancia MySQL desechable levantada en el scratchpad de la sesión.

| Parámetro | Valor local |
|---|---|
| Socket | `/tmp/exani2-test.sock` |
| Base de datos | `exani2` (en producción usar `inmath`) |
| Usuario | `root` |
| Contraseña | *(vacía)* |

En producción se configuran vía `backend/.env` (`DB_HOST`, `DB_PORT`, `DB_NAME`,
`DB_USER`, `DB_PASS`, o `DB_SOCKET`). Plantilla: `backend/.env.example`.

## Pagos — procesador simulado (desarrollo)

- Config activa: `procesador_pago_activo = simulado` (tabla `configuraciones`).
- Webhook firmado con HMAC-SHA256:
  - Header: `X-Firma-Simulada`
  - Secreto local (`PAGO_WEBHOOK_SECRET` en `.env`): `secreto-pruebas-999`
  - Cuerpo: `{"referencia_externa":"SIM-...","estado":"pagado|fallido"}`

Ejemplo de webhook de prueba:

```bash
CUERPO='{"referencia_externa":"SIM-1-abc","estado":"pagado"}'
FIRMA=$(php -r 'echo hash_hmac("sha256",$argv[1],"secreto-pruebas-999");' "$CUERPO")
curl -X POST http://127.0.0.1:8123/api/webhooks/pago/simulado \
  -H "X-Firma-Simulada: $FIRMA" -d "$CUERPO"
```

Los procesadores reales (Stripe/Conekta/MercadoPago) requieren sus propias
credenciales y aún están pendientes de decidir: ver [`pagos.md`](pagos.md).

## Contenido completo de `backend/.env` (local)

```env
DB_SOCKET=/tmp/exani2-test.sock
DB_NAME=exani2
DB_USER=root
DB_PASS=
API_KEY=clave-de-prueba-local-123
APP_ENV=desarrollo
APP_TZ=America/Mexico_City
BOT_SIMULADO=1            # el bot responde de forma simulada, sin llamar a Gemini
PAGO_WEBHOOK_SECRET=secreto-pruebas-999
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.6-flash
APP_URL=
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_WEBHOOK_SECRET=
```

> Nota: en producción `BOT_SIMULADO=0` — el motor del bot (`App\Bot\MotorBot`)
> ya llama a Gemini de verdad usando el mismo `GEMINI_API_KEY` que el agente
> Mathy (son dos clientes independientes: `App\Bot\GeminiClient` para el bot,
> `App\IA\GeminiClient` para Mathy). Localmente sigue en `1` porque no tiene
> caso llamar a la API real en desarrollo — cambiar a mano si se necesita
> probar el flujo real desde local.

## Credenciales que faltan (producción)

Estas dependen del cliente y aún no existen (ver [`fases-y-pendientes.md`](fases-y-pendientes.md)):

- WhatsApp Business Cloud API de Meta: `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`,
  `WHATSAPP_VERIFY_TOKEN` (se configuran en n8n). Pendiente explícitamente —
  sin esto el bot (ya conectado a Gemini) no recibe tráfico real.
- Google Calendar OAuth (en n8n). Pendiente explícitamente.
- `MERCADOPAGO_ACCESS_TOKEN` y `MERCADOPAGO_WEBHOOK_SECRET` — procesador
  elegido (MercadoPago), driver ya implementado (`DriverMercadoPago`), solo
  falta que el cliente genere las credenciales de producción. Ver [`pagos.md`](pagos.md).
- SMTP para el envío de reportes por correo (en n8n) — pendiente
  explícitamente; el nodo de envío ya existe en el flujo, solo falta la
  credencial.

## Checklist de endurecimiento antes de producción

- [ ] Cambiar la contraseña de los 4 usuarios seed. *(producción sigue con la contraseña de prueba documentada arriba — cambiarla antes de dar acceso real a asesores)*
- [x] Generar `API_KEY` nueva (32 bytes) y ponerla también en n8n. *(generada en producción; falta configurarla en n8n cuando exista)*
- [x] Generar `PAGO_WEBHOOK_SECRET` nuevo. *(generado en producción)*
- [x] `APP_ENV=produccion` (oculta el detalle de los errores 500).
- [x] Usuario de MySQL dedicado con permisos mínimos (no `root`).
- [x] Servir todo por HTTPS (Meta exige HTTPS para el webhook de WhatsApp). *(SSL automático de Hostinger)*
- [x] Motor del bot conectado a un proveedor de IA real. *(`BOT_SIMULADO=0` en producción, usando Gemini vía `App\Bot\GeminiClient`; falta solo la conexión de WhatsApp Business Cloud API de Meta para que le llegue tráfico real — ver [`fases-y-pendientes.md`](fases-y-pendientes.md))*

## Agente de IA "Mathy" (Gemini) — producción

- **Variables:** `GEMINI_API_KEY`, `GEMINI_MODEL=gemini-3.6-flash` en `backend/.env`.
- **Cliente:** `backend/src/IA/GeminiClient.php`. Fija
  `generationConfig.thinkingConfig.thinkingLevel = "low"` — necesario porque,
  con la configuración por defecto, Gemini 3.6 Flash gasta la mayoría del
  presupuesto de `maxOutputTokens` en razonamiento interno y la respuesta al
  usuario llega cortada a la mitad (`finishReason: MAX_TOKENS` con el texto
  final trunco). Confirmado contra la API real antes de fijar el valor.
- **Endpoints:** `sitio/public/api/agente.php` (público, valida CSRF) y
  `/panel/accion/agente-ia` (requiere sesión de panel, en
  `panel/lib/acciones.php`). Cada uno tiene su propio system prompt — el del
  sitio orientado a prospectos, el del panel orientado a asesores usando el
  CRM.
- Generar una API key nueva desde [Google AI Studio](https://aistudio.google.com/apikey)
  si hay que rotarla.

## Pendiente: color de acento del branding de reportes PDF en producción

El seed `004_reportes_fase6.sql` usa `ON DUPLICATE KEY UPDATE clave = clave`
(no-op), así que corregir el archivo del seed **no** actualiza una fila que ya
existe en producción. La fila `reporte_branding` en la tabla `configuraciones`
de producción todavía tiene `color_acento_b: "8B6FF0"` (morado, valor viejo);
el código y el seed ya usan `1E9EB8`. Falta correr a mano en phpMyAdmin
(`auth-db943.hstgr.io`, base `u221820910_inmath`):

```sql
UPDATE configuraciones
SET valor = JSON_SET(valor, '$.color_acento_b', '1E9EB8')
WHERE clave = 'reporte_branding';
```

No se pudo ejecutar en esta sesión porque la pestaña de phpMyAdmin ya logueada
expiró y pide contraseña de nuevo (no se puede reautenticar sin la contraseña
de la cuenta). Solo afecta el color de acento secundario en el pie del PDF de
reporte semanal — cosmético, no bloquea nada.

## Variables nuevas (ago 2026)

- `WHATSAPP_NUMERO` — número wa.me del sitio (vacío = botón oculto). PENDIENTE real.
- `PANEL_URL` — URL del panel para el botón "Entrar" del sitio (local :8124).
- Credenciales de alumnos: se generan al aprobar su pago (usuario = WhatsApp,
  contraseña temporal bcrypt en `alumnos.password_hash`); se usarán en Fase 5.

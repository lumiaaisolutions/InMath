# Instalación y despliegue

Credenciales y valores concretos: [`credenciales.md`](credenciales.md).

## Requisitos

- PHP ≥ 8.1 (sin dependencias de Composer; corre en hosting compartido)
- MySQL ≥ 8.0 (utf8mb4, InnoDB)
- n8n self-hosted (VPS con Ubuntu; ver `automatizaciones-n8n/`)

## Instalación local

```bash
# 1. Configurar el entorno
cp backend/.env.example backend/.env   # editar credenciales

# 2. Crear la base de datos
mysql -u root -e "CREATE DATABASE inmath CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 3. Aplicar migraciones + seeds
php backend/scripts/migrar.php

# 4. Levantar los servidores (cada uno en una terminal)
php -S 127.0.0.1:8123 -t backend/public backend/public/index.php   # API
php -S 127.0.0.1:8124 -t panel/public   panel/public/index.php     # Panel
php -S 127.0.0.1:8125 -t sitio/public                              # Sitio

# 5. Verificar
curl http://127.0.0.1:8123/api/health   # -> {"estado":"ok","base_datos":"ok"}
```

> **Nota sobre el entorno de la sesión:** los servidores locales se lanzan en segundo
> plano y el entorno los pausa/mata al quedar inactivo. Los datos sobreviven porque
> viven en el datadir de MySQL. Basta relanzar los 4 procesos (MySQL + 3 `php -S`)
> con los comandos de arriba; no hay que volver a migrar.

## Migraciones

`php backend/scripts/migrar.php` aplica en orden los `.sql` de
`database/migrations/` y `database/seeds/`, registrando cada uno en la tabla
`migraciones` (idempotente: no reaplica lo ya aplicado).

- Solo esquema (sin seeds): `php backend/scripts/migrar.php --solo-migraciones`
- Sin SSH (hosting compartido): importar los `.sql` en orden desde phpMyAdmin.

Detalle del esquema: [`base-de-datos.md`](base-de-datos.md).

## Despliegue

### Hosting compartido

- Subir `backend/`, `panel/` y `sitio/` (comparten `backend/.env` y las clases de
  `backend/src/`).
- Document roots por subdominio:
  - `dominio.com` → `sitio/public`
  - `panel.dominio.com` → `panel/public`
  - `api.dominio.com` → `backend/public`
- El `.htaccess` de cada `public/` enruta a `index.php`.
- Aplicar migraciones importando los `.sql` vía phpMyAdmin si no hay SSH.

### VPS (Ubuntu)

- Apache/Nginx + PHP-FPM + MySQL.
- n8n corre en el mismo VPS con Docker: ver `automatizaciones-n8n/docker-compose.yml`.
- Poner n8n detrás de reverse proxy con TLS **antes** de conectar el webhook de Meta
  (exige HTTPS).

### Pantallas de estado (opcional pero recomendado)

`panel/public/estado/` y `sitio/public/estado/` traen 3 pantallas (carga /
mantenimiento / 503). Para usarlas como página de error:

- Apache: `ErrorDocument 503 /estado/loading-server-down.html`
- Nginx: `error_page 502 503 504 /estado/loading-server-down.html;`

## Seguridad al desplegar

Ver el checklist de endurecimiento en [`credenciales.md`](credenciales.md#checklist-de-endurecimiento-antes-de-producción).

## Producción actual: Hostinger (inmath.lumiaaisolutions.com)

El sitio y el panel están desplegados en un hosting compartido de Hostinger
(plan Business, cuenta `u221820910`), bajo el subdominio
`inmath.lumiaaisolutions.com`, con SSL automático (Let's Encrypt vía hPanel).

**Disposición de carpetas (distinta al repo local):** en el servidor, el
contenido de `sitio/public/` se despliega directo en `public_html/` (sin la
carpeta `sitio/` ni `public/` intermedias), y el de `panel/public/` en
`public_html/panel/`. `backend/` cuelga de la raíz de la cuenta, **fuera** de
`public_html/` (no accesible por HTTP). Por eso `BACKEND_PATH` y `PANEL_PATH`
en `sitio/public/_comun.php` y `panel/public/index.php` no usan una
profundidad fija de `dirname()`: prueban primero si `../backend` existe a 1
nivel y si no, prueban a 2 (ver el comentario en cada archivo). Si cambia la
disposición de despliegue, revisar esa lógica antes de asumir que un
`dirname(__DIR__, N)` fijo va a funcionar.

El panel se sirve como subcarpeta del mismo dominio
(`inmath.lumiaaisolutions.com/panel`), no como subdominio propio — por eso
existe `PANEL_BASE_PATH=/panel` en `backend/.env` y el helper `u()` /
`rutaPanel()` en `panel/lib/ayuda.php` que agregan/quitan ese prefijo en vez
de asumir que el panel vive en la raíz de su propio host.

**Despliegue de código:** GIT deploy de hPanel (Advanced → GIT), apuntando al
repo público `https://github.com/lumiaaisolutions/InMath.git`, rama `main`.
hPanel clona a un directorio temporal dentro de `public_html/`; hay que mover
manualmente el contenido a su lugar final (ver estructura arriba) porque el
clon conserva la disposición del repo (`sitio/public/`, `panel/public/`, etc.)
y no la disposición aplanada que ya vive en el servidor. **Al mover archivos
individuales sobre un archivo ya existente con el mismo nombre, el "Move" del
file manager de Hostinger falla en silencio (no sobreescribe, no avisa)** —
hay que borrar el archivo destino primero y luego mover el nuevo.

**Base de datos:** MySQL de Hostinger, base `u221820910_inmath`, usuario
dedicado `u221820910_inmath` (no root). Migraciones y seeds se cargaron a mano
vía el editor SQL de phpMyAdmin (no hay SSH con acceso a `mysql` CLI en este
plan para el usuario de la app, aunque sí hay SSH de cuenta — ver abajo).

**Agente de IA (Mathy):** usa Google Gemini (`gemini-3.6-flash`), configurado
en `backend/.env` con `GEMINI_API_KEY` y `GEMINI_MODEL`. El cliente
(`backend/src/IA/GeminiClient.php`) fija `thinkingConfig.thinkingLevel: low`
— sin esto, el modelo gasta la mayoría de `maxOutputTokens` en razonamiento
interno ("thinking") y la respuesta llega cortada a la mitad (visto en vivo:
383 de 400 tokens usados en pensamiento, texto final trunco en
`finishReason: MAX_TOKENS`).

**SSH:** hay acceso SSH a la cuenta (`ssh -p 65002 u221820910@86.38.202.72`),
pero requiere contraseña que no se ha configurado en esta sesión — todo el
despliegue se hizo vía hPanel (GIT deploy) y el file manager web
(`srv943-files.hstgr.io`), sin necesitar terminal.

**Variables de entorno de producción** (`backend/.env`, no versionado):
mismas claves que `backend/.env.example` más `GEMINI_API_KEY`,
`GEMINI_MODEL` y `PANEL_BASE_PATH=/panel`. El archivo `.env` no se puede
guardar directamente vía el editor del file manager si el WAF de Hostinger
bloquea escrituras a archivos llamados exactamente `.env` (protección
anti-scanner común en hosting compartido) — el workaround es crear el
contenido bajo otro nombre de archivo y renombrarlo después.

**phpMyAdmin (auth-db943.hstgr.io) también expira la sesión por inactividad**,
igual que el file manager — si una consulta SQL directa es necesaria (p. ej.
corregir un valor de configuración sin pasar por una migración), y la pestaña
ya logueada muestra el formulario de login al volver a usarla, no hay forma de
re-autenticar sin la contraseña de la cuenta de Hostinger — pedirle al usuario
que la actualice él mismo o que reautorice explícitamente, no adivinar/probar
credenciales.

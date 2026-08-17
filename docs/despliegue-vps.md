# F4 — Despliegue de inmath-next en el VPS

## Mapa REAL de producción (verificado 13-ago-2026)

Cruzando el hPanel de Hostinger, el repo de infraestructura
(`~/Desktop/LUMIA/migracion/10-inmath-migracion.md`) y pruebas HTTP:

- **Producción vive en el VPS** `srv1698236.hstgr.cloud` (`ssh root@2.24.123.93`,
  Ubuntu 24.04, KVM 2): nginx sirve `https://inmath.lumiaaisolutions.com/` desde
  `/var/www/inmath/public_html/` con `/var/www/inmath/backend/` como hermano
  (PHP monolito, panel en `/panel`). SSL emitido, vence 2026-11-08.
- **DNS ya apunta al VPS**: Cloudflare (proxied) → A `2.24.123.93`. El "website"
  de inmath en el hosting compartido Business está decommissionado (código y BD
  borrados el 10–13 de agosto; por eso hPanel dice "domain isn't connected").
- **La BD de producción es MySQL local del VPS**, base `inmath` (importada de
  `u221820910_inmath`, 13 tablas). Credenciales: en `/var/www/inmath/backend/.env`
  del VPS.
- **n8n NUNCA se conectó**: los workflows de `automatizaciones-n8n/flujos/` no se
  importaron a ninguna instancia real, `backend/public/index.php` (la API HTTP)
  no está expuesta por nginx, y el cliente decidió no usar la API de WhatsApp de
  Meta (usa wa.me + Mathy en el sitio). El Docker del VPS corre `n8n-stack` y
  `tradetrove`, pero nada de Inmath depende de n8n hoy.
- **⚠️ El VPS expira el 23-ago-2026** — renovarlo es manual (pago del dueño).

Consecuencias: **no hay corte de n8n que coordinar** (docs/corte-n8n.md aplica
solo si algún día se activa n8n) y **no hay que tocar DNS** — el corte es un
cambio de nginx dentro del propio VPS.

## Procedimiento de deploy (paralelo → corte → retiro)

Paquete listo en el repo: `Dockerfile`, `docker-compose.yml`,
`.env.production.example` (standalone verificado con smoke test local).

```bash
# 1. Copiar el proyecto al VPS
rsync -a --exclude node_modules --exclude .next \
  ~/Desktop/LUMIA/Inmath/inmath-next/ root@2.24.123.93:/srv/inmath-next/

ssh root@2.24.123.93
cd /srv/inmath-next

# 2. Configurar .env de producción
cp .env.production.example .env
grep -E '^DB_' /var/www/inmath/backend/.env   # credenciales reales de MySQL
#   DATABASE_URL="mysql://USER:PASS@127.0.0.1:3306/inmath"  ← contenedor: usar
#   host.docker.internal o la IP del bridge (o network_mode: host)
#   API_KEY / PAGO_WEBHOOK_SECRET / GEMINI_API_KEY: copiarlos del mismo .env PHP
#   APP_SECRET: openssl rand -hex 32

# 3. Migrar archivos compartidos del PHP al storage del contenedor
mkdir -p /srv/inmath/storage /srv/inmath/panel-img
cp -r /var/www/inmath/backend/storage/*             /srv/inmath/storage/
cp -r /var/www/inmath/public_html/panel/img/avatars /srv/inmath/panel-img/ 2>/dev/null || mkdir -p /srv/inmath/panel-img/avatars
cp -r /var/www/inmath/public_html/panel/img/login   /srv/inmath/panel-img/ 2>/dev/null || mkdir -p /srv/inmath/panel-img/login

# 4. Levantar
docker compose up -d --build
curl -s -o /dev/null -w '%{http_code}\n' localhost:3005/          # 200 esperado
curl -s -H "X-API-Key: $(grep ^API_KEY /var/www/inmath/backend/.env | cut -d= -f2)" \
  localhost:3005/api/asesores                                     # JSON esperado

# 5. PRUEBA EN PARALELO (sin tocar el sitio vivo): vhost de staging
#    nuevo.inmath.lumiaaisolutions.com → proxy_pass http://127.0.0.1:3005
#    (+ registro A proxied en Cloudflare hacia 2.24.123.93 + certbot)
#    Los asesores prueban el panel nuevo contra la MISMA BD.

# 6. CORTE: en el server block de inmath.lumiaaisolutions.com sustituir el
#    root PHP por: location / { proxy_pass http://127.0.0.1:3005; ... }
#    nginx -t && systemctl reload nginx
#    Rollback = revertir el server block y reload (segundos).

# 7. RETIRO DEL PHP (tras días estables): correr antes
#    scripts/limpiar-datos-prueba.sql contra la BD inmath; luego archivar y
#    borrar /var/www/inmath/{public_html,backend}. El repo conserva la historia.
```

## ⚠️ MySQL + Prisma: cuenta mysql_native_password por TCP (deploy 17-ago)

El motor Rust de Prisma **no negocia de forma fiable `caching_sha2_password` de
MySQL 8** — falla intermitentemente con `Unknown authentication plugin
'sha256_password'` cuando el caché de contraseña del server está frío (funciona
mientras el PHP lo mantiene caliente, y se cae después). El socket NO lo
resuelve. Solución robusta y definitiva:
- Crear una cuenta dedicada con native_password que el TCP alcance directo:
  `CREATE USER 'inmath'@'127.0.0.1' IDENTIFIED WITH mysql_native_password BY '…';`
  `GRANT ALL ON inmath.* TO 'inmath'@'127.0.0.1'; FLUSH PRIVILEGES;`
  (y el `@localhost` también se pasó a native, para el PHP y el socket).
- `DATABASE_URL` por TCP: `mysql://inmath:PASS@127.0.0.1:3306/inmath`.
El PHP (PDO/mysqlnd) sigue conectando igual con cualquiera de los dos plugins.

## ⚠️ Modales/overlays con position:fixed → usar PORTAL a <body>

Los modales del panel (Agregar usuario/alumno/cita) salían como una **tira
arriba** en vez de centrados: un ancestro con `transform`/`filter`/
`backdrop-filter` (las tarjetas `.cabecera` del panel lo tienen) crea un
containing block y el `position:fixed` se ancla a ESE ancestro, no al viewport.
Regla: **todo overlay full-screen (`.us-velo`, `.confirmar-velo`, toasts) se
renderiza con `createPortal(node, document.body)`** (helper `EnBody` en
ClientePanel.tsx) para que el fixed sea relativo al viewport. Nunca dejar un
modal fixed anidado dentro de una tarjeta con glass/transform.

## ⚠️ pm2: usar delete + start al cambiar env, no restart

`pm2 restart --update-env` no siempre recarga el `.env`; para que un cambio de
`.env` tome efecto de forma fiable:
```bash
pm2 delete inmath-web
cd /var/www/inmath/web/.next/standalone && PORT=3010 pm2 start server.js --name inmath-web --update-env && pm2 save
```

## ⚠️ rsync incremental: NO pisar src/generated (motor Prisma Linux)

Al re-desplegar con `rsync src/ …:/…/web/src/`, el patrón de exclusión relativo
al root de transferencia es `generated`, **no** `src/generated` — si no, se pisa
el cliente Prisma Linux del VPS con el de Mac (darwin) y el build queda roto
(`could not locate the Query Engine for runtime debian-openssl-3.0.x`). Tras
cualquier rsync que toque `src/`, correr `npx prisma generate` en el VPS antes
del build. Comando correcto:
```bash
rsync -az -e "ssh -p 8080" --exclude generated src/ deploy@2.24.123.93:/var/www/inmath/web/src/
ssh -p 8080 deploy@2.24.123.93 "cd /var/www/inmath/web && npx prisma generate && npm run build && \
  rm -rf .next/standalone/.next/static .next/standalone/public && \
  cp -r .next/static .next/standalone/.next/static && cp -r public .next/standalone/public && cp .env .next/standalone/.env"
# luego el delete+start de pm2 de arriba
```

## Nota sobre MySQL desde el contenedor

Si MySQL del VPS solo escucha en localhost, la opción simple es correr el
contenedor con `network_mode: host` (y `PORT=3005` en el .env del contenedor)
o agregar `extra_hosts: ["host.docker.internal:host-gateway"]` al compose y
usar `host.docker.internal` en `DATABASE_URL`.

## Pendientes del dueño

- Renovar el VPS antes del 23-ago (pago).
- Autorizar el acceso al VPS para ejecutar esto (SSH `root@2.24.123.93` —
  el modo auto de Claude Code lo bloquea sin aprobación explícita del host),
  o correr los pasos de arriba a mano.
- Credenciales de MercadoPago + texto `datos_pago` (aún dice "PENDIENTE").

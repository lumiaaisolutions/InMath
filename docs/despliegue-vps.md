# F4 — Despliegue en el VPS (paralelo, luego corte)

## Lo que ya se sabe (verificado 13-ago-2026)

- **VPS Hostinger**: `srv1698236.hstgr.cloud` · `ssh root@2.24.123.93` ·
  Ubuntu 24.04, KVM 2, 100 GB. Ya corre Docker con `n8n-stack` y `tradetrove`.
  **⚠️ Expira el 23-ago-2026 — renovarlo antes del corte.**
- **Dominio**: `lumiaaisolutions.com` registrado en Hostinger pero el DNS lo
  sirve **Cloudflare** (IPs 104.21.x/172.67.x). `inmath.lumiaaisolutions.com`
  responde 200 con el sitio PHP (cookie `inmath_sitio`) — el hosting
  compartido "Business" de Hostinger tiene ese website con el dominio
  DESCONECTADO, así que **el origen real detrás de Cloudflare hay que
  confirmarlo desde dentro** (probable: el propio VPS).
- El corte de n8n está documentado en `docs/corte-n8n.md` (solo URL base).

## Decisión de BD

El strangler exige UNA sola MySQL compartida entre PHP y Next hasta retirar
el PHP. Al entrar al VPS, confirmar dónde vive la BD real (`backend/.env` del
PHP desplegado). Si ya está en el VPS: `DATABASE_URL` apunta ahí y listo. Si
está en el hosting compartido: habilitar Remote MySQL para la IP del VPS
durante la transición y migrarla al VPS al retirar el PHP.

## Pasos (todo el paquete ya está en el repo)

1. **Renovar el VPS** (hPanel → VPS → Renew). Manual: requiere pago.
2. Copiar el proyecto y arrancar el contenedor:
   ```bash
   rsync -a --exclude node_modules --exclude .next inmath-next/ root@2.24.123.93:/srv/inmath/app/
   ssh root@2.24.123.93
   cd /srv/inmath/app
   cp .env.production.example .env   # llenar valores (BD real, API_KEY del PHP, APP_SECRET nuevo)
   mkdir -p /srv/inmath/storage/comprobantes /srv/inmath/storage/reportes /srv/inmath/panel-img/{avatars,login}
   # migrar archivos existentes del PHP (comprobantes, reportes, avatars, login) a esos dirs
   docker compose up -d --build
   curl -s -H "X-API-Key: $API_KEY" localhost:3005/api/asesores   # humo
   ```
3. **Prueba en paralelo** (sin tocar el dominio): en Cloudflare crear
   `nuevo.inmath.lumiaaisolutions.com` → A `2.24.123.93` (proxied) y exponer
   el contenedor con el proxy del VPS (Traefik/Caddy hacia 127.0.0.1:3005).
   Los asesores prueban el panel nuevo con la MISMA BD; el PHP sigue vivo.
4. **Corte n8n** según docs/corte-n8n.md (cambiar URL base a la del VPS).
5. **Corte del dominio**: en Cloudflare apuntar `inmath` al VPS (o cambiar el
   origen del proxy). Rollback = revertir el registro.
6. **Retiro del PHP** tras unos días estables: apagar el sitio PHP y borrar
   `sitio/ panel/ backend/` del hosting (el repo conserva la historia).

## Pendientes que requieren al dueño

- Renovar el VPS (pago) — vence 23-ago.
- Acceso: autorizar SSH a `root@2.24.123.93` desde esta máquina (o ejecutar
  los pasos 2-3 a mano) y acceso al Cloudflare de `lumiaaisolutions.com`.
- Credenciales de MercadoPago + actualizar el texto `datos_pago` (sigue
  diciendo "PENDIENTE" y lo ve el usuario final).

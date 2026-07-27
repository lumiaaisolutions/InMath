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

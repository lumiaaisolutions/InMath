# Cursos Inmath — Sistema de ventas

Sistema de automatización de ventas para cursos en línea. Cierra todo el embudo de
venta dentro de WhatsApp — del primer contacto al pago — con visibilidad total del
proceso. Marca del producto: **Cursos Inmath**.

## Documentación

La documentación está **dividida por contexto** en `docs/` (un archivo, un tema; no se
satura un solo `.md`). Punto de entrada: **[`docs/README.md`](docs/README.md)**.

| Documento | Contexto |
|---|---|
| [`docs/credenciales.md`](docs/credenciales.md) | Accesos, usuarios, API keys, puertos, URLs |
| [`docs/instalacion-y-despliegue.md`](docs/instalacion-y-despliegue.md) | Levantar en local y desplegar |
| [`docs/arquitectura.md`](docs/arquitectura.md) | Visión general y decisiones |
| [`docs/base-de-datos.md`](docs/base-de-datos.md) | Esquema y configuración |
| [`docs/api.md`](docs/api.md) | Contrato de la API |
| [`docs/pagos.md`](docs/pagos.md) | Capa de procesadores de pago |
| [`docs/sistema-de-diseno.md`](docs/sistema-de-diseno.md) | Identidad visual y animaciones |
| [`docs/fases-y-pendientes.md`](docs/fases-y-pendientes.md) | Estado y pendientes |

> **Regla:** al documentar algo nuevo, colócalo en el `.md` de su contexto (o crea uno
> y enlázalo en `docs/README.md`), en vez de acumular todo aquí.

## Estructura del repositorio

| Carpeta | Módulo | Fase |
|---|---|---|
| `inmath-next/` | **Migración Next.js + Prisma (sustituye a todo el PHP)** — sitio, panel, bot, pagos, reportes | Migración |
| `backend/` | API PHP/MySQL — núcleo que consumen n8n y el panel *(en retiro)* | 1 |
| `database/` | Migraciones y seeds de MySQL | 1 |
| `automatizaciones-n8n/` | Workflows de n8n (mensajería, agenda, reportes) | 1–6 |
| `chatbot/` | Chatbot de WhatsApp con IA (Gemini) | 2 |
| `panel/` | Panel de control CRM multiusuario | 5 |
| `reportes/` | Generación de reportes PDF de avance | 6 |
| `sitio/` | Sitio web del curso (rediseño) | 7 |
| `docs/` | Documentación por contexto (ver arriba) | — |

## Migración a Next.js (ago-2026)

Por decisión del cliente, todo el PHP se está sustituyendo por **`inmath-next/`**
(Next.js + Prisma sobre la MISMA MySQL, patrón strangler). Estado: F0–F3
completas y verificadas E2E (sitio, panel CRM, bot, pagos, reportes); F4
(deploy en el VPS y retiro del PHP) preparada — ver
[`docs/despliegue-vps.md`](docs/despliegue-vps.md) para el mapa real de
producción y el procedimiento, y [`docs/arquitectura.md`](docs/arquitectura.md)
para la bitácora de fases.

## Estado de fases (sistema PHP original)

- [x] **Fase 1** — Fundamentos: esquema de BD, backend PHP, contrato de API para n8n
- [x] **Fase 2** — Chatbot de WhatsApp con IA *(conectado a Gemini; falta: app de WhatsApp Business Cloud API del cliente, pendiente explícitamente)*
- [x] **Fase 3** — Agenda automática *(falta: conectar credenciales de Google en n8n, pendiente explícitamente)*
- [x] **Fase 4** — Pagos *(MercadoPago elegido, driver real listo; falta: credenciales de producción del cliente)*
- [x] **Fase 5** — Panel de control (CRM)
- [x] **Fase 6** — Reportes automáticos *(falta: plantillas de WhatsApp aprobadas por Meta y SMTP)*
- [x] **Fase 7** — Sitio web *(falta: URL del sitio actual para la auditoría/migración)*

Los criterios de calificación, el prompt del bot y el contenido del reporte usan
valores iniciales razonables marcados como **placeholder**: se validan con el
cliente y se ajustan desde el panel, sin tocar código.

## Requisitos

- PHP ≥ 8.1 (sin dependencias de Composer; funciona en hosting compartido)
- MySQL ≥ 8.0 (utf8mb4, InnoDB)
- n8n self-hosted (VPS con Ubuntu; ver `automatizaciones-n8n/`)

## Instalación local

```bash
cp backend/.env.example backend/.env   # editar credenciales
mysql -u root -e "CREATE DATABASE inmath CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
php backend/scripts/migrar.php         # aplica migraciones y seeds
php -S localhost:8080 -t backend/public
curl http://localhost:8080/api/health
```

## Despliegue

- **Hosting compartido:** subir `backend/` y apuntar el document root a
  `backend/public/` (el `.htaccess` incluido enruta todo a `index.php`). Ejecutar las
  migraciones importando los `.sql` de `database/` vía phpMyAdmin si no hay SSH.
- **VPS (Ubuntu):** Apache/Nginx + PHP-FPM + MySQL; n8n corre en el mismo VPS con
  Docker (ver `automatizaciones-n8n/docker-compose.yml`).

La API se protege con una API key compartida (header `X-API-Key`) que n8n envía en
cada llamada. Ver `docs/api.md` para el contrato completo.

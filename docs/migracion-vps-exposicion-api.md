# Migración al VPS — exposición pendiente de `backend/public/index.php`

**Fecha:** 2026-08-13 (hallazgo original 2026-08-09/10, documentado acá para no perder el hilo — el trabajo de migración de infraestructura vive en `/Users/fernandotorres/Desktop/LUMIA/migracion/10-inmath-migracion.md`, pero el contexto de negocio de por qué importa es de este repo).

## Qué se migró y qué no

Al migrar Cursos Inmath del hosting compartido de Hostinger al VPS dedicado (`2.24.123.93`), se copiaron **ambas** carpetas manteniendo su relación de hermanos (`public_html/` y `backend/` al mismo nivel, tal como describe `arquitectura.md`):

- `public_html/` (sitio + panel) → sirviendo en `https://inmath.lumiaaisolutions.com/`, con nginx.
- `backend/` → copiada a `/var/www/inmath/backend/` en el VPS, pero **fuera del docroot de nginx** — solo es alcanzable por `require` de PHP desde `public_html/panel/index.php` (autoload por filesystem, sin HTTP), no por HTTP directo.

Esto significa que **`backend/public/index.php` — el front controller que expone el contrato de `api.md` (`/api/prospectos`, `/api/citas`, `/api/pagos`, etc., protegido por `X-API-Key`) — no está expuesto en ningún subdominio del VPS.** Nadie puede llamarlo por HTTP en producción ahora mismo.

## Por qué esto importaba (o no) al momento de migrar

En la migración se marcó como riesgo sin confirmar, porque el `.env` de producción trae un `API_KEY` real y el README raíz de este repo dice explícitamente "la usa n8n" — parecía una integración activa que se podía estar rompiendo.

Revisando este repo (`docs/fases-y-pendientes.md`, `docs/credenciales.md`) el panorama real es distinto:

- **Los workflows de n8n (`automatizaciones-n8n/flujos/*.json`) nunca se importaron a una instancia real de n8n** — el propio `fases-y-pendientes.md` lo dice explícitamente: "estructuralmente válidos pero no se han importado a una instancia real de n8n (no hubo Docker en el entorno de desarrollo)".
- `credenciales.md` confirma que la `API_KEY` de producción "falta configurarla en n8n **cuando exista**" — es decir, a la fecha de esa nota **no había una instancia de n8n en producción** consumiendo esta API.
- El corte de agosto 2026 (fases 1–3 completas, sección final de `fases-y-pendientes.md`) describe una arquitectura distinta a la original: el cliente decidió **no usar la API de WhatsApp Business de Meta** (por decisión explícita del cliente) y en su lugar usa `wa.me` directo + un asistente propio del sitio ("Mathy") que agenda citas llamando directo al `AgendaServicio` del backend **desde el propio proceso PHP del sitio**, no vía n8n/HTTP externo.

**Conclusión: no hay evidencia de que algo en producción dependa hoy de que `backend/public/index.php` esté expuesto por HTTP.** El pipeline de agenda/citas de la Fase 2-3 (Mathy) ya funciona sin necesidad de esa exposición, porque corre en el mismo proceso que `public_html/panel/`.

## Qué falta decidir (no ejecutar sin confirmación del cliente/usuario)

- Si en algún momento se retoma la automatización vía n8n (reportes semanales por correo, recordatorios de cita, carritos abandonados — los flujos ya están escritos en `automatizaciones-n8n/flujos/`), va a hacer falta:
  1. Desplegar una instancia de n8n (el `docker-compose.yml` de `automatizaciones-n8n/` asume Docker — **no hay Docker en el VPS actual de LUMIA**, ver `CLAUDE.md` del repo `clicktoeat`: "No hay Docker en prod" en el mismo tipo de hosting Hostinger/CageFS; hay que confirmar si el VPS dedicado de LUMIA sí tiene Docker antes de asumir que se puede levantar ahí tal cual).
  2. Exponer `backend/public/index.php` en un subdominio propio (p. ej. `inmath-api.lumiaaisolutions.com`) apuntando su docroot ahí, con nginx + PHP-FPM — mismo patrón que las otras apps del VPS.
  3. Configurar la `API_KEY` real en los nodos HTTP Request de los workflows importados.
- Alternativa más simple si nunca se retoma n8n: dejar `backend/` como está (inaccesible por HTTP, solo consumida por `require` desde el panel) y no exponer nada — no hay pérdida funcional actual.

## Estado

**Sin acción tomada.** Este documento es el registro de la decisión pendiente para no perder el hilo entre el repo de infraestructura (`migracion/`) y este repo de producto. Ver también `docs/fases-y-pendientes.md` de este mismo repo para el estado general del proyecto.

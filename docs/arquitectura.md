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
- Pendiente F1b: páginas /agenda (calendario aurora) y /pago (transferencia +
  comprobante). Luego F2 panel, F3 webhooks/PDF, F4 deploy y borrado del PHP.

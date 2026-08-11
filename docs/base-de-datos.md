# Base de datos

MySQL 8 / InnoDB / `utf8mb4`. Dinero en centavos (`INT`). Fechas en zona local
(`America/Mexico_City`). El backend PHP es la única fuente de verdad; ver
[`arquitectura.md`](arquitectura.md).

Esquema: `database/migrations/`. Datos iniciales: `database/seeds/`. Aplicar:
[`instalacion-y-despliegue.md`](instalacion-y-despliegue.md#migraciones).

## Tablas

| Tabla | Para qué |
|---|---|
| `usuarios` | Admin y asesores del panel (rol, `google_calendar_id`, activo) |
| `cursos` | Catálogo de cursos (precio en centavos, duración, activo) |
| `prospectos` | Contactos en el embudo. Etapa (ENUM), puntaje, `datos_calificacion` (JSON), asesor asignado |
| `alumnos` | Inscritos. `prospecto_id` UNIQUE (webhook duplicado no inscribe dos veces) |
| `conversaciones` | Una por prospecto+canal. Estado `bot`/`asesor`/`cerrada` |
| `mensajes` | Historial. `wa_message_id` UNIQUE → ingesta idempotente ante reintentos de Meta |
| `citas` | Agenda por asesor. `UNIQUE(asesor_id, inicio)` como última defensa anti-doble-reserva |
| `pagos` | Links y confirmaciones. `procesador` VARCHAR (configurable), `referencia_externa` UNIQUE |
| `bitacora_pipeline` | Auditoría de cada cambio de etapa (origen, usuario, nota) |
| `configuraciones` | Ajustes clave-valor editables sin desplegar |
| `prompts` | Prompt del bot versionado (editable desde el panel, reversible) |
| `avance_alumnos` | Avance semanal por alumno (`UNIQUE(alumno_id, fecha)`) |
| `reportes_generados` | Reportes PDF (`UNIQUE(alumno_id, periodo_inicio)` → cron idempotente) |
| `migraciones` | Control de migraciones aplicadas |

## Etapas del pipeline (ENUM `prospectos.etapa`)

`prospecto → calificado → cita_agendada → pago_pendiente → inscrito` (+ `descartado`).
Son contrato de producto; cambiarlas es decisión de producto, no de configuración.

## Claves de `configuraciones`

| Clave | Uso |
|---|---|
| `procesador_pago_activo` | `stripe` \| `conekta` \| `mercadopago` \| `simulado` |
| `recuperacion_carrito_horas` | Horas antes de recordar un pago sin completar |
| `recordatorio_cita_horas` | Antelación del recordatorio de cita |
| `criterios_calificacion` | Pesos y umbral de calificación del bot (JSON) — **placeholder, validar con cliente** |
| `duracion_cita_minutos` | Duración por defecto de las citas |
| `modelo_bot` | Modelo de Claude del motor conversacional |
| `max_mensajes_contexto` | Mensajes de historial enviados a Claude por turno |
| `horario_atencion` | Días y horario en que se ofrecen citas (JSON) |
| `max_slots_ofrecidos` | Cuántos horarios ofrece el bot por mensaje |
| `reporte_branding` | Marca, producto y colores del PDF de reporte (JSON, adaptable) |

## Concurrencia (3 asesores, sin condiciones de carrera)

Resumen; detalle en [`arquitectura.md`](arquitectura.md#concurrencia-3-asesores-sin-condiciones-de-carrera):

- **Asignación de prospecto:** transacción con `SELECT … FOR UPDATE` + `UPDATE …
  WHERE asesor_id IS NULL`; si otro ganó, responde 409.
- **Citas:** verificación de traslape en transacción + `UNIQUE(asesor_id, inicio)`.
- **Inscripción por pago:** alumno + cambio de etapa en una transacción; idempotente.

## Escala

500 alumnos / miles de prospectos en 6 meses es volumen bajo para MySQL con los
índices definidos (etapa, asesor, conversación+fecha). El cuello de botella real será
el rate limit de WhatsApp y la latencia de Claude, no la base de datos.

## Migraciones agregadas en agosto 2026

- **003_usuarios_modulos.sql:** `usuarios.modulos` (JSON, NULL = todos) —
  permisos por módulo del panel (pipeline/citas/alumnos/pagos); los admin ven
  todo. Editables en Panel → Usuarios.
- **004_fase3_comprobantes.sql:** `pagos.comprobante` + `comprobante_subido_en`;
  `alumnos.usuario` + `password_hash`; config `datos_pago`. También existen
  por upsert las claves `login_titulo`/`login_texto` (texto sobre el carrusel
  del login).

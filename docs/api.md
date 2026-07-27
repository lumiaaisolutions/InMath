# Contrato de API — backend PHP (consumida por n8n y el panel)

Base: `https://<dominio>/api`. Todas las rutas (excepto `/api/health`) requieren el
header `X-API-Key: <API_KEY>`. Cuerpos en JSON. Fechas en formato `Y-m-d H:i:s`,
zona `America/Mexico_City`. Dinero en centavos.

Errores: `{ "error": "mensaje", "detalles": { ... } }` con el código HTTP apropiado
(400 JSON inválido, 401 sin autorización, 404 no encontrado, 409 conflicto,
422 validación, 500 interno).

## Salud

- `GET /api/health` → `{ "estado": "ok", "base_datos": "ok" }`

## Prospectos

- `GET /api/prospectos?etapa=&asesor_id=&buscar=&limite=50&desplazamiento=0`
  → `{ "datos": [...], "total": n }`
- `POST /api/prospectos` — upsert por teléfono. n8n lo llama en cada mensaje entrante.
  Body: `{ "telefono_whatsapp": "5215512345678", "nombre"?, "fuente"?: "facebook|instagram|organico|otro", "curso_interes_id"? }`
  → 201 `{ "creado": true, "prospecto": {...} }` o 200 `{ "creado": false, ... }` si ya existía.
- `GET /api/prospectos/{id}` → prospecto con su `bitacora` de cambios de etapa.
- `PATCH /api/prospectos/{id}` — Body (todos opcionales): `nombre`, `etapa`
  (`prospecto|calificado|cita_agendada|pago_pendiente|inscrito|descartado`),
  `puntaje_calificacion`, `datos_calificacion` (objeto), `curso_interes_id`,
  `motivo_descarte`, y para la bitácora: `origen` (`bot|asesor|sistema`), `usuario_id`, `nota`.
- `POST /api/prospectos/{id}/asignar` — Body: `{ "asesor_id"?: n }`. Sin `asesor_id`,
  asigna al asesor activo con menos prospectos vivos (round-robin por carga, seguro
  ante concurrencia). 409 si ya tiene asesor.

## Conversaciones y mensajes

- `POST /api/conversaciones` — Body: `{ "prospecto_id": n }`. Devuelve la conversación
  de WhatsApp del prospecto (la crea si no existe).
- `PATCH /api/conversaciones/{id}` — Body: `estado` (`bot|asesor|cerrada`), `asesor_id`.
  Usado para el traspaso bot → asesor humano.
- `GET /api/conversaciones/{id}/mensajes?limite=100`
- `POST /api/mensajes` — Body: `conversacion_id` **o** `prospecto_id`, `direccion`
  (`entrante|saliente`), `emisor` (`prospecto|bot|asesor|sistema`), `contenido`,
  `tipo`? (`texto|imagen|audio|video|documento|plantilla|interactivo`),
  `wa_message_id`?, `estado_entrega`?, `metadatos`? (objeto).
  Idempotente por `wa_message_id`: un reintento de webhook devuelve
  `{ "duplicado": true, "mensaje": {...} }` con 200.

## Citas

- `GET /api/citas?asesor_id=&estado=&desde=&hasta=` — incluye nombre del prospecto,
  teléfono y nombre del asesor.
- `POST /api/citas` — Body: `{ "prospecto_id", "asesor_id", "inicio", "fin", "google_event_id"?, "meet_link"? }`.
  409 si el asesor tiene traslape. Mueve al prospecto a `cita_agendada` (con bitácora).
- `PATCH /api/citas/{id}` — Body: `estado` (`agendada|confirmada|completada|cancelada|no_asistio`),
  `google_event_id`, `meet_link`, `recordatorio_enviado_en`.

## Pagos

- `GET /api/pagos?estado=&prospecto_id=`
- `POST /api/pagos` — Body: `{ "prospecto_id", "curso_id", "monto_centavos"?, "moneda"?, "procesador"?, "link_pago"?, "referencia_externa"?, "expira_en"? }`.
  `monto_centavos` por defecto = precio del curso. Si trae `link_pago`, marca
  `link_generado_en` y mueve al prospecto a `pago_pendiente`.
- `PATCH /api/pagos/{id}` — Body: `estado`, `link_pago`, `referencia_externa`,
  `recordatorio_enviado_en`, `expira_en`, `metadatos`, `pagado_en`?.
  **Al pasar a `pagado`**: crea el alumno, lo liga al pago y mueve el prospecto a
  `inscrito`, todo en una transacción idempotente (webhook duplicado no inscribe dos veces).
- `GET /api/pagos/abandonados?horas=` — pagos pendientes con link enviado hace más de
  N horas (default: config `recuperacion_carrito_horas`), sin recordatorio previo y no
  expirados. n8n lo consulta para la recuperación de carritos.

## Catálogos y configuración

- `GET /api/cursos?activos=1` · `POST /api/cursos` · `PATCH /api/cursos/{id}`
- `GET /api/alumnos?estado=` · `GET /api/alumnos/{id}` · `PATCH /api/alumnos/{id}`
  (`estado`, `canal_reporte`, `nombre`, `email`)
- `GET /api/asesores` — asesores activos con carga de prospectos vivos.
- `GET /api/configuracion` · `GET /api/configuracion/{clave}` ·
  `PUT /api/configuracion/{clave}` — Body: `{ "valor", "tipo"?, "descripcion"?, "usuario_id"? }` (upsert).

Claves de configuración sembradas: `procesador_pago_activo`,
`recuperacion_carrito_horas`, `recordatorio_cita_horas`, `criterios_calificacion`,
`duracion_cita_minutos`, `modelo_bot`, `max_mensajes_contexto`, `horario_atencion`,
`max_slots_ofrecidos`, `reporte_branding`.

## Bot conversacional (Fase 2)

- `POST /api/bot/procesar` — n8n lo llama por cada mensaje entrante de WhatsApp.
  Body: `{ "telefono_whatsapp", "contenido", "wa_message_id"?, "nombre"?, "fuente"?, "tipo"? }`
  → `{ prospecto_id, conversacion_id, etapa, respuestas: [textos a enviar], accion,
  slots?, cita?, pago?, duplicado? }`. Acciones: `continuar | ofrecer_cita |
  agendar_cita | pasar_asesor | listo_para_pago | ninguna`. El motor persiste todos
  los mensajes, califica, agenda y genera links de pago por sí mismo; n8n solo envía
  las `respuestas` por WhatsApp y dispara sub-flujos (evento de Calendar si viene `cita`).

## Agenda (Fase 3)

- `GET /api/agenda/disponibilidad?desde=&dias=7&asesor_id=&max=30` — slots libres
  según `horario_atencion`, `duracion_cita_minutos` y las citas vivas de cada asesor.
- `GET /api/citas/por-recordar` — citas próximas (umbral `recordatorio_cita_horas`)
  sin recordatorio; n8n las procesa cada 15 min (flujo 04).

## Webhooks de pago (Fase 4)

- `POST /api/webhooks/pago/{procesador}` — **sin API key** (lo llama el procesador);
  la autenticidad la valida el driver (HMAC). Confirmado → inscripción automática.
- `POST /api/pagos/{id}/generar-link` — genera el link con el procesador activo
  (uso del panel).

## Avance y reportes (Fase 6)

- `POST /api/avance` — `{ alumno_id, porcentaje 0-100, fecha?, detalle?: {"Módulo": pct} }`
  (upsert por alumno+fecha).
- `GET /api/alumnos/{id}/avance`
- `POST /api/reportes/generar` — `{ semana? }`; genera los PDF de la semana
  (idempotente por alumno+semana).
- `GET /api/reportes/pendientes-envio` · `GET /api/reportes/{id}/archivo` (PDF)
  · `PATCH /api/reportes/{id}` `{ enviado_en }`.

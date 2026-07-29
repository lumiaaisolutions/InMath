# Chatbot de WhatsApp con IA — Fase 2

## Arquitectura

```
Meta (WhatsApp Cloud API) ──webhook──▶ n8n flujo 01 ──▶ POST /api/bot/procesar
                                          ▲                     │
                                          │              MotorBot (backend):
                                     envía respuestas    prompt de BD + historial
                                     por WhatsApp        → API de Gemini
                                                         → decide y persiste todo
```

n8n **solo transporta** (recibe el webhook de Meta y envía mensajes); el cerebro vive
en el backend (`backend/src/Bot/`), donde es versionable y testeable:

- `MotorBot.php` — orquesta: upsert del prospecto, registro idempotente del mensaje,
  contexto (prompt + historial + curso + criterios), llamada a Gemini, aplicación de
  la decisión (calificación → puntaje → etapa; traspaso a asesor; oferta de cita/pago).
- `GeminiClient.php` (namespace `App\Bot`) — cliente cURL de la API de Gemini, con
  el mismo contrato de mensajes (`role`/`content`) que tenía el antiguo
  `ClaudeClient`. Con `BOT_SIMULADO=1` en `.env` responde de forma determinista
  (para desarrollo y pruebas sin API key). **No confundir con `App\IA\GeminiClient`**,
  el cliente independiente que usa el agente "Mathy" del sitio/panel — mismo
  proveedor, contrato distinto, dos clases separadas a propósito.

## Contrato del bot con Gemini

El prompt de sistema vive en la tabla `prompts` (clave `sistema_bot`, versionado,
editable desde el panel en Fase 5 sin tocar código). Exige respuesta JSON:

```json
{"respuesta": "...", "accion": "continuar|ofrecer_cita|pasar_asesor|listo_para_pago",
 "calificacion": {"urgencia": 1-5, "fecha_examen": "YYYY-MM-DD", "presupuesto": "si|no|desconocido"}}
```

Si el modelo no devuelve JSON válido, el motor degrada con gracia: envía el texto tal
cual y no ejecuta acciones.

## Calificación configurable

`configuraciones.criterios_calificacion` define pesos y umbral:
`{"umbral": 60, "pesos": {"urgencia": 40, "fecha_examen": 30, "presupuesto": 30}}`
— urgencia escala 1–5; fecha de examen puntúa más mientras más próxima (≤90 días =
peso completo); presupuesto confirmado = peso completo. Al cruzar el umbral, el
prospecto pasa a `calificado` con registro en bitácora. **Los valores actuales son
placeholder hasta validarlos con el cliente.**

## Traspaso a asesor humano

`accion: pasar_asesor` → la conversación pasa a estado `asesor` (el bot deja de
responder), y el prospecto se asigna por round-robin de carga si no tenía asesor.
El asesor devuelve el control poniendo la conversación en estado `bot` (PATCH
/api/conversaciones/{id}).

## Configuración en Meta (pendiente de credenciales del cliente)

1. App en developers.facebook.com → producto WhatsApp → número de producción.
2. Webhook: URL del flujo 01 de n8n (HTTPS), verify token = `WHATSAPP_VERIFY_TOKEN`.
3. Suscribirse al campo `messages`.
4. Variables en n8n: `WHATSAPP_TOKEN` (token permanente del sistema), `WHATSAPP_PHONE_ID`.

## Estado de pruebas

- Flujo completo probado end-to-end en modo simulado (`BOT_SIMULADO=1`): alta,
  calificación con puntaje, oferta de cita, traspaso a asesor, silencio del bot
  cuando la conversación es del asesor, idempotencia ante webhooks repetidos.
- **Motor real de IA:** conectado a Gemini en producción (`BOT_SIMULADO=0`,
  reutiliza el mismo `GEMINI_API_KEY` que el agente Mathy).
- **No probado aún**: webhook real de Meta — falta la app de WhatsApp Business
  Cloud API del cliente (pendiente explícitamente, ver
  [`fases-y-pendientes.md`](../docs/fases-y-pendientes.md)), así que el motor no
  ha recibido tráfico real todavía aunque ya esté conectado.

# Estado de fases y pendientes

Sistema construido en 7 fases secuenciales y probado end-to-end en local (MySQL
temporal + `php -S`; bot en modo simulado `BOT_SIMULADO=1`).

## Fases

| Fase | Qué cubre | Estado |
|---|---|---|
| 1 — Fundamentos | Esquema BD, backend PHP, contrato de API para n8n | ✅ Completa |
| 2 — Chatbot IA | WhatsApp Cloud API + motor conversacional (Gemini, antes Claude), calificación configurable, prompts editables | ✅ Construida y conectada a Gemini (`BOT_SIMULADO=0`) · falta WhatsApp Business Cloud API de Meta |
| 3 — Agenda | Disponibilidad por asesor, Google Calendar + Meet, recordatorios | ✅ Construida · falta conectar Google en n8n |
| 4 — Pagos | Capa de procesador configurable, link en el chat, webhook → inscripción, recuperación de carrito | ✅ Construida · MercadoPago elegido y con driver real listo, falta credenciales del cliente (ver [`pagos.md`](pagos.md)) |
| 5 — Panel CRM | Multiusuario, pipeline visual, bitácora, calendario, editor de prompts | ✅ Completa |
| 6 — Reportes | Job semanal, PDF de avance, envío por WhatsApp/correo, branding configurable | ✅ Construida · el flujo de correo en n8n ya tiene el nodo y el contrato de datos listos, solo falta la credencial SMTP |
| 7 — Sitio web | Landing + página de pago + agenda embebida | ✅ Construida · falta auditoría del sitio actual del cliente |

## Pendientes que dependen del usuario/cliente

- **App de WhatsApp Business Cloud API (Meta)** — token, phone id, verify token.
  Sin esto el motor del bot (ya conectado a Gemini) no recibe ni envía mensajes
  reales — queda pendiente explícitamente a petición del cliente.
- **Google Calendar OAuth** en n8n (Fase 3). Pendiente explícitamente.
- **Credenciales de MercadoPago** (`MERCADOPAGO_ACCESS_TOKEN`,
  `MERCADOPAGO_WEBHOOK_SECRET`) — el driver ya está implementado y verificado
  contra la documentación oficial, solo falta que el cliente genere las
  credenciales de producción en su cuenta de MercadoPago. Ver [`pagos.md`](pagos.md).
- **Plantillas de WhatsApp** por aprobar en Meta: `recordatorio_cita`,
  `recordatorio_pago`, `reporte_semanal`.
- **SMTP** para el envío de reportes por correo (en n8n) — pendiente
  explícitamente; el flujo `08-reportes-semanales.json` ya tiene el nodo
  `emailSend` con un slot de credencial marcado `"CONFIGURAR"`, listo para que
  se le asigne una cuenta SMTP real desde la UI de n8n.
- **URL del sitio actual** del cliente para la auditoría/migración (Fase 7).

## Decisiones de producto por validar (van marcadas como *placeholder* en el código)

- **Criterios de calificación** del bot (pesos y umbral) — config `criterios_calificacion`.
- **Prompt del bot** (tabla `prompts`, editable desde el panel).
- **Contenido del reporte** de avance.
- **Precio y datos del curso** (tabla `cursos`; hoy "Curso en línea Inmath", $2,500 MXN, 12 semanas).

Estos se ajustan sin tocar código (desde el panel / configuración).

## Fuera de alcance (requiere confirmación explícita)

- Facturación fiscal (CFDI).
- Cualquier módulo no listado en las 7 fases.

## Nota sobre los flujos de n8n

Los JSON en `automatizaciones-n8n/flujos/` son estructuralmente válidos pero **no se
han importado a una instancia real de n8n** (no hubo Docker en el entorno de
desarrollo). Al desplegar, verificar que las versiones de nodos coincidan con la
versión de n8n instalada.

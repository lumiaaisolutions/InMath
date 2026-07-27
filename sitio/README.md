# Sitio web — Fase 7

Sitio nuevo del curso con página de pago integrada y agenda embebida, servido por
PHP junto al backend (reutiliza los servicios directamente: **la API key nunca llega
al navegador** y la agenda usa exactamente el mismo calendario/servicio que el
chatbot — imposible que se crucen horarios).

## Páginas

- `index.php` — landing: héroe sobre navy con la constelación del isotipo, beneficios,
  temario (lista sobre el hilo de nodos), precio (leído de la BD).
- `pago.php` — inscripción: nombre + WhatsApp → crea/reusa el prospecto (fuente
  `organico`), genera el link con el procesador activo y muestra el botón de pago.
  El prospecto entra al mismo pipeline del CRM (etapa `pago_pendiente`) y le aplica
  la recuperación de carrito.
- `agenda.php` — asesoría gratuita: slots reales de `AgendaServicio` (mismos 3
  asesores), reserva race-safe; el prospecto queda en `cita_agendada` y n8n envía la
  confirmación + evento de Google Calendar (flujo 03).
- `estado/` — pantallas de carga/mantenimiento/503 (identidad animada Inmath: la
  curva de avance dibujándose / desdibujándose / rota).

Formularios con CSRF + honeypot anti-bots. Teléfonos de 10 dígitos se normalizan al
formato WhatsApp de México (`521` + 10).

## Rebranding del cliente final

Todo el look sale de las variables de `:root` en `css/sitio.css` (`--primario`,
`--acento-a`, `--acento-b`, `--fuente`). El contenido (curso, precio, duración) se
lee de la base de datos.

## AUDITORÍA DEL SITIO ACTUAL — BLOQUEADA

La petición original pide auditar la página existente del cliente antes de tocar
nada. **Falta la URL del sitio actual.** Checklist al recibirla:

1. Identificar tecnología (WordPress/Wix/HTML estático/otro) — cabeceras HTTP,
   `/wp-json/`, generadores en el HTML.
2. ¿El hosting actual soporta PHP ≥ 8.1 + MySQL? Si es Wix/Squarespace → **migración
   obligatoria** (no permiten backend propio ni webhooks).
3. Inventario de contenido a conservar (el rediseño mantiene contenido, cambia imagen).
4. DNS/dominio: dónde está y quién lo controla (para apuntar subdominios
   `panel.` y `n8n.`).
5. SEO: URLs actuales indexadas → mapa de redirecciones 301.

## Desarrollo local

```bash
php -S localhost:8125 -t sitio/public
```

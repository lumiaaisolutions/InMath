# Documentación — Cursos Inmath

Índice maestro. La documentación está dividida por contexto para no saturar un solo
archivo: cada tema vive en su propio `.md`.

## Regla de documentación

> Todo el contexto del sistema se documenta en varios `.md` separados **por tema**.
> Un archivo, un contexto. Cuando agregues documentación nueva, colócala en el `.md`
> que le corresponda (o crea uno nuevo y enlázalo aquí), en lugar de acumular todo en
> `README.md`.

## Mapa de documentos

| Documento | Contexto |
|---|---|
| [`credenciales.md`](credenciales.md) | Accesos, usuarios, API keys, puertos, URLs locales |
| [`instalacion-y-despliegue.md`](instalacion-y-despliegue.md) | Cómo levantar el sistema en local y desplegarlo |
| [`arquitectura.md`](arquitectura.md) | Visión general, decisiones de diseño, concurrencia |
| [`base-de-datos.md`](base-de-datos.md) | Esquema, tablas, migraciones y claves de configuración |
| [`api.md`](api.md) | Contrato de la API que consumen n8n y el panel |
| [`pagos.md`](pagos.md) | Capa de procesadores de pago (Stripe/Conekta/MercadoPago/simulado) |
| [`portal-alumno-y-pagos.md`](portal-alumno-y-pagos.md) | **Portal del alumno (Fases 3–4)**: login validado por pago, login con Google, pago con tarjeta listo, material del curso, y lo que falta en n8n |
| [`sistema-de-diseno.md`](sistema-de-diseno.md) | Identidad visual, tokens, regla 60-30-10, animaciones, skills |
| [`fases-y-pendientes.md`](fases-y-pendientes.md) | Estado de las 7 fases y lo que falta por decidir/credenciales |
| [`migracion-vps-exposicion-api.md`](migracion-vps-exposicion-api.md) | Migración al VPS: por qué `backend/public/index.php` no quedó expuesto por HTTP y si hace falta |
| [`despliegue-vps.md`](despliegue-vps.md) | **F4 de la migración Next.js**: mapa real de producción (VPS/Cloudflare/BD) y procedimiento de deploy/corte/retiro del PHP |
| [`corte-n8n.md`](corte-n8n.md) | Corte de n8n al backend Next (aplica solo si n8n se activa; hoy nada lo consume) |
| [`n8n-conexion.md`](n8n-conexion.md) | **n8n conectado a la API del Next** (17-ago): env `INMATH_*`, 5 workflows importados y qué falta para activar cada uno |

## Documentación por módulo (en cada carpeta)

| README | Módulo |
|---|---|
| [`../inmath-next`](../inmath-next) | **Migración Next.js + Prisma** (sitio + panel + API n8n; sustituye al PHP) |
| [`../backend`](../backend) | API PHP/MySQL (ver `arquitectura.md` y `api.md`) — en retiro |
| [`../chatbot/README.md`](../chatbot/README.md) | Chatbot de WhatsApp con IA (Claude) |
| [`../panel/README.md`](../panel/README.md) | Panel de control CRM |
| [`../reportes/README.md`](../reportes/README.md) | Reportes automáticos en PDF |
| [`../sitio/README.md`](../sitio/README.md) | Sitio web público |
| [`../automatizaciones-n8n/README.md`](../automatizaciones-n8n/README.md) | Workflows de n8n |

## Qué es este sistema

Automatización de ventas para **cursos en línea**, marca **Cursos Inmath**. Cierra
el embudo completo dentro de WhatsApp (primer contacto → asesoría → inscripción →
pago → seguimiento de avance) con visibilidad total en un panel CRM. Backend
PHP/MySQL como fuente de verdad; n8n orquesta la mensajería; el bot usa la API de
Claude. Ver [`arquitectura.md`](arquitectura.md).

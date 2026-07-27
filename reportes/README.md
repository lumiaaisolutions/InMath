# Reportes automáticos — Fase 6

Cada lunes (flujo 08 de n8n) el sistema genera por alumno activo un PDF de avance y
lo envía por WhatsApp (plantilla aprobada por Meta, mensaje iniciado por el negocio)
o por correo, según `alumnos.canal_reporte`.

## Contenido del reporte

- Cabecera con la marca (banda navy + acento del degradado)
- Avance total del curso (% grande) con mensaje motivacional
- Gráfica de barras del histórico semanal (últimos 8 registros)
- Desglose por módulo con barras de progreso
- Pie con la marca y fecha de generación

**Supuesto declarado**: contenido placeholder hasta validarlo con el cliente
(la petición original dejaba el contenido exacto como decisión pendiente).

## Branding adaptable

La clave de configuración `reporte_branding` (editable desde el panel) controla
marca, producto, colores y pie — base Cursos Inmath, intercambiable por el
branding del curso del cliente sin tocar código.

## Fuente del avance

La plataforma de videos aún no está integrada; el avance se alimenta vía
`POST /api/avance` `{alumno_id, porcentaje, fecha?, detalle?: {"Módulo": pct}}`
(upsert por alumno+fecha). Cuando exista integración con la plataforma de videos,
ese sistema alimentará el mismo endpoint.

## Generación

- `App\Reportes\PdfLienzo` — escritor de PDF en PHP puro (sin dependencias; apto
  para hosting compartido).
- `App\Reportes\GeneradorReporte` — arma el reporte y lo guarda en
  `backend/storage/reportes/`. Idempotente por alumno+semana (UNIQUE en BD): el
  cron puede reintentarse sin duplicar.
- Endpoints: `POST /api/reportes/generar`, `GET /api/reportes/pendientes-envio`,
  `GET /api/reportes/{id}/archivo` (PDF binario), `PATCH /api/reportes/{id}`.

## Pendiente para producción

- Aprobar en Meta la plantilla `reporte_semanal` (header de documento + cuerpo).
- Configurar SMTP en n8n para el canal de correo.

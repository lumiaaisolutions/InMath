#!/bin/sh
# Cron semanal (lunes 8:00): genera el reporte de avance de la semana para
# cada alumno activo (idempotente) y avisa por correo con enlace al portal.
# Sustituye al flujo 08 de n8n (usa el SMTP propio de Next, sin depender de
# n8n). Vive EN EL REPO para que cada deploy (rsync --delete) lo conserve.
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 60 -X POST -H "x-api-key: $KEY" -H "Content-Type: application/json" -d '{}' http://localhost:3010/api/reportes/enviar >> /var/www/inmath/web/cron.log 2>&1
echo " [reportes-semanales $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

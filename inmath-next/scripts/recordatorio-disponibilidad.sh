#!/bin/sh
# Cron viernes 09:00: recordatorio al admin de definir horarios de la próxima semana.
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 60 -X POST -H "x-api-key: $KEY" http://localhost:3010/api/disponibilidad/recordatorio >> /var/www/inmath/web/cron.log 2>&1
echo " [recordatorio $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

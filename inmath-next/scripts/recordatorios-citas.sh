#!/bin/sh
# Cron cada 5 min: recordatorios de asesoría (1 día/3h/1h/10min antes) a
# prospecto y asesor. Vive EN EL REPO para que cada deploy (rsync --delete)
# lo conserve en el VPS.
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 60 -X POST -H "x-api-key: $KEY" http://localhost:3010/api/citas/recordatorios >> /var/www/inmath/web/cron.log 2>&1
echo " [recordatorios-citas $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

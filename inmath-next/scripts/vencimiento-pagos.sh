#!/bin/sh
# Cron cada hora: avisos de vencimiento de pago (24h/3h) y cancelación a las 72h.
# Vive EN EL REPO para que cada deploy (rsync --delete) lo conserve en el VPS.
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 60 -X POST -H "x-api-key: $KEY" http://localhost:3010/api/pagos/vencimiento >> /var/www/inmath/web/cron.log 2>&1
echo " [vencimiento $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

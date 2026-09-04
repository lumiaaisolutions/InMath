#!/bin/sh
# Cron cada 10 min: red de seguridad del link de Meet — reintenta generar el
# enlace de citas que quedaron sin él (robot n8n → respaldo directo de Google),
# se lo envía al prospecto en cuanto existe y avisa URGENTE al staff si a los
# 10-20 min sigue sin link.
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 120 -X POST -H "x-api-key: $KEY" http://localhost:3010/api/citas/reparar-links >> /var/www/inmath/web/cron.log 2>&1
echo " [reparar-links $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

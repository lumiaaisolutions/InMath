#!/bin/sh
# Cron cada 15 min: mantiene el modelo local de Ollama cargado y el prompt
# real de Mathy en caché (sustituye al viejo keep-warm crudo de Ollama).
KEY=$(grep '^API_KEY=' /var/www/inmath/web/.env | cut -d= -f2- | tr -d '"')
curl -s -m 240 -X POST -H "x-api-key: $KEY" http://localhost:3010/api/ia/calentar >> /var/www/inmath/web/cron.log 2>&1
echo " [calentar-mathy $(date '+%F %T')]" >> /var/www/inmath/web/cron.log

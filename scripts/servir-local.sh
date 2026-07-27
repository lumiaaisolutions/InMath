#!/usr/bin/env bash
# Levanta el entorno local de Cursos Inmath con un solo comando:
#   bash scripts/servir-local.sh
#
# Arranca (si no están) la base de datos de prueba y los 3 servidores PHP.
# Pensado para DESARROLLO. Los datos viven en el datadir de MySQL (persisten
# entre reinicios). Ctrl+C detiene los servidores PHP.
set -e

RAIZ="$(cd "$(dirname "$0")/.." && pwd)"
SOCK="${DB_SOCKET:-/tmp/exani2-test.sock}"
# Datadir de la BD de prueba. Por defecto usa el de la sesión actual; cámbialo con:
#   DEVDB=/ruta/a/datadir bash scripts/servir-local.sh
DEVDB="${DEVDB:-/private/tmp/claude-501/-Users-fernandotorres-Inmath/06345230-ef0d-4b61-b04c-b610c6145b56/scratchpad/mysql-test/data}"

# 1) MySQL de prueba (solo si el socket no responde y existe el datadir)
if ! mysqladmin --socket="$SOCK" ping >/dev/null 2>&1; then
  if [ -d "$DEVDB" ]; then
    echo "▶ Iniciando MySQL (socket $SOCK)…"
    mysqld --no-defaults --datadir="$DEVDB" --socket="$SOCK" --port=33061 \
           --skip-networking --log-error="$DEVDB/../error.log" &
    for i in $(seq 1 20); do mysqladmin --socket="$SOCK" ping >/dev/null 2>&1 && break; sleep 1; done
  else
    echo "⚠ No encuentro el datadir de prueba ($DEVDB)."
    echo "  Usa tu MySQL real (configúralo en backend/.env) o define DEVDB=/ruta."
  fi
fi
mysqladmin --socket="$SOCK" ping >/dev/null 2>&1 && echo "✓ MySQL OK" || echo "✗ MySQL no responde"

# 2) Servidores PHP
echo "▶ Sitio  → http://127.0.0.1:8125"
php -S 127.0.0.1:8125 -t "$RAIZ/sitio/public" &
echo "▶ Panel  → http://127.0.0.1:8124  (admin@inmath.mx / Cambiar.123)"
php -S 127.0.0.1:8124 -t "$RAIZ/panel/public" "$RAIZ/panel/public/index.php" &
echo "▶ API    → http://127.0.0.1:8123/api/health"
php -S 127.0.0.1:8123 -t "$RAIZ/backend/public" "$RAIZ/backend/public/index.php" &

echo "✓ Todo arriba. Ctrl+C para detener."
wait

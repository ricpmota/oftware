#!/bin/sh
set -e

export PORT="${PORT:-21465}"
export HOST="${HOST:-0.0.0.0}"

if [ -z "${SECRET_KEY:-}" ] || [ "${SECRET_KEY}" = "CHANGE_ME_IN_PRODUCTION" ]; then
  echo "[oftware-wppconnect] AVISO: SECRET_KEY não configurada ou usando valor padrão inseguro." >&2
fi

echo "[oftware-wppconnect] Iniciando WPPConnect Server na porta ${PORT} (host ${HOST})" >&2

exec "$@"

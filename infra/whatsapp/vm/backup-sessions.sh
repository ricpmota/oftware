#!/usr/bin/env bash
# backup-sessions.sh — backup local de userDataDir + tokens (Etapa 4.2)
#
# Uso:
#   sudo ./backup-sessions.sh
#   sudo ./backup-sessions.sh --stop   # para container antes do backup (mais consistente)
#
# Futuro (Etapa 4.3+): replicar backups para GCS com gsutil rsync ou snapshot do Persistent Disk.

set -euo pipefail

BACKUP_ROOT="/data/wppconnect/backups"
SOURCE_USER_DATA="/data/wppconnect/userDataDir"
SOURCE_TOKENS="/data/wppconnect/tokens"
RETENTION=7
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
ARCHIVE="${BACKUP_ROOT}/wppconnect-sessions-${TIMESTAMP}.tar.gz"
STOP_CONTAINER=false

if [[ "${1:-}" == "--stop" ]]; then
  STOP_CONTAINER=true
fi

if [[ ! -d "${SOURCE_USER_DATA}" ]] || [[ ! -d "${SOURCE_TOKENS}" ]]; then
  echo "Erro: diretórios de sessão não encontrados em /data/wppconnect/" >&2
  exit 1
fi

mkdir -p "${BACKUP_ROOT}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

if [[ "${STOP_CONTAINER}" == true ]]; then
  echo "==> Parando container para backup consistente..."
  (cd "${SCRIPT_DIR}" && ${COMPOSE} stop) || true
  RESTART_AFTER=true
else
  echo "==> Backup com container em execução (arquivos Chromium podem estar em uso)."
  RESTART_AFTER=false
fi

echo "==> Criando ${ARCHIVE}..."
tar -czf "${ARCHIVE}" \
  -C /data/wppconnect \
  userDataDir \
  tokens

if [[ "${RESTART_AFTER}" == true ]]; then
  echo "==> Reiniciando container..."
  (cd "${SCRIPT_DIR}" && ${COMPOSE} start) || (cd "${SCRIPT_DIR}" && ${COMPOSE} up -d)
fi

echo "==> Backup concluído: ${ARCHIVE} ($(du -h "${ARCHIVE}" | cut -f1))"

echo "==> Removendo backups locais além dos últimos ${RETENTION}..."
mapfile -t OLD_BACKUPS < <(ls -1t "${BACKUP_ROOT}"/wppconnect-sessions-*.tar.gz 2>/dev/null || true)
if ((${#OLD_BACKUPS[@]} > RETENTION)); then
  for ((i = RETENTION; i < ${#OLD_BACKUPS[@]}; i++)); do
    rm -f "${OLD_BACKUPS[$i]}"
    echo "  removido: ${OLD_BACKUPS[$i]}"
  done
fi

echo ""
echo "Nota: backup em Google Cloud Storage (GCS) será configurado em etapa futura."
echo "Alternativa GCP: snapshot do Persistent Disk antes de deploys."

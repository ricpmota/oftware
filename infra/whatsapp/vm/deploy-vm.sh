#!/usr/bin/env bash
# deploy-vm.sh — pull da imagem oficial e execução do WPPConnect na VM (Etapa 4.2)
#
# Uso:
#   cd infra/whatsapp/vm
#   cp .env.example .env   # definir SECRET_KEY
#   ./deploy-vm.sh
#   ./deploy-vm.sh --restart
#   ./deploy-vm.sh --logs

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "${SCRIPT_DIR}"

COMPOSE="docker compose"
if ! docker compose version >/dev/null 2>&1; then
  COMPOSE="docker-compose"
fi

ACTION="${1:-up}"

if [[ ! -f .env ]]; then
  echo "Erro: arquivo .env não encontrado. Copie .env.example e defina SECRET_KEY." >&2
  exit 1
fi

if grep -qE '^SECRET_KEY=$' .env || grep -q 'CHANGE_ME' .env 2>/dev/null; then
  echo "Aviso: SECRET_KEY parece vazia ou padrão insegura. Edite .env antes de produção." >&2
fi

for dir in /data/wppconnect/userDataDir /data/wppconnect/tokens /data/wppconnect/logs; do
  if [[ ! -d "${dir}" ]]; then
    echo "Criando ${dir}..."
    sudo mkdir -p "${dir}"
    sudo chmod 755 "${dir}"
  fi
done

case "${ACTION}" in
  up)
    echo "==> Pull imagem oficial WPPConnect (${WPPCONNECT_IMAGE:-wppconnect/wppconnect-server:sha-2b71889})..."
    ${COMPOSE} pull
    echo "==> Start (docker compose up -d)..."
    ${COMPOSE} up -d
    ;;
  --restart|restart)
    echo "==> Reinício seguro do container..."
    ${COMPOSE} down --timeout 30
    sleep 2
    ${COMPOSE} pull
    ${COMPOSE} up -d
    ;;
  --logs|logs)
    ${COMPOSE} logs --tail 100 -f
    exit 0
    ;;
  --status|status)
    ${COMPOSE} ps
    exit 0
    ;;
  *)
    echo "Uso: $0 [up|--restart|--logs|--status]" >&2
    exit 1
    ;;
esac

echo ""
echo "==> Status:"
${COMPOSE} ps

echo ""
echo "==> Logs recentes:"
${COMPOSE} logs --tail 40

echo ""
echo "==> Health local (Swagger):"
if curl -sf -o /dev/null "http://127.0.0.1:21465/api-docs"; then
  echo "OK — http://127.0.0.1:21465/api-docs"
else
  echo "Aguardando container ficar pronto (pode levar ~60–90s no primeiro start)."
fi

echo ""
echo "Gerar token Bearer (substitua SESSION e SECRET_KEY do .env):"
echo '  curl -s -X POST "http://127.0.0.1:21465/api/SESSION/SEU_SECRET_KEY/generate-token"'

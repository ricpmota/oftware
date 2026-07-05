#!/usr/bin/env bash
# Deploy manual do WPPConnect central da Oftware no Google Cloud Run.
#
# Pré-requisitos:
#   - gcloud CLI autenticado
#   - Projeto GCP configurado: gcloud config set project SEU_PROJETO
#   - Secret Manager: oftware-wppconnect-secret-key (valor = SECRET_KEY do WPPConnect)
#
# Uso:
#   ./deploy.sh
#   PROJECT_ID=meu-projeto REGION=us-central1 ./deploy.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

PROJECT_ID="${PROJECT_ID:-$(gcloud config get-value project 2>/dev/null)}"
REGION="${REGION:-us-central1}"
SERVICE_NAME="${SERVICE_NAME:-oftware-whatsapp-wppconnect}"
IMAGE_NAME="${IMAGE_NAME:-gcr.io/${PROJECT_ID}/${SERVICE_NAME}}"
TAG="${TAG:-$(git -C "${REPO_ROOT}" rev-parse --short HEAD 2>/dev/null || date +%Y%m%d%H%M%S)}"

if [[ -z "${PROJECT_ID}" || "${PROJECT_ID}" == "(unset)" ]]; then
  echo "Erro: defina PROJECT_ID ou configure gcloud config set project" >&2
  exit 1
fi

echo "==> Projeto: ${PROJECT_ID}"
echo "==> Região: ${REGION}"
echo "==> Serviço: ${SERVICE_NAME}"
echo "==> Imagem: ${IMAGE_NAME}:${TAG}"

echo "==> Build Docker local..."
docker build \
  -t "${IMAGE_NAME}:${TAG}" \
  -t "${IMAGE_NAME}:latest" \
  -f "${SCRIPT_DIR}/Dockerfile" \
  "${SCRIPT_DIR}"

echo "==> Push para GCR..."
docker push "${IMAGE_NAME}:${TAG}"
docker push "${IMAGE_NAME}:latest"

echo "==> Deploy Cloud Run..."
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --image "${IMAGE_NAME}:${TAG}" \
  --region "${REGION}" \
  --platform managed \
  --port 21465 \
  --memory 2Gi \
  --cpu 1 \
  --min-instances 1 \
  --max-instances 1 \
  --timeout 300 \
  --allow-unauthenticated \
  --set-env-vars "HOST=0.0.0.0,PORT=21465" \
  --set-secrets "SECRET_KEY=oftware-wppconnect-secret-key:latest"

echo ""
echo "==> Deploy concluído."
gcloud run services describe "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --format 'value(status.url)'

echo ""
echo "Próximos passos:"
echo "  1. Mapear domínio whatsapp.oftware.com.br para a URL acima (Cloud Run domain mapping)"
echo "  2. Gerar token Bearer a partir do SECRET_KEY (endpoint generate-token do WPPConnect)"
echo "  3. Configurar Vercel das organizações:"
echo "       WPP_SERVER_URL=https://whatsapp.oftware.com.br"
echo "       WPP_SERVER_TOKEN=<token_central>"
echo "       WHATSAPP_MOCK_MODE=false"

#!/usr/bin/env bash
# setup-vm.sh — prepara Ubuntu limpa para WPPConnect central Oftware (Etapa 4.2)
#
# Uso (como root ou com sudo):
#   curl -fsSL ... | bash
#   ou: sudo ./setup-vm.sh
#
# Pré-requisito: VM Compute Engine com disco persistente montado em /data (recomendado).

set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Execute como root: sudo $0" >&2
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive

echo "==> Atualizando pacotes..."
apt-get update -y
apt-get upgrade -y

echo "==> Instalando dependências base..."
apt-get install -y \
  ca-certificates \
  curl \
  gnupg \
  lsb-release \
  ufw \
  tar \
  gzip

echo "==> Instalando Docker..."
if ! command -v docker >/dev/null 2>&1; then
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod a+r /etc/apt/keyrings/docker.asc
  echo \
    "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
    $(. /etc/os-release && echo "${VERSION_CODENAME}") stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
fi

echo "==> Habilitando Docker no boot..."
systemctl enable docker
systemctl start docker

echo "==> Criando diretórios persistentes em /data/wppconnect..."
mkdir -p \
  /data/wppconnect/userDataDir \
  /data/wppconnect/tokens \
  /data/wppconnect/logs \
  /data/wppconnect/backups

# Container roda como root no Node oficial; permissões amplas evitam EACCES no Chromium profile.
chown -R root:root /data/wppconnect
chmod -R 755 /data/wppconnect

echo "==> Configurando firewall UFW (notas)..."
ufw --force reset || true
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
# Não abrir 21465 publicamente — usar reverse proxy HTTPS (443) na Etapa seguinte.
# ufw allow 21465/tcp   # apenas se teste temporário SEM proxy (não recomendado)
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

echo ""
echo "==> Setup concluído."
echo ""
echo "Próximos passos:"
echo "  1. Clonar o repositório Oftware (ou copiar infra/whatsapp/vm/)"
echo "  2. cd infra/whatsapp/vm && cp .env.example .env && editar SECRET_KEY"
echo "  3. sudo ./deploy-vm.sh"
echo "  4. Configurar Nginx/Caddy com TLS para whatsapp.oftware.com.br → 127.0.0.1:21465"
echo ""
echo "Disco persistente: confirme que /data está no Persistent Disk (não no boot disk efêmero)."
df -h /data 2>/dev/null || df -h /

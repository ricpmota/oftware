# Oftware — overlay mínimo sobre a imagem oficial WPPConnect Server
#
# Estratégia (Etapa 4.2 revisada):
# - Imagem base: wppconnect/wppconnect-server (Docker Hub, build oficial com Yarn 4 + Alpine + Chromium)
# - Config Oftware: config.runtime.js copiado para dist/config.js
# - NÃO compilar o repositório no deploy da VM (evita npm ci / husky / tsc)
#
# Referência upstream:
# - https://hub.docker.com/r/wppconnect/wppconnect-server
# - https://github.com/wppconnect-team/wppconnect-server/blob/main/Dockerfile
# - https://github.com/wppconnect-team/wppconnect-server/blob/main/docker-compose.yml

ARG WPPCONNECT_IMAGE=wppconnect/wppconnect-server:sha-2b71889
FROM ${WPPCONNECT_IMAGE}

WORKDIR /usr/src/wpp-server

COPY config.runtime.js ./dist/config.js

EXPOSE 21465

# A imagem oficial já define: ENTRYPOINT ["node", "dist/server.js"]

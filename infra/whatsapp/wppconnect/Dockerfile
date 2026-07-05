# WPPConnect Server central da Oftware (Google Cloud Run)
#
# Build a partir do repositório oficial wppconnect-team/wppconnect-server
# com config.ts e entrypoint da Oftware.
#
# Requisitos: Debian + Chromium para Puppeteer.

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    git \
    ca-certificates \
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcairo2 \
    libcups2 \
    libdbus-1-3 \
    libdrm2 \
    libgbm1 \
    libglib2.0-0 \
    libgtk-3-0 \
    libnspr4 \
    libnss3 \
    libpango-1.0-0 \
    libx11-6 \
    libx11-xcb1 \
    libxcb1 \
    libxcomposite1 \
    libxcursor1 \
    libxdamage1 \
    libxext6 \
    libxfixes3 \
    libxi6 \
    libxrandr2 \
    libxrender1 \
    libxss1 \
    libxtst6 \
    chromium \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV NODE_ENV=production

WORKDIR /app

ARG WPPCONNECT_VERSION=2.8.6
RUN git clone --depth 1 --branch "v${WPPCONNECT_VERSION}" https://github.com/wppconnect-team/wppconnect-server.git . \
  || git clone --depth 1 https://github.com/wppconnect-team/wppconnect-server.git .

COPY config.ts ./src/config.ts
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

RUN npm ci \
  && npm run build \
  && npm prune --omit=dev

ENV PORT=21465
ENV HOST=0.0.0.0
EXPOSE 21465

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["npm", "start"]

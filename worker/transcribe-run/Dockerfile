FROM node:18-slim

WORKDIR /app

# Instalar dependências do sistema para ffmpeg
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build \
  && npm prune --production

EXPOSE 8080
ENV PORT=8080

CMD ["node", "dist/index.js"]

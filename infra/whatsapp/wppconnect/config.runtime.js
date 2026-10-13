/**
 * Configuração Oftware para imagem oficial wppconnect/wppconnect-server.
 * Montada em runtime em: /usr/src/wpp-server/dist/config.js
 *
 * Variáveis de ambiente:
 * - SECRET_KEY — chave mestra (obrigatória)
 * - PORT — porta HTTP (padrão 21465)
 * - WPP_PUBLIC_HOST — URL base exibida em logs/Swagger (padrão http://localhost)
 *
 * Persistência (volumes VM):
 * - ./userDataDir → /usr/src/wpp-server/userDataDir
 * - ./tokens → /usr/src/wpp-server/tokens
 *
 * Manter em sincronia com config.ts (build/overlay Docker).
 */
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

exports.default = {
  secretKey: process.env.SECRET_KEY || 'CHANGE_ME_IN_PRODUCTION',
  host: process.env.WPP_PUBLIC_HOST || 'http://localhost',
  port: process.env.PORT || '21465',
  deviceName: 'Oftware WhatsApp',
  poweredBy: 'Oftware-WPPConnect',
  startAllSession: false,
  tokenStoreType: 'file',
  maxListeners: 50,
  customUserDataDir: './userDataDir/',
  webhook: {
    url: null,
    autoDownload: false,
    uploadS3: false,
    readMessage: false,
    allUnreadOnStart: false,
    listenAcks: false,
    onPresenceChanged: false,
    onParticipantsChanged: false,
    onReactionMessage: false,
    onPollResponse: false,
    onRevokedMessage: false,
    onLabelUpdated: false,
    onSelfMessage: false,
  },
  websocket: {
    autoDownload: false,
    uploadS3: false,
  },
  chatwoot: {
    sendQrCode: false,
    sendStatus: false,
  },
  archive: {
    enable: false,
    waitTime: 10,
    daysToArchive: 45,
  },
  log: {
    level: 'warn',
    logger: ['console'],
  },
  createOptions: {
    // Evita pin quebrado (log: Version not available for 2.3000.10305x).
    // null = deixa o WPP pegar a versão WEB disponível no momento.
    whatsappVersion: null,
    autoClose: 0,
    // CRÍTICO: padrão do WPP é 180000ms (3 min). Se o histórico do celular
    // demora mais que isso, o Chromium é fechado no meio do sync → sessão
    // fantasma + isSendFailure. 0 = não matar enquanto sincroniza.
    deviceSyncTimeout: 0,
    disableWelcome: true,
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
  },
  mapper: {
    enable: false,
    prefix: 'oftware-',
  },
  db: {
    mongodbDatabase: 'tokens',
    mongodbCollection: '',
    mongodbUser: '',
    mongodbPassword: '',
    mongodbHost: '',
    mongoIsRemote: true,
    mongoURLRemote: '',
    mongodbPort: 27017,
    redisHost: 'localhost',
    redisPort: 6379,
    redisPassword: '',
    redisDb: 0,
    redisPrefix: 'oftware',
  },
  aws_s3: {
    region: 'sa-east-1',
    access_key_id: null,
    secret_key: null,
    defaultBucketName: null,
    endpoint: null,
    forcePathStyle: null,
  },
};

/**
 * Configuração Oftware para WPPConnect Server central.
 * Sobrescreve src/config.ts do repositório upstream no build Docker.
 *
 * Variáveis:
 * - SECRET_KEY — chave mestra (gerar token Bearer para o Oftware)
 * - HOST — bind address (0.0.0.0 no container)
 * - PORT — porta do container (21465)
 *
 * Persistência (Etapa 4.2 — VM):
 * - customUserDataDir → volume Docker em /app/userDataDir → /data/wppconnect/userDataDir na VM
 * - tokenStoreType file → /app/tokens → /data/wppconnect/tokens na VM
 */
export default {
  secretKey: process.env.SECRET_KEY || 'CHANGE_ME_IN_PRODUCTION',
  host: process.env.HOST || '0.0.0.0',
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
  archive: {
    enable: false,
    waitTime: 10,
    daysToArchive: 45,
  },
  log: {
    level: 'warn',
  },
  createOptions: {
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
    ],
  },
};

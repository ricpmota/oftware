/**
 * Configuração Oftware (TypeScript) — referência e builds com overlay Docker.
 * Em produção na VM: usar config.runtime.js montado na imagem oficial.
 *
 * @see config.runtime.js — arquivo efetivo em docker-compose (dist/config.js)
 * @see Dockerfile — overlay opcional sobre wppconnect/wppconnect-server
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
    url: (() => {
      const base = (process.env.WEBHOOK_URL || '').trim();
      const secret = (process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET || '').trim();
      if (!base) return null;
      if (!secret || /[?&](secret|token)=/.test(base)) return base;
      try {
        const url = new URL(base);
        url.searchParams.set('secret', secret);
        return url.toString();
      } catch {
        return `${base}${base.includes('?') ? '&' : '?'}secret=${encodeURIComponent(secret)}`;
      }
    })(),
    extraHeaders: process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET
      ? { 'x-webhook-secret': process.env.WHATSAPP_INBOUND_WEBHOOK_SECRET }
      : {},
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
    // onmessage NÃO tem flag no 2.10.0 — sempre registrado em listenMessages().
    ignore: ['status@broadcast'],
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
    whatsappVersion: null,
    autoClose: 0,
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
};

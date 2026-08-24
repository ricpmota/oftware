/**
 * Hook Oftware — inbound do Canal Chat no WPPConnect Server 2.10.0.
 *
 * Por que existe:
 * - `onmessage` NÃO tem flag em webhook.*. É registrado só em CreateSessionUtil.start()
 *   → listenMessages() → client.onMessage().
 * - start-session em sessão CONNECTED retorna cedo e NÃO re-registra listener.
 * - client.onMessage usa WAPI.processMessageObj(msg, false, false). Se `id` for
 *   string (comum em @lid) ou `from` vier vazio, o serialize devolve undefined
 *   ou lança — a mensagem some sem log e o webhook não dispara.
 * - Fallback: WPP.on('chat.new_message') + MsgStore.add, payload mínimo, sem mídia.
 *
 * Não loga texto, secret nem mídia.
 */
'use strict';

const path = require('path');

let callWebHook;
try {
  ({ callWebHook } = require('./functions'));
} catch {
  try {
    ({ callWebHook } = require(path.join(__dirname, 'functions')));
  } catch {
    callWebHook = null;
  }
}

const attached = new WeakSet();
const seenIds = new Set();
const CANAL_CHAT_SESSION = 'system_canal_chat';

function serializeWid(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object') {
    return value._serialized || value.id || value.user || value.phone || '';
  }
  return String(value);
}

function fromKind(from) {
  const value = String(from || '');
  if (value.includes('@lid')) return 'lid';
  if (value.includes('@c.us')) return 'c.us';
  if (value.includes('@g.us')) return 'g.us';
  return 'other';
}

function messageIdOf(message) {
  if (!message || typeof message !== 'object') return '';
  const id = message.id;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (id && typeof id === 'object') {
    const serialized = id._serialized || id.id || id.remote;
    if (typeof serialized === 'string' && serialized.trim()) return serialized.trim();
  }
  return '';
}

function alreadySeen(id) {
  if (!id) return false;
  if (seenIds.has(id)) return true;
  seenIds.add(id);
  if (seenIds.size > 800) {
    const first = seenIds.values().next().value;
    seenIds.delete(first);
  }
  return false;
}

function debugLog(logger, payload) {
  const line =
    `[WPPInboundDebug] session=${payload.session || CANAL_CHAT_SESSION}` +
    ` event=${payload.event || 'onmessage'}` +
    ` type=${payload.type || 'unknown'}` +
    ` fromMe=${payload.fromMe === true}` +
    ` isGroup=${payload.isGroup === true}` +
    ` fromKind=${payload.fromKind || 'other'}` +
    ` bodyExists=${payload.bodyExists === true}`;
  try {
    if (logger && typeof logger.warn === 'function') logger.warn(line);
    else console.warn(line);
  } catch {
    console.warn(line);
  }
}

function extractFrom(message) {
  if (!message || typeof message !== 'object') return '';
  const id = message.id;
  return serializeWid(
    message.from ||
      message.chatId ||
      message.senderPn ||
      (id && typeof id === 'object' && (id.remote || id.participant)) ||
      '',
  );
}

function extractBody(message) {
  if (!message || typeof message !== 'object') return '';
  const body = message.body || message.content || message.caption || message.text;
  return typeof body === 'string' ? body : '';
}

function isFromMe(message) {
  if (!message || typeof message !== 'object') return false;
  const id = message.id;
  return Boolean(
    message.fromMe ||
      message.isSentByMe ||
      (id && typeof id === 'object' && id.fromMe),
  );
}

async function emitWebhook(client, req, message, source) {
  if (!callWebHook || !client || !req) return;
  const id = messageIdOf(message);
  if (alreadySeen(id || `${source}:${Date.now()}`)) return;
  try {
    await callWebHook(client, req, 'onmessage', message);
  } catch (error) {
    const logger = req.logger;
    const err = error instanceof Error ? error.message : 'erro';
    if (logger && typeof logger.warn === 'function') {
      logger.warn(`[WPPInboundDebug] webhook_failed source=${source} error=${err}`);
    } else {
      console.warn(`[WPPInboundDebug] webhook_failed source=${source} error=${err}`);
    }
  }
}

function resolveClientAndReq(a, b) {
  const aIsClient = a && typeof a.onAnyMessage === 'function';
  const bIsClient = b && typeof b.onAnyMessage === 'function';
  const client = aIsClient ? a : bIsClient ? b : a;
  const req = aIsClient ? b : a;
  return { client, req };
}

async function attachPageHook(client, req, session, logger) {
  const page = client.page || client.waPage;
  if (!page || typeof page.evaluate !== 'function') {
    debugLog(logger, {
      session,
      event: 'page_missing',
      type: 'internal',
      fromMe: false,
      isGroup: false,
      fromKind: 'other',
      bodyExists: false,
    });
    return;
  }

  try {
    await page.exposeFunction('__oftwareInbound', (payload) => {
      debugLog(logger, {
        session,
        event: 'onmessage',
        type: (payload && payload.type) || 'chat',
        fromMe: payload && payload.fromMe === true,
        isGroup: payload && payload.isGroup === true,
        fromKind: (payload && payload.fromKind) || 'other',
        bodyExists: payload && payload.bodyExists === true,
      });
      if (!payload || payload.fromMe || payload.isGroup) return;
      const minimal = {
        event: 'onmessage',
        session,
        from: payload.from,
        chatId: payload.from,
        type: payload.type || 'chat',
        body: typeof payload.body === 'string' ? payload.body : '',
        fromMe: false,
        isGroupMsg: false,
        id: payload.id || undefined,
        senderPn: payload.senderPn || undefined,
      };
      return emitWebhook(client, req, minimal, 'page_chat.new_message');
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    if (!/already/i.test(msg)) {
      debugLog(logger, {
        session,
        event: 'exposeFunction_failed',
        type: 'internal',
        fromMe: false,
        isGroup: false,
        fromKind: 'other',
        bodyExists: false,
      });
    }
  }

  try {
    await page.evaluate(() => {
      function serializeWid(value) {
        if (!value) return '';
        if (typeof value === 'string') return value;
        if (typeof value === 'object') {
          return value._serialized || value.id || value.user || value.phone || '';
        }
        return String(value);
      }

      function fallbackSerialize(messageObj, includeMe, includeNotifications) {
        if (!messageObj) return;
        if (messageObj.isNotification && !includeNotifications) return;
        const id = messageObj.id;
        const fromMe = Boolean(
          messageObj.fromMe ||
            messageObj.isSentByMe ||
            (id && typeof id === 'object' && id.fromMe),
        );
        if (fromMe && !includeMe) return;
        const from =
          serializeWid(messageObj.from) ||
          serializeWid(messageObj.chatId) ||
          serializeWid(id && typeof id === 'object' ? id.remote : '') ||
          serializeWid(messageObj.senderPn);
        return {
          id: typeof id === 'string' ? id : serializeWid(id),
          from,
          to: serializeWid(messageObj.to),
          fromMe,
          body: messageObj.body || messageObj.content || messageObj.caption || '',
          type: messageObj.type || 'chat',
          isGroupMsg: Boolean(messageObj.isGroupMsg || String(from).includes('@g.us')),
          chatId: serializeWid(messageObj.chatId) || from,
          senderPn:
            messageObj.senderPn ||
            (messageObj.sender && (messageObj.sender.pn || messageObj.sender.phone)) ||
            '',
          timestamp: messageObj.t || messageObj.timestamp,
          notifyName: messageObj.notifyName,
        };
      }

      function patchProcessMessageObj() {
        const WAPI = window.WAPI;
        if (!WAPI || typeof WAPI.processMessageObj !== 'function') return false;
        if (WAPI.__oftwareProcessPatched) return true;
        WAPI.__oftwareProcessPatched = true;
        const orig = WAPI.processMessageObj.bind(WAPI);
        WAPI.processMessageObj = function patchedProcess(messageObj, includeMe, includeNotifications) {
          try {
            const result = orig(messageObj, includeMe, includeNotifications);
            if (result) return result;
          } catch (_err) {
            /* serialize oficial quebrou — usar fallback */
          }
          try {
            return fallbackSerialize(messageObj, includeMe, includeNotifications);
          } catch (_err2) {
            return undefined;
          }
        };
        return true;
      }

      function emitRaw(msg) {
        const emit = window.__oftwareInbound;
        if (typeof emit !== 'function' || !msg) return;
        try {
          const id = msg.id;
          const from =
            serializeWid(msg.from) ||
            serializeWid(msg.chatId) ||
            serializeWid(id && typeof id === 'object' ? id.remote : '') ||
            serializeWid(msg.senderPn);
          const fromMe = Boolean(
            msg.fromMe || msg.isSentByMe || (id && typeof id === 'object' && id.fromMe),
          );
          const fromStr = String(from);
          const body = msg.body || msg.caption || msg.content || '';
          emit({
            event: 'onmessage',
            type: msg.type || 'chat',
            fromMe,
            isGroup: fromStr.includes('@g.us'),
            fromKind: fromStr.includes('@lid')
              ? 'lid'
              : fromStr.includes('@c.us')
                ? 'c.us'
                : 'other',
            bodyExists: Boolean(body),
            from: fromStr,
            body: typeof body === 'string' ? body : '',
            id: typeof id === 'string' ? id : id && id._serialized,
            senderPn:
              msg.senderPn ||
              (msg.sender && (msg.sender.pn || msg.sender.phone)) ||
              '',
          });
        } catch (_err) {
          /* ignore */
        }
      }

      function install() {
        patchProcessMessageObj();
        const wpp = window.WPP;
        if (!wpp) return false;
        if (window.__oftwareInboundHooked) return true;
        const on = typeof wpp.on === 'function' ? wpp.on.bind(wpp) : null;
        const evOn = wpp.ev && typeof wpp.ev.on === 'function' ? wpp.ev.on.bind(wpp.ev) : null;
        if (!on && !evOn) return false;
        window.__oftwareInboundHooked = true;

        const handler = (msg) => emitRaw(msg);
        if (on) {
          on('chat.new_message', handler);
          on('chat.new_message', handler);
        }
        if (evOn) {
          evOn('chat.new_message', handler);
          evOn('chat.new_message', handler);
        }
        try {
          const store = wpp.whatsapp && (wpp.whatsapp.MsgStore || wpp.whatsapp.Msg);
          if (store && typeof store.on === 'function') {
            store.on('add', (msg) => {
              if (!msg || msg.isNewMsg === false) return;
              handler(msg);
            });
          }
        } catch (_err) {
          /* ignore */
        }
        return true;
      }

      if (install()) return;
      let attempts = 0;
      const timer = setInterval(() => {
        attempts += 1;
        if (install() || attempts > 40) clearInterval(timer);
      }, 500);
    });
  } catch (_err) {
    debugLog(logger, {
      session,
      event: 'page_hook_failed',
      type: 'internal',
      fromMe: false,
      isGroup: false,
      fromKind: 'other',
      bodyExists: false,
    });
  }
}

async function attach(clientArg, reqArg) {
  const resolved = resolveClientAndReq(clientArg, reqArg);
  const client = resolved.client;
  const req = resolved.req;
  if (!client || attached.has(client)) return;

  const session = client.session || CANAL_CHAT_SESSION;
  if (session && session !== CANAL_CHAT_SESSION) return;

  attached.add(client);
  const logger = req && req.logger;

  debugLog(logger, {
    session,
    event: 'hook_attached',
    type: 'internal',
    fromMe: false,
    isGroup: false,
    fromKind: 'other',
    bodyExists: false,
  });

  try {
    if (typeof client.onMessage === 'function') {
      await client.onMessage(async (message) => {
        const from = extractFrom(message);
        debugLog(logger, {
          session,
          event: 'onmessage',
          type: (message && message.type) || 'chat',
          fromMe: isFromMe(message),
          isGroup: Boolean(message && (message.isGroupMsg || String(from).includes('@g.us'))),
          fromKind: fromKind(from),
          bodyExists: Boolean(extractBody(message)),
        });
      });
    }
  } catch (_err) {
    debugLog(logger, {
      session,
      event: 'onmessage_attach_failed',
      type: 'internal',
      fromMe: false,
      isGroup: false,
      fromKind: 'other',
      bodyExists: false,
    });
  }

  try {
    await client.onAnyMessage(async (message) => {
      const from = extractFrom(message);
      const fromMe = isFromMe(message);
      const isGroup = Boolean(message && (message.isGroupMsg || String(from).includes('@g.us')));
      debugLog(logger, {
        session,
        event: 'onanyMessage',
        type: (message && message.type) || 'chat',
        fromMe,
        isGroup,
        fromKind: fromKind(from),
        bodyExists: Boolean(extractBody(message)),
      });
      if (fromMe || isGroup) return;
      await emitWebhook(client, req, message, 'onanyMessage');
    });
  } catch (_err) {
    debugLog(logger, {
      session,
      event: 'onanyMessage_attach_failed',
      type: 'internal',
      fromMe: false,
      isGroup: false,
      fromKind: 'other',
      bodyExists: false,
    });
  }

  await attachPageHook(client, req, session, logger);
}

module.exports = { attach };

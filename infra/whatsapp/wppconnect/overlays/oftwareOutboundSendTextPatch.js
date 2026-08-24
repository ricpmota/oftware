/**
 * Overlay outbound — NÃO altera inbound.
 *
 * WPPConnect 1.41.x / Server 2.10.0 faz:
 *   WPP.chat.sendTextMessage(...)  ← envio real (waitForAck)
 *   WAPI.getMessageById(id)        ← só serializa o retorno; quebra em wa-js
 *     (MsgStore/chat.msgs.get undefined → reading 'get')
 *
 * Este patch reimplementa sendText no SenderLayer:
 * - envia igual ao original;
 * - se getMessageById quebrar com o erro conhecido e houver id + ack>=1,
 *   devolve um Message mínimo (prova via waitForAck);
 * - se não houver ack>=1, lança OFTWARE_SEND_UNCONFIRMED (não finge sucesso);
 * - outros erros sobem intactos;
 * - sem retry.
 *
 * Ativar com NODE_OPTIONS --require deste arquivo (além do preload inbound).
 */
'use strict';

const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;

function crashText(error) {
  if (!error) return '';
  if (typeof error === 'string') return error;
  const nested = error.error && typeof error.error === 'object' ? error.error : {};
  return [error.message, error.stack, nested.message, nested.stack, error.originalMessage]
    .filter(Boolean)
    .join('\n');
}

function isGetMessageByIdCrash(error) {
  const raw = crashText(error).toLowerCase();
  if (!raw) return false;
  if (raw.includes('getmessagebyid')) return true;
  if (raw.includes('oftware_send_unconfirmed')) return true;
  if (raw.includes('cannot read properties of undefined') && raw.includes('get')) return true;
  if (raw.includes("reading 'get'") || raw.includes('reading "get"')) return true;
  return false;
}

function serializeId(id) {
  if (id == null) return undefined;
  if (typeof id === 'string' && id.trim()) return id.trim();
  if (typeof id === 'object') {
    if (typeof id._serialized === 'string' && id._serialized.trim()) return id._serialized.trim();
    if (typeof id.id === 'string' && id.id.trim()) return id.id.trim();
  }
  const asString = String(id);
  return asString && asString !== '[object Object]' ? asString : undefined;
}

function sessionLabel(client) {
  const raw = client && (client.session || client.sessionName);
  if (typeof raw !== 'string' || !raw.trim()) return 'unknown';
  return raw.length <= 24 ? raw : `${raw.slice(0, 24)}…`;
}

function outboundDebug(client, sendAttempted, sendResult) {
  console.warn('[WPPOutboundDebug]', {
    session: sessionLabel(client),
    destinationKind: 'c_us',
    resolvedFrom: 'sendText_patch',
    sendAttempted,
    sendResult,
  });
}

function patchSenderLayer(Ctor, evaluateAndReturn) {
  if (!Ctor || !Ctor.prototype || typeof Ctor.prototype.sendText !== 'function') return false;
  if (Ctor.prototype.__oftwareOutboundSendTextPatched) return true;
  if (typeof evaluateAndReturn !== 'function') return false;

  Ctor.prototype.sendText = async function oftwarePatchedSendText(to, content, options) {
    let sendResult;
    try {
      sendResult = await evaluateAndReturn(
        this.page,
        ({ to, content, options }) =>
          WPP.chat.sendTextMessage(to, content, {
            ...options,
            waitForAck: true,
          }),
        { to, content, options: options || {} },
      );
    } catch (error) {
      outboundDebug(this, true, 'failed_sendTextMessage');
      throw error;
    }

    const messageId = serializeId(sendResult && sendResult.id);
    const ack = typeof (sendResult && sendResult.ack) === 'number' ? sendResult.ack : undefined;

    if (!messageId) {
      outboundDebug(this, true, 'failed_no_id');
      throw new Error('OFTWARE_SEND_UNCONFIRMED: sendTextMessage sem id');
    }

    try {
      const result = await evaluateAndReturn(
        this.page,
        async ({ messageId }) => JSON.parse(JSON.stringify(await WAPI.getMessageById(messageId))),
        { messageId },
      );
      if (result && result.erro === true) throw result;
      outboundDebug(this, true, 'ok');
      return result;
    } catch (error) {
      if (!isGetMessageByIdCrash(error)) {
        outboundDebug(this, true, 'failed_other');
        throw error;
      }

      if (ack !== undefined && ack >= 1) {
        outboundDebug(this, true, 'ok_ack_without_getMessageById');
        return {
          id: messageId,
          ack,
          type: 'chat',
          fromMe: true,
        };
      }

      outboundDebug(this, true, 'failed_getMessageById');
      throw new Error(
        "OFTWARE_SEND_UNCONFIRMED: getMessageById (Cannot read properties of undefined (reading 'get'))",
      );
    }
  };

  Ctor.prototype.__oftwareOutboundSendTextPatched = true;
  console.warn('[WPPOutboundDebug] SenderLayer.sendText patched');
  return true;
}

function tryPatchFromSenderLayer(exported, senderLayerPath) {
  const helpersDir = path.join(path.dirname(senderLayerPath), '../helpers');
  let evaluateAndReturn;
  try {
    const helpers = originalRequire(helpersDir);
    evaluateAndReturn = helpers && helpers.evaluateAndReturn;
  } catch (_err) {
    try {
      evaluateAndReturn = originalRequire(path.join(helpersDir, 'evaluate-and-return.js'))
        .evaluateAndReturn;
    } catch (_err2) {
      console.warn('[WPPOutboundDebug] evaluateAndReturn not found; sendText patch skipped');
      return;
    }
  }

  const candidates = [exported, exported && exported.SenderLayer, exported && exported.default];
  for (const candidate of candidates) {
    if (patchSenderLayer(candidate, evaluateAndReturn)) return;
  }
}

Module.prototype.require = function oftwareOutboundPatchedRequire(request) {
  const result = originalRequire.apply(this, arguments);
  try {
    const resolved = Module._resolveFilename(request, this);
    if (typeof resolved === 'string' && /sender\.layer\.js$/i.test(resolved)) {
      tryPatchFromSenderLayer(result, resolved);
    }
  } catch (_err) {
    /* ignore */
  }
  return result;
};

console.warn('[WPPOutboundDebug] oftwareOutboundSendTextPatch loaded');

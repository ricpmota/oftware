/**
 * Preload Node — envolve CreateSessionUtil.start() para anexar o hook inbound
 * depois que listenMessages() rodou. Não exige reescrever o dist do WPPConnect.
 *
 * Ativar com:
 *   NODE_OPTIONS=--require /usr/src/wpp-server/dist/util/oftware-preload.js
 * ou via require() no final de dist/config.js.
 */
'use strict';

const path = require('path');
const Module = require('module');
const originalRequire = Module.prototype.require;
const HOOK_PATH = path.join(__dirname, 'oftwareInboundHook.js');

function patchExports(exported) {
  const Ctor = exported && (exported.default || exported);
  if (!Ctor || !Ctor.prototype || typeof Ctor.prototype.start !== 'function') return;
  if (Ctor.prototype.__oftwareInboundPatched) return;

  const originalStart = Ctor.prototype.start;
  Ctor.prototype.start = async function patchedStart(req, client) {
    const result = await originalStart.apply(this, arguments);
    try {
      const hook = originalRequire(HOOK_PATH);
      const a = arguments[0];
      const b = arguments[1];
      const wppClient = a && typeof a.onAnyMessage === 'function' ? a : b;
      const request = a && a.logger ? a : b;
      await hook.attach(wppClient || client, request || req);
    } catch (error) {
      console.warn(
        '[WPPInboundDebug] preload_attach_failed',
        error instanceof Error ? error.message : 'erro',
      );
    }
    return result;
  };
  Ctor.prototype.__oftwareInboundPatched = true;
  console.warn('[WPPInboundDebug] CreateSessionUtil.start patched for inbound hook');
}

Module.prototype.require = function oftwarePatchedRequire(request) {
  const result = originalRequire.apply(this, arguments);
  try {
    const resolved = Module._resolveFilename(request, this);
    if (typeof resolved === 'string' && /createSessionUtil\.js$/i.test(resolved)) {
      patchExports(result);
    }
  } catch (_err) {
    /* ignore */
  }
  return result;
};

console.warn('[WPPInboundDebug] oftware-preload loaded');

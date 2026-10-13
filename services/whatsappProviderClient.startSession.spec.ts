import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  isSessionStartInProgress,
  startSession,
} from '@/services/whatsappProviderClient';

const PROVIDER = readFileSync(resolve(__dirname, 'whatsappProviderClient.ts'), 'utf8');

type FetchCall = { method: string; path: string };

function pathOf(input: RequestInfo | URL): string {
  const raw = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
  return new URL(raw, 'http://wpp.test').pathname;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('isSessionStartInProgress', () => {
  it('QRCODE / qr são start em andamento', () => {
    expect(isSessionStartInProgress({ rawStatus: 'QRCODE' })).toBe(true);
    expect(isSessionStartInProgress({ status: 'qrcode' })).toBe(true);
  });

  it('INITIALIZING é start em andamento', () => {
    expect(isSessionStartInProgress({ rawStatus: 'INITIALIZING' })).toBe(true);
  });

  it('PAIRING / OPENING / PHONECODE são start em andamento', () => {
    expect(isSessionStartInProgress({ rawStatus: 'PAIRING' })).toBe(true);
    expect(isSessionStartInProgress({ rawStatus: 'OPENING' })).toBe(true);
    expect(isSessionStartInProgress({ rawStatus: 'PHONECODE' })).toBe(true);
  });

  it('CLOSED / CONNECTED / qr_pending mapeado sem raw não bloqueiam start', () => {
    expect(isSessionStartInProgress({ rawStatus: 'CLOSED' })).toBe(false);
    expect(isSessionStartInProgress({ rawStatus: 'CONNECTED' })).toBe(false);
    expect(isSessionStartInProgress({ status: 'qr_pending' })).toBe(false);
    expect(isSessionStartInProgress({ status: 'disconnected' })).toBe(false);
  });
});

describe('startSession — não duplicar Chromium', () => {
  const calls: FetchCall[] = [];
  let statusBySession: Record<string, string> = {};
  let startPostCountBySession: Record<string, number> = {};
  let startGate: Promise<void> | null = null;

  beforeEach(() => {
    calls.length = 0;
    statusBySession = {};
    startPostCountBySession = {};
    startGate = null;
    vi.stubEnv('WHATSAPP_MOCK_MODE', 'false');
    vi.stubEnv('WPP_SERVER_URL', 'http://wpp.test');
    vi.stubEnv('WPP_SERVER_SECRET_KEY', 'test-secret');

    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const path = pathOf(input);
        const method = (init?.method ?? 'GET').toUpperCase();
        calls.push({ method, path });
        const session = path.split('/')[2] ?? '';

        if (path.endsWith('/status-session')) {
          return jsonResponse({ status: statusBySession[session] ?? 'CLOSED', qrcode: null });
        }
        if (path.endsWith('/logout-session') || path.endsWith('/close-session')) {
          return jsonResponse({ status: true, message: 'ok' });
        }
        if (path.endsWith('/clear-session-data')) {
          return jsonResponse({ status: true });
        }
        if (path.endsWith('/qrcode-session')) {
          return jsonResponse({ status: statusBySession[session], message: 'QRCode is not available...' });
        }
        if (path.endsWith('/start-session') && method === 'POST') {
          startPostCountBySession[session] = (startPostCountBySession[session] ?? 0) + 1;
          if (startGate) await startGate;
          return jsonResponse({ status: 'QRCODE', qrcode: 'data:image/png;base64,AAA' });
        }
        return jsonResponse({ status: 'error', message: `unexpected ${method} ${path}` }, 500);
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  function destructiveCalls(): FetchCall[] {
    return calls.filter(
      (c) =>
        c.path.endsWith('/logout-session') ||
        c.path.endsWith('/close-session') ||
        c.path.endsWith('/clear-session-data') ||
        (c.method === 'POST' && c.path.endsWith('/start-session')),
    );
  }

  it('A) QRCODE → não reset e não POST start-session', async () => {
    statusBySession['sess-qr'] = 'QRCODE';
    const result = await startSession('sess-qr', 'token', { forceFreshQr: true });
    expect(result.status).toBe('qr_pending');
    expect(result.alreadyStarting).toBe(true);
    expect(destructiveCalls()).toEqual([]);
    expect(calls.some((c) => c.path.endsWith('/status-session'))).toBe(true);
  });

  it('B) INITIALIZING → não reset e não POST start-session', async () => {
    statusBySession['sess-init'] = 'INITIALIZING';
    const result = await startSession('sess-init', 'token', { forceFreshQr: true });
    expect(result.status).toBe('qr_pending');
    expect(result.alreadyStarting).toBe(true);
    expect(destructiveCalls()).toEqual([]);
  });

  it('C) CLOSED → fluxo normal pode iniciar (reset + start)', async () => {
    statusBySession['sess-closed'] = 'CLOSED';
    const result = await startSession('sess-closed', 'token', { forceFreshQr: true });
    expect(result.status).toBe('qr_pending');
    expect(result.alreadyStarting).toBeUndefined();
    expect(calls.some((c) => c.path.endsWith('/logout-session'))).toBe(true);
    expect(calls.some((c) => c.path.endsWith('/close-session'))).toBe(true);
    expect(calls.some((c) => c.path.endsWith('/clear-session-data'))).toBe(true);
    expect(startPostCountBySession['sess-closed']).toBe(1);
  });

  it('D) duas chamadas simultâneas da mesma sessionId → um único start real', async () => {
    statusBySession['sess-once'] = 'CLOSED';
    let release: () => void = () => undefined;
    startGate = new Promise<void>((resolve) => {
      release = resolve;
    });

    const p1 = startSession('sess-once', 'token', { forceFreshQr: true });
    const p2 = startSession('sess-once', 'token', { forceFreshQr: true });
    release();
    const [a, b] = await Promise.all([p1, p2]);

    expect(a.status).toBe('qr_pending');
    expect(b.status).toBe('qr_pending');
    expect(startPostCountBySession['sess-once']).toBe(1);
  });

  it('E) duas sessionIds diferentes continuam independentes', async () => {
    statusBySession['sess-a'] = 'CLOSED';
    statusBySession['sess-b'] = 'CLOSED';
    await Promise.all([
      startSession('sess-a', 'token', { forceFreshQr: true }),
      startSession('sess-b', 'token', { forceFreshQr: true }),
    ]);
    expect(startPostCountBySession['sess-a']).toBe(1);
    expect(startPostCountBySession['sess-b']).toBe(1);
  });

  it('H) CONNECTED não é destruída por forceFreshQr', async () => {
    statusBySession['sess-on'] = 'CONNECTED';
    const result = await startSession('sess-on', 'token', { forceFreshQr: true });
    expect(result.status).toBe('connected');
    expect(result.alreadyStarting).toBeUndefined();
    expect(destructiveCalls()).toEqual([]);
  });
});

describe('F/G — polling e send-message intactos', () => {
  it('F) getSessionStatus / polling não mudaram de contrato', () => {
    expect(PROVIDER).toContain('export async function getSessionStatus');
    expect(PROVIDER).toContain('/status-session');
    expect(PROVIDER).toContain('isProviderSessionFullyConnected');
    expect(PROVIDER).toContain('/check-connection-session');
  });

  it('G) send-message não foi alterado', () => {
    expect(PROVIDER).toContain('send-message');
    expect(PROVIDER).toContain('export async function sendTestMessage');
    expect(PROVIDER).toContain('async function resolveWhatsappChatId');
    expect(PROVIDER).toContain('createChat: true');
    expect(PROVIDER).toContain('waitForAck: true');
    expect(PROVIDER).toContain('isLid');
  });
});

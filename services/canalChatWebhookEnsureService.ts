import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import { CANAL_CHAT_OWNER_ID, CANAL_CHAT_SESSION_ID } from '@/lib/whatsapp/canalChatOwner';
import { buildCanalChatInboundWebhookUrl } from '@/lib/whatsapp/webhookSecret';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import {
  ensureSessionWebhook,
  rebindSessionKeepAuth,
} from '@/services/whatsappProviderClient';

let lastEnsureAt = 0;
let inFlight: Promise<void> | null = null;
const ENSURE_MS = 60_000;

/**
 * Reaplica WEBHOOK_URL na sessão viva `system_canal_chat`, sem QR novo.
 * Idempotente e com debounce — seguro chamar em status, start-session e envio.
 */
export async function ensureCanalChatInboundWebhook(options?: {
  force?: boolean;
  rebind?: boolean;
}): Promise<void> {
  if (inFlight) return inFlight;

  const run = async () => {
    const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
    if (!connection || connection.status !== 'connected') {
      console.info('[CanalChatWebhook] skipped', {
        reason: connection ? 'sessao_nao_conectada' : 'conexao_ausente',
      });
      return;
    }

    const webhookUrl = buildCanalChatInboundWebhookUrl();
    if (!webhookUrl) {
      console.warn('[CanalChatWebhook] skipped', { reason: 'webhook_url_ausente' });
      return;
    }

    if (!options?.force && Date.now() - lastEnsureAt < ENSURE_MS) return;
    lastEnsureAt = Date.now();

    const sessionId = connection.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
    try {
      await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, sessionId, (token) =>
        options?.rebind
          ? rebindSessionKeepAuth(sessionId, token, webhookUrl)
          : ensureSessionWebhook(sessionId, token, webhookUrl),
      );
      console.info('[CanalChatWebhook] ensured', {
        session: sessionId,
        hasWebhookUrl: true,
        rebound: Boolean(options?.rebind),
      });
    } catch (error) {
      console.warn('[CanalChatWebhook] ensure failed', {
        session: sessionId,
        error: error instanceof Error ? error.message : 'erro',
      });
    }
  };

  inFlight = run().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

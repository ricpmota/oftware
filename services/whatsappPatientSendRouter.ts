import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { withWhatsappProviderAuth } from '@/lib/server/whatsappSessionAuth.server';
import {
  CANAL_CHAT_OWNER_ID,
  CANAL_CHAT_SESSION_ID,
} from '@/lib/whatsapp/canalChatOwner';
import { shouldRoutePatientSendViaCanalChat } from '@/lib/whatsapp/shouldRoutePatientSendViaCanalChat';
import { getWhatsappConnectionByDoctor } from '@/services/whatsappConnectionService';
import {
  phonesLikelyMatch,
  sendTestMessage,
  WhatsappProviderError,
  type WhatsappSendTestMessageResult,
} from '@/services/whatsappProviderClient';
import type { WhatsappConnection } from '@/types/whatsappConnection';

export const CANAL_CHAT_NOT_CONNECTED_FOR_SELF_PHONE_MSG =
  'O telefone do paciente é o mesmo do médico. A mensagem seria enviada pelo Canal Chat para não desconectar o WhatsApp, mas o Canal Chat não está conectado.';

export const CANAL_CHAT_SELF_SEND_BLOCKED_MSG =
  'O telefone do paciente é o mesmo do WhatsApp do médico e também do Canal Chat. Não é possível enviar sem desconectar uma sessão.';

export class WhatsappPatientSendError extends WhatsappProviderError {
  readonly senderOwnerId: string;
  readonly routedViaCanalChat: boolean;

  constructor(
    message: string,
    code: string,
    options: { senderOwnerId: string; routedViaCanalChat: boolean },
  ) {
    super(message, code);
    this.name = 'WhatsappPatientSendError';
    this.senderOwnerId = options.senderOwnerId;
    this.routedViaCanalChat = options.routedViaCanalChat;
  }
}

export type CanalChatConnectionCache = {
  value?: WhatsappConnection | null;
};

export type SendPatientAutomationWhatsappResult = WhatsappSendTestMessageResult & {
  routedViaCanalChat: boolean;
  senderOwnerId: string;
};

function wrapSendError(
  error: unknown,
  senderOwnerId: string,
  routedViaCanalChat: boolean,
): never {
  if (error instanceof WhatsappPatientSendError) throw error;

  const message =
    error instanceof Error ? error.message : 'Erro ao enviar WhatsApp.';
  const code = error instanceof WhatsappProviderError ? error.code : 'PROVIDER_ERROR';
  throw new WhatsappPatientSendError(message, code, {
    senderOwnerId,
    routedViaCanalChat,
  });
}

function extractPhonesFromRecord(data: Record<string, unknown> | undefined): string[] {
  if (!data) return [];
  const phones: string[] = [];
  for (const key of ['telefone', 'celular', 'phone', 'whatsapp']) {
    const raw = data[key];
    if (typeof raw === 'string' && raw.trim()) phones.push(raw.trim());
  }
  return phones;
}

async function resolveOwnerCadastroPhones(
  ownerId: string,
  cache?: Map<string, string[]>,
): Promise<string[]> {
  if (cache?.has(ownerId)) return cache.get(ownerId) ?? [];

  try {
    const snap = await getFirestoreAdmin().collection('medicos').doc(ownerId).get();
    const phones = snap.exists
      ? extractPhonesFromRecord(snap.data() as Record<string, unknown>)
      : [];
    cache?.set(ownerId, phones);
    return phones;
  } catch (error) {
    console.warn(
      '[whatsapp-patient-send] falha ao ler telefone de cadastro do médico:',
      error instanceof Error ? error.message : error,
    );
    cache?.set(ownerId, []);
    return [];
  }
}

async function resolveCanalChatConnection(
  cache?: CanalChatConnectionCache,
): Promise<WhatsappConnection | null> {
  if (cache && 'value' in cache) return cache.value ?? null;

  const connection = await getWhatsappConnectionByDoctor(CANAL_CHAT_OWNER_ID);
  if (cache) cache.value = connection;
  return connection;
}

/**
 * Envia mensagem de automação ao paciente.
 * `params.phone` já deve ser canônico (saída de `resolveInternationalPhone` / fila).
 * O router chama `sendTestMessage` com `phoneIsResolved: true`.
 * Se o telefone do paciente for o mesmo do médico (WhatsApp conectado ou cadastro),
 * usa o Canal Chat para não desconectar a sessão do médico.
 */
export async function sendPatientAutomationWhatsapp(params: {
  ownerId: string;
  ownerSessionId: string;
  ownerConnectedPhone?: string;
  extraOwnerPhones?: string[];
  profilePhoneCache?: Map<string, string[]>;
  canalChatCache?: CanalChatConnectionCache;
  phone: string;
  message: string;
  allowSelfSend?: boolean;
  /** Ver `WhatsappSendMessageOptions.lidHint`. */
  lidHint?: string;
}): Promise<SendPatientAutomationWhatsappResult> {
  const ownerId = params.ownerId?.trim();
  const ownerSessionId = params.ownerSessionId?.trim();
  if (!ownerId) throw new Error('ownerId é obrigatório.');
  if (!ownerSessionId) throw new Error('sessionId é obrigatório.');

  const cadastroPhones =
    ownerId === CANAL_CHAT_OWNER_ID
      ? []
      : params.extraOwnerPhones ??
        (await resolveOwnerCadastroPhones(ownerId, params.profilePhoneCache));
  const routeViaCanalChat = shouldRoutePatientSendViaCanalChat({
    ownerId,
    patientPhone: params.phone,
    ownerPhones: [params.ownerConnectedPhone, ...cadastroPhones],
  });

  if (!routeViaCanalChat) {
    try {
      const { result } = await withWhatsappProviderAuth(ownerId, ownerSessionId, (token) =>
        sendTestMessage(ownerSessionId, token, params.phone, params.message, {
          connectedPhone: params.ownerConnectedPhone,
          allowSelfSend: params.allowSelfSend === true,
          phoneIsResolved: true,
          lidHint: params.lidHint,
        }),
      );
      return {
        ...result,
        routedViaCanalChat: false,
        senderOwnerId: ownerId,
      };
    } catch (error) {
      return wrapSendError(error, ownerId, false);
    }
  }

  const canalChat = await resolveCanalChatConnection(params.canalChatCache);
  const canalSessionId = canalChat?.sessionId?.trim() || CANAL_CHAT_SESSION_ID;
  if (!canalChat || canalChat.status !== 'connected' || !canalSessionId) {
    throw new WhatsappPatientSendError(CANAL_CHAT_NOT_CONNECTED_FOR_SELF_PHONE_MSG, 'CANAL_CHAT_NOT_CONNECTED', {
      senderOwnerId: CANAL_CHAT_OWNER_ID,
      routedViaCanalChat: true,
    });
  }

  if (canalChat.phone && phonesLikelyMatch(params.phone, canalChat.phone)) {
    throw new WhatsappPatientSendError(CANAL_CHAT_SELF_SEND_BLOCKED_MSG, 'SELF_SEND_NOT_ALLOWED', {
      senderOwnerId: CANAL_CHAT_OWNER_ID,
      routedViaCanalChat: true,
    });
  }

  console.log('[whatsapp-patient-send] telefone do paciente igual ao do médico — enviando via Canal Chat', {
    ownerId,
  });

  try {
    const { result } = await withWhatsappProviderAuth(CANAL_CHAT_OWNER_ID, canalSessionId, (token) =>
      sendTestMessage(canalSessionId, token, params.phone, params.message, {
        connectedPhone: canalChat.phone,
        phoneIsResolved: true,
      }),
    );
    return {
      ...result,
      routedViaCanalChat: true,
      senderOwnerId: CANAL_CHAT_OWNER_ID,
    };
  } catch (error) {
    return wrapSendError(error, CANAL_CHAT_OWNER_ID, true);
  }
}

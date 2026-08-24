/**
 * Resolução de destino outbound conhecida como funcional (backup WPPConnect).
 *
 * Fluxo:
 *   telefone → contact/pn-lid → check-number-status → POST /send-message
 *
 * PN → LID é o comportamento funcional anterior. @lid NÃO é evitado no envio.
 * Este módulo documenta a escolha de JID; o cliente vivo está em
 * `services/whatsappProviderClient.ts` (`resolveWhatsappChatId`).
 */

export type OutboundDestinationKind = 'c_us' | 'lid';

export type OutboundResolvedFrom = 'phone_c_us' | 'check_number' | 'pn_lid';

export type OutboundChatResolution = {
  chatId: string;
  phoneForSend: string;
  isLid: boolean;
  destinationKind: OutboundDestinationKind;
  resolvedFrom: OutboundResolvedFrom;
};

function asCus(phoneDigits: string): string {
  return `${phoneDigits}@c.us`;
}

function asLid(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/@lid$/i.test(raw)) return raw;
  if (!raw.includes('@') && /^\d{10,20}$/.test(raw)) return `${raw}@lid`;
  return undefined;
}

export function destinationKindOf(chatId: string): OutboundDestinationKind {
  return /@lid$/i.test(chatId) ? 'lid' : 'c_us';
}

/**
 * Escolhe o JID de envio a partir do telefone e dos ids do WPPConnect.
 * Prefere LID do contact/pn-lid; senão o id de check-number-status; senão `{phone}@c.us`.
 */
export function chooseOutboundChatId(params: {
  phoneDigits: string;
  checkNumberChatId?: string | null;
  pnLidChatId?: string | null;
}): OutboundChatResolution {
  const phoneDigits = params.phoneDigits.replace(/\D/g, '');
  const fallback = asCus(phoneDigits);

  const pnLid = asLid(params.pnLidChatId);
  if (pnLid) {
    const user = pnLid.split('@')[0] || phoneDigits;
    return {
      chatId: pnLid,
      phoneForSend: user.replace(/\D/g, '') || phoneDigits,
      isLid: true,
      destinationKind: 'lid',
      resolvedFrom: 'pn_lid',
    };
  }

  const checked = params.checkNumberChatId?.trim();
  if (checked && checked.includes('@')) {
    const user = checked.split('@')[0] || phoneDigits;
    const isLid = /@lid$/i.test(checked);
    return {
      chatId: checked,
      phoneForSend: user.replace(/\D/g, '') || phoneDigits,
      isLid,
      destinationKind: isLid ? 'lid' : 'c_us',
      resolvedFrom: 'check_number',
    };
  }

  return {
    chatId: fallback,
    phoneForSend: phoneDigits,
    isLid: false,
    destinationKind: 'c_us',
    resolvedFrom: 'phone_c_us',
  };
}

/** Crash típico do WPPConnect 2.10.0 ao serializar o retorno de sendText. */
export function isGetMessageByIdFailure(message: string): boolean {
  const raw = message.toLowerCase();
  if (raw.includes('getmessagebyid')) return true;
  if (raw.includes('cannot read properties of undefined') && raw.includes('get')) return true;
  if (raw.includes('cannot read properties') && (raw.includes("reading 'get'") || raw.includes('reading "get"'))) {
    return true;
  }
  return false;
}

/**
 * Comportamento funcional anterior: TIMEOUT / SERVER_ERROR / getMessageById
 * depois do POST não viram falha dura — o provider devolve ok_ambiguous.
 */
export function shouldTreatPostSendErrorAsDelivered(error: {
  message: string;
  code: string;
}): boolean {
  if (error.code === 'TIMEOUT' || error.code === 'SERVER_ERROR') return true;
  const msg = error.message.toLowerCase();
  return (
    isGetMessageByIdFailure(error.message) ||
    msg.includes('error sending') ||
    msg.includes('msgchunks') ||
    msg.includes('evaluation failed') ||
    msg.includes('protocol error') ||
    msg.includes('cannot read properties') ||
    msg.includes('failed to send') ||
    msg.includes('tempo esgotado')
  );
}

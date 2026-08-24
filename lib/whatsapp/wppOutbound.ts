/**
 * Resolução de destino outbound do WPPConnect.
 *
 * O WhatsApp atual devolve LID (`…@lid`) em contact/pn-lid e às vezes em
 * check-number-status. O WPPConnect 2.10.0 quebra em sendText →
 * WAPI.getMessageById para @lid. Outbound usa sempre @c.us; @lid fica só
 * como identificador auxiliar (inbound / log).
 */

export type OutboundDestinationKind = 'c_us' | 'lid';

export type OutboundResolvedFrom =
  | 'phone_c_us'
  | 'check_number_c_us'
  | 'check_number_lid_ignored'
  | 'pn_lid_ignored';

export type OutboundChatResolution = {
  /** JID usado no envio — sempre @c.us. */
  chatId: string;
  /** Dígitos enviados no body `phone` do send-message. */
  phoneForSend: string;
  /** Sempre false no outbound atual (WPP 2.10.0). */
  isLid: false;
  destinationKind: OutboundDestinationKind;
  resolvedFrom: OutboundResolvedFrom;
  /** LID visto na API, se houver — nunca usado como destino de sendText. */
  lidHint?: string;
};

function asCus(phoneDigits: string): string {
  return `${phoneDigits}@c.us`;
}

function asLidHint(value: string | null | undefined): string | undefined {
  const raw = value?.trim();
  if (!raw) return undefined;
  if (/@lid$/i.test(raw)) return raw.toLowerCase();
  if (/^\d{10,20}$/.test(raw) && raw.length > 15) return `${raw}@lid`;
  return undefined;
}

export function destinationKindOf(chatId: string): OutboundDestinationKind {
  return /@lid$/i.test(chatId) ? 'lid' : 'c_us';
}

/**
 * Escolhe o JID de envio a partir do telefone e dos ids opcionais do WPP.
 * @lid nunca vira destino de send-message.
 */
export function chooseOutboundChatId(params: {
  phoneDigits: string;
  checkNumberChatId?: string | null;
  pnLidChatId?: string | null;
}): OutboundChatResolution {
  const phoneDigits = params.phoneDigits.replace(/\D/g, '');
  const fallback = asCus(phoneDigits);
  const lidHint = asLidHint(params.pnLidChatId) || asLidHint(params.checkNumberChatId);

  const checked = params.checkNumberChatId?.trim();
  if (checked && /@c\.us$/i.test(checked)) {
    const user = checked.split('@')[0] || phoneDigits;
    return {
      chatId: checked.toLowerCase(),
      phoneForSend: user.replace(/\D/g, '') || phoneDigits,
      isLid: false,
      destinationKind: 'c_us',
      resolvedFrom: 'check_number_c_us',
      lidHint,
    };
  }

  if (checked && /@lid$/i.test(checked)) {
    return {
      chatId: fallback,
      phoneForSend: phoneDigits,
      isLid: false,
      destinationKind: 'c_us',
      resolvedFrom: 'check_number_lid_ignored',
      lidHint: checked.toLowerCase(),
    };
  }

  if (params.pnLidChatId && /@lid$/i.test(params.pnLidChatId)) {
    return {
      chatId: fallback,
      phoneForSend: phoneDigits,
      isLid: false,
      destinationKind: 'c_us',
      resolvedFrom: 'pn_lid_ignored',
      lidHint: params.pnLidChatId.toLowerCase(),
    };
  }

  return {
    chatId: fallback,
    phoneForSend: phoneDigits,
    isLid: false,
    destinationKind: 'c_us',
    resolvedFrom: 'phone_c_us',
    lidHint,
  };
}

/** Crash típico do WPPConnect 2.10.0 ao serializar o retorno de sendText. */
export function isGetMessageByIdFailure(message: string): boolean {
  const raw = message.toLowerCase();
  if (raw.includes('getmessagebyid')) return true;
  if (raw.includes('oftware_send_unconfirmed')) return true;
  if (raw.includes('cannot read properties of undefined') && raw.includes('get')) return true;
  if (raw.includes('cannot read properties') && (raw.includes("reading 'get'") || raw.includes('reading "get"'))) {
    return true;
  }
  return false;
}

/** Sucesso real do provider — não inclui ok_ambiguous / deliveryUncertain. */
export function isConfirmedWhatsappSend(result: { deliveryUncertain?: boolean }): boolean {
  return result.deliveryUncertain !== true;
}

/**
 * TIMEOUT após o POST às vezes significa confirmação lenta.
 * SERVER_ERROR / getMessageById / ok_ambiguous NÃO entram — a aplicação
 * não pode dizer “enviada”.
 */
export function shouldTreatPostSendErrorAsDelivered(error: {
  message: string;
  code: string;
}): boolean {
  if (error.code === 'SEND_UNCONFIRMED' || error.code === 'SERVER_ERROR') return false;
  if (isGetMessageByIdFailure(error.message)) return false;
  if (error.code === 'TIMEOUT') return true;
  const msg = error.message.toLowerCase();
  return msg.includes('tempo esgotado');
}

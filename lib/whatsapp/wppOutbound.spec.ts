import { describe, expect, it } from 'vitest';
import { WhatsappProviderError } from '@/services/whatsappProviderClient';
import { isWhatsappSessionHealthFailure } from '@/lib/whatsapp/whatsappSessionHealth';
import {
  chooseOutboundChatId,
  destinationKindOf,
  isConfirmedWhatsappSend,
  isGetMessageByIdFailure,
  shouldTreatPostSendErrorAsDelivered,
} from '@/lib/whatsapp/wppOutbound';

describe('chooseOutboundChatId', () => {
  it('usa @c.us a partir do telefone quando não há resolução extra', () => {
    const resolved = chooseOutboundChatId({ phoneDigits: '5583988192848' });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.phoneForSend).toBe('5583988192848');
    expect(resolved.isLid).toBe(false);
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('phone_c_us');
    expect(resolved.lidHint).toBeUndefined();
  });

  it('prefere o @c.us devolvido pelo check-number-status', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      checkNumberChatId: '5583988192848@c.us',
    });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('check_number_c_us');
    expect(resolved.isLid).toBe(false);
  });

  it('ignora @lid do check-number-status e envia @c.us', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      checkNumberChatId: '279958870077456@lid',
    });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.phoneForSend).toBe('5583988192848');
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('check_number_lid_ignored');
    expect(resolved.lidHint).toBe('279958870077456@lid');
    expect(resolved.isLid).toBe(false);
  });

  it('ignora o LID do contact/pn-lid e não envia para @lid', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      pnLidChatId: '279958870077456@lid',
    });
    expect(resolved.chatId).toBe('5583988192848@c.us');
    expect(resolved.phoneForSend).toBe('5583988192848');
    expect(resolved.destinationKind).toBe('c_us');
    expect(resolved.resolvedFrom).toBe('pn_lid_ignored');
    expect(resolved.lidHint).toBe('279958870077456@lid');
    expect(destinationKindOf(resolved.chatId)).toBe('c_us');
  });

  it('se check-number devolver @c.us, ignora pn-lid no destino', () => {
    const resolved = chooseOutboundChatId({
      phoneDigits: '5583988192848',
      checkNumberChatId: '55839988192848@c.us',
      pnLidChatId: '279958870077456@lid',
    });
    expect(resolved.chatId).toBe('55839988192848@c.us');
    expect(resolved.resolvedFrom).toBe('check_number_c_us');
    expect(resolved.lidHint).toBe('279958870077456@lid');
    expect(resolved.isLid).toBe(false);
  });
});

describe('isGetMessageByIdFailure / classificação de sucesso', () => {
  it('detecta o crash do WPPConnect 2.10.0 em getMessageById', () => {
    expect(
      isGetMessageByIdFailure("Cannot read properties of undefined (reading 'get')"),
    ).toBe(true);
    expect(isGetMessageByIdFailure('OFTWARE_SEND_UNCONFIRMED: getMessageById')).toBe(true);
    expect(isGetMessageByIdFailure('Número não encontrado no WhatsApp.')).toBe(false);
  });

  it('não classifica getMessageById como mensagem enviada', () => {
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'SERVER_ERROR',
        message: "Cannot read properties of undefined (reading 'get')",
      }),
    ).toBe(false);
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'SEND_UNCONFIRMED',
        message:
          'O WhatsApp não confirmou o envio. A mensagem não foi marcada como enviada — tente de novo em alguns segundos.',
      }),
    ).toBe(false);
  });

  it('SERVER_ERROR e ok_ambiguous não contam como enviada', () => {
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'SERVER_ERROR',
        message: 'Erro ao enviar a mensagem.',
      }),
    ).toBe(false);
  });

  it('continua tratando TIMEOUT pós-envio como incerto no provider', () => {
    expect(
      shouldTreatPostSendErrorAsDelivered({
        code: 'TIMEOUT',
        message: 'Tempo esgotado ao comunicar com o servidor WPPConnect.',
      }),
    ).toBe(true);
  });

  it('só confirma envio sem deliveryUncertain', () => {
    expect(isConfirmedWhatsappSend({ deliveryUncertain: true })).toBe(false);
    expect(isConfirmedWhatsappSend({ deliveryUncertain: false })).toBe(true);
    expect(isConfirmedWhatsappSend({})).toBe(true);
  });

  it('não marca a sessão como quebrada só por getMessageById', () => {
    const error = new WhatsappProviderError(
      'O WhatsApp não confirmou o envio. A mensagem não foi marcada como enviada — tente de novo em alguns segundos.',
      'SEND_UNCONFIRMED',
    );
    expect(isWhatsappSessionHealthFailure(error)).toBe(false);
  });
});

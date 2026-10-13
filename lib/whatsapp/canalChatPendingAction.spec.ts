import { describe, expect, it } from 'vitest';
import {
  buildCanalChatConfirmationRequestMessage,
  buildPendingPaymentChargeId,
  CANAL_CHAT_PENDING_PAYMENT_CHARGE,
  parsePendingCanalChatPaymentCharge,
} from '@/lib/whatsapp/canalChatPendingAction';

describe('ação pendente do Canal Chat', () => {
  it('monta a mensagem de confirmação com o primeiro nome e pede OK, sem falar em cobrança', () => {
    const text = buildCanalChatConfirmationRequestMessage('Maria da Silva');
    expect(text).toContain('Olá, Maria! 👋');
    expect(text).toContain('responda apenas:');
    expect(text).toContain('OK ✅');
    expect(text.toLowerCase()).not.toContain('cobrança');
    expect(text.toLowerCase()).not.toContain('pagamento');
  });

  it('reconhece PAYMENT_CHARGE e ignora outros tipos', () => {
    expect(
      parsePendingCanalChatPaymentCharge({
        type: CANAL_CHAT_PENDING_PAYMENT_CHARGE,
        paymentId: 'charge_abc',
        medicoId: 'med1',
        valorAberto: 150,
        status: 'pending',
      }),
    ).toEqual({
      type: CANAL_CHAT_PENDING_PAYMENT_CHARGE,
      paymentId: 'charge_abc',
      medicoId: 'med1',
      valorAberto: 150,
      status: 'pending',
    });
    expect(parsePendingCanalChatPaymentCharge({ type: 'OTHER', paymentId: 'x', medicoId: 'y' })).toBeNull();
    expect(parsePendingCanalChatPaymentCharge(null)).toBeNull();
  });

  it('gera paymentId estável por paciente', () => {
    expect(buildPendingPaymentChargeId('p1')).toBe('charge_p1');
  });
});

import { describe, expect, it } from 'vitest';
import { planDisparoContact, renderDisparoMessage } from '@/lib/disparos/campaign';
import { decideExpiredLease, decideSendThrow, shouldPauseForSender } from '@/lib/disparos/workerPolicy';
import type { ImportedContact } from '@/lib/disparos/types';

function contact(partial: Partial<ImportedContact> & Pick<ImportedContact, 'id' | 'nome'>): ImportedContact {
  return {
    importId: 'imp',
    rowNumber: 1,
    primeiroNome: 'José',
    telefone1: {
      original: '83999998888',
      normalized: '5583999998888',
      display: '+55 83 99999-8888',
      issue: null,
      usedDefaultDdd: false,
      alreadyHadDdd: true,
      alreadyHadCountry: false,
    },
    telefone2: null,
    status: 'valido',
    optOut: false,
    ...partial,
  };
}

describe('snapshot da campanha de disparos', () => {
  it('grava a mensagem já com o primeiro nome e deduplica o telefone', () => {
    const used = new Set<string>();
    const first = planDisparoContact(
      contact({ id: 'a', nome: 'JOSÉ DA SILVA' }),
      { audience: 'validos', phoneChoice: 'telefone1', messageTemplate: 'Olá, {nome}!' },
      used,
    );
    const second = planDisparoContact(
      contact({ id: 'b', nome: 'José da Silva Filho', primeiroNome: 'José' }),
      { audience: 'validos', phoneChoice: 'telefone1', messageTemplate: 'Olá, {nome}!' },
      used,
    );
    expect(first.status).toBe('pending');
    expect(first.mensagemFinal).toBe(renderDisparoMessage('Olá, {nome}!', 'José'));
    expect(second.status).toBe('ignored');
    expect(second.ignoreReason).toBe('duplicado');
  });

  it('não envia opt-out', () => {
    const planned = planDisparoContact(
      contact({ id: 'c', nome: 'Maria', status: 'opt_out', optOut: true }),
      { audience: 'validos', phoneChoice: 'telefone1', messageTemplate: 'Olá, {nome}!' },
      new Set(),
    );
    expect(planned.status).toBe('ignored');
    expect(planned.ignoreReason).toBe('opt_out');
  });
});

describe('lease e falha do envio', () => {
  it('devolve o item se o worker morreu antes de chamar o provedor', () => {
    expect(decideExpiredLease('claimed')).toBe('return_pending');
    expect(decideExpiredLease(null)).toBe('return_pending');
  });

  it('não reenvia se a chamada ao provedor pode ter saído', () => {
    expect(decideExpiredLease('sending')).toBe('needs_review');
    expect(decideSendThrow('TIMEOUT', 'tempo esgotado')).toBe('ambiguous_review');
    expect(decideSendThrow('SESSION_NOT_READY', 'Sessão indisponível')).toBe('retry_later');
    expect(decideSendThrow('SEND_ERROR', 'invalid wid')).toBe('recipient_failed');
    expect(decideSendThrow('SEND_REJECTED', 'isSendFailure')).toBe('recipient_failed');
    expect(decideSendThrow('INVALID_PHONE', 'não está disponível no WhatsApp')).toBe('recipient_failed');
    expect(shouldPauseForSender('retry_later', '')).toBe(true);
    expect(shouldPauseForSender('recipient_failed', 'invalid wid')).toBe(false);
  });
});

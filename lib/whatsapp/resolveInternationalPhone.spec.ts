import { describe, expect, it } from 'vitest';
import { normalizeWhatsappPhone, WhatsappProviderError } from '@/services/whatsappProviderClient';
import {
  applyBrazilMobileNinthDigit,
  InternationalPhoneError,
  resolveInternationalPhone,
  resolveInternationalPhoneFromIdentificacao,
  resolveLegacyBrazilWhatsappPhone,
  tryResolveInternationalPhone,
} from '@/lib/whatsapp/resolveInternationalPhone';

describe('resolveInternationalPhone — legado BR', () => {
  it('83988192848 → 5583988192848', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe('5583988192848');
  });

  it('(83) 98819-2848 → 5583988192848', () => {
    expect(resolveInternationalPhone({ telefone: '(83) 98819-2848' })).toBe('5583988192848');
  });

  it('não duplica 55 se o legado já veio com DDI', () => {
    expect(resolveInternationalPhone({ telefone: '5583988192848' })).toBe('5583988192848');
  });

  it('insere 9º dígito em celular BR antigo de 10 dígitos nacionais', () => {
    expect(resolveInternationalPhone({ telefone: '8388192848' })).toBe('5583988192848');
  });
});

describe('resolveInternationalPhone — Brasil com DDI explícito', () => {
  it('ddi 55 + 83988192848 → 5583988192848', () => {
    expect(
      resolveInternationalPhone({ telefone: '83988192848', telefoneDdi: '55' }),
    ).toBe('5583988192848');
  });

  it('aceita + no DDI brasileiro', () => {
    expect(
      resolveInternationalPhone({ telefone: '83988192848', telefoneDdi: '+55' }),
    ).toBe('5583988192848');
  });

  it('não duplica se o nacional já começa com 55', () => {
    expect(
      resolveInternationalPhone({ telefone: '5583988192848', telefoneDdi: '55' }),
    ).toBe('5583988192848');
  });

  it('aplica 9º dígito somente com DDI 55', () => {
    expect(
      resolveInternationalPhone({ telefone: '8388192848', telefoneDdi: '55' }),
    ).toBe('5583988192848');
  });
});

describe('resolveInternationalPhone — EUA', () => {
  it('ddi 1 + 7137326616 → 17137326616', () => {
    expect(
      resolveInternationalPhone({ telefone: '7137326616', telefoneDdi: '1' }),
    ).toBe('17137326616');
  });

  it('ddi 1 + (713) 732-6616 → 17137326616', () => {
    expect(
      resolveInternationalPhone({ telefone: '(713) 732-6616', telefoneDdi: '1' }),
    ).toBe('17137326616');
  });

  it('NÃO prefixa 55 quando o DDI é 1', () => {
    expect(
      resolveInternationalPhone({ telefone: '7137326616', telefoneDdi: '1' }),
    ).not.toBe('557137326616');
  });

  it('não aplica 9º dígito brasileiro em número dos EUA', () => {
    expect(
      resolveInternationalPhone({ telefone: '6175551234', telefoneDdi: '1' }),
    ).toBe('16175551234');
  });
});

describe('resolveInternationalPhone — Portugal', () => {
  it('ddi 351 + 912345678 → 351912345678', () => {
    expect(
      resolveInternationalPhone({ telefone: '912345678', telefoneDdi: '351' }),
    ).toBe('351912345678');
  });
});

describe('resolveInternationalPhone — telefoneE164', () => {
  it('telefoneE164 17137326616 → 17137326616', () => {
    expect(resolveInternationalPhone({ telefoneE164: '17137326616' })).toBe('17137326616');
  });

  it('E164 tem prioridade sobre DDI + nacional', () => {
    expect(
      resolveInternationalPhone({
        telefoneE164: '17137326616',
        telefoneDdi: '55',
        telefone: '83988192848',
      }),
    ).toBe('17137326616');
  });

  it('aceita + no E164', () => {
    expect(resolveInternationalPhone({ telefoneE164: '+17137326616' })).toBe('17137326616');
  });

  it('aplica 9º dígito se o E164 for BR antigo sem o 9', () => {
    expect(resolveInternationalPhone({ telefoneE164: '558388192848' })).toBe('5583988192848');
  });
});

describe('resolveInternationalPhone — formatação e vazios', () => {
  it('ignora espaços, parênteses e hífens no nacional', () => {
    expect(
      resolveInternationalPhone({ telefone: '  (83) 98819-2848  ' }),
    ).toBe('5583988192848');
  });

  it('DDI só com + ou espaços conta como ausente e cai no legado', () => {
    expect(
      resolveInternationalPhone({ telefone: '83988192848', telefoneDdi: ' +  ' }),
    ).toBe('5583988192848');
  });

  it('E164 vazio cai para DDI + nacional', () => {
    expect(
      resolveInternationalPhone({
        telefoneE164: '   ',
        telefoneDdi: '1',
        telefone: '7137326616',
      }),
    ).toBe('17137326616');
  });

  it('rejeita vazio', () => {
    expect(() => resolveInternationalPhone({ telefone: '' })).toThrow(InternationalPhoneError);
    expect(() => resolveInternationalPhone({})).toThrow(/Informe um número/);
  });

  it('DDI sem nacional é vazio', () => {
    expect(() => resolveInternationalPhone({ telefoneDdi: '1', telefone: '' })).toThrow(
      InternationalPhoneError,
    );
  });

  it('rejeita comprimento abaixo de 10', () => {
    expect(() => resolveInternationalPhone({ telefone: '83988192' })).toThrow(/Número inválido/);
  });

  it('rejeita comprimento acima de 15', () => {
    expect(() =>
      resolveInternationalPhone({ telefoneE164: '1234567890123456' }),
    ).toThrow(/Número inválido/);
  });

  it('tryResolve devolve null só quando não há dígitos', () => {
    expect(tryResolveInternationalPhone({})).toBeNull();
    expect(tryResolveInternationalPhone({ telefone: '   ' })).toBeNull();
    expect(() => tryResolveInternationalPhone({ telefone: '123' })).toThrow(InternationalPhoneError);
  });
});

describe('resolveInternationalPhoneFromIdentificacao', () => {
  it('lê os três campos opcionais de dadosIdentificacao', () => {
    expect(
      resolveInternationalPhoneFromIdentificacao({
        telefone: '7137326616',
        telefoneDdi: '1',
      }),
    ).toBe('17137326616');
  });
});

describe('applyBrazilMobileNinthDigit', () => {
  it('não altera números que não começam com 55', () => {
    expect(applyBrazilMobileNinthDigit('17137326616')).toBe('17137326616');
    expect(applyBrazilMobileNinthDigit('351912345678')).toBe('351912345678');
  });
});

describe('normalizeWhatsappPhone — regressão legado (callers atuais)', () => {
  it('continua transformando 83988192848 em 5583988192848', () => {
    expect(normalizeWhatsappPhone('83988192848')).toBe('5583988192848');
    expect(normalizeWhatsappPhone('(83) 98819-2848')).toBe('5583988192848');
    expect(resolveLegacyBrazilWhatsappPhone('83988192848')).toBe('5583988192848');
  });

  it('sem DDI, 11 dígitos ainda são tratados como BR (armadilha conhecida do teste EUA)', () => {
    expect(normalizeWhatsappPhone('17137326616')).toBe('5517137326616');
  });

  it('erro de telefone vazio permanece INVALID_PHONE no provider', () => {
    try {
      normalizeWhatsappPhone('abc');
      throw new Error('deveria ter lançado');
    } catch (error) {
      expect(error).toBeInstanceOf(WhatsappProviderError);
      expect((error as WhatsappProviderError).code).toBe('INVALID_PHONE');
    }
  });
});

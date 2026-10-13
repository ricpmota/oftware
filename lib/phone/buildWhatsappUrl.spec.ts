import { describe, expect, it } from 'vitest';
import {
  buildPatientWhatsappUrl,
  buildWhatsappUrl,
  resolveWhatsappCanonicalDigits,
} from '@/lib/phone/buildWhatsappUrl';
import {
  resolveInternationalPhone,
  resolveInternationalPhoneFromIdentificacao,
} from '@/lib/whatsapp/resolveInternationalPhone';

describe('buildWhatsappUrl', () => {
  it('A — BR legado 83988192848 → wa.me/5583988192848', () => {
    expect(buildWhatsappUrl({ telefone: '83988192848' })).toBe(
      'https://wa.me/5583988192848',
    );
  });

  it('B — BR explícito ddi 55 + 83988192848', () => {
    expect(
      buildWhatsappUrl({ telefone: '83988192848', telefoneDdi: '55' }),
    ).toBe('https://wa.me/5583988192848');
  });

  it('C — EUA 7137326616 + DDI 1', () => {
    expect(
      buildWhatsappUrl({ telefone: '7137326616', telefoneDdi: '1' }),
    ).toBe('https://wa.me/17137326616');
  });

  it('D — Portugal 912345678 + DDI 351', () => {
    expect(
      buildWhatsappUrl({ telefone: '912345678', telefoneDdi: '351' }),
    ).toBe('https://wa.me/351912345678');
  });

  it('E — telefoneE164 17137326616', () => {
    expect(buildWhatsappUrl({ telefoneE164: '17137326616' })).toBe(
      'https://wa.me/17137326616',
    );
  });

  it('F — telefone mascarado BR (83) 98819-2848', () => {
    expect(buildWhatsappUrl({ telefone: '(83) 98819-2848' })).toBe(
      'https://wa.me/5583988192848',
    );
  });

  it('G — mensagem Olá João! com encodeURIComponent', () => {
    const url = buildWhatsappUrl({ telefone: '83988192848' }, 'Olá João!');
    expect(url).toBe(
      `https://wa.me/5583988192848?text=${encodeURIComponent('Olá João!')}`,
    );
    expect(url).toContain('Ol%C3%A1%20Jo%C3%A3o!');
  });

  it('H — vazio/inválido não produz link', () => {
    expect(buildWhatsappUrl({ telefone: '' })).toBeNull();
    expect(buildWhatsappUrl({ telefone: '   ' })).toBeNull();
    expect(buildWhatsappUrl({ telefone: 'abc' })).toBeNull();
    expect(buildWhatsappUrl({ telefone: '123' })).toBeNull();
    expect(buildWhatsappUrl({})).toBeNull();
  });

  it('I — EUA de 11 dígitos canônicos NÃO recebe 55', () => {
    const fromDdi = buildWhatsappUrl({
      telefone: '7137326616',
      telefoneDdi: '1',
    });
    const fromE164 = buildWhatsappUrl({ telefoneE164: '17137326616' });
    expect(fromDdi).toBe('https://wa.me/17137326616');
    expect(fromE164).toBe('https://wa.me/17137326616');
    expect(fromDdi).not.toContain('/557137326616');
    expect(fromDdi).not.toContain('/5517137326616');
    expect(fromE164).not.toMatch(/wa\.me\/55/);
  });

  it('path sem +, espaços, parênteses ou hífens', () => {
    const url = buildWhatsappUrl({
      telefone: '(713) 732-6616',
      telefoneDdi: '+1',
    });
    expect(url).toBe('https://wa.me/17137326616');
    expect(url).not.toMatch(/[+\s()-]/);
  });
});

describe('buildPatientWhatsappUrl', () => {
  it('usa telefone + DDI do documento', () => {
    expect(
      buildPatientWhatsappUrl({
        dadosIdentificacao: {
          telefone: '7137326616',
          telefoneDdi: '1',
        },
      }),
    ).toBe('https://wa.me/17137326616');
  });

  it('legado sem DDI continua Brasil', () => {
    expect(
      buildPatientWhatsappUrl({
        dadosIdentificacao: { telefone: '83988192848' },
      }),
    ).toBe('https://wa.me/5583988192848');
  });

  it('mensagem no paciente não altera o destino além do query', () => {
    const url = buildPatientWhatsappUrl(
      { dadosIdentificacao: { telefone: '83988192848', telefoneDdi: '55' } },
      'Olá João!',
    );
    expect(url).toBe(
      `https://wa.me/5583988192848?text=${encodeURIComponent('Olá João!')}`,
    );
  });

  it('paciente nulo ou sem telefone → null', () => {
    expect(buildPatientWhatsappUrl(null)).toBeNull();
    expect(buildPatientWhatsappUrl({ dadosIdentificacao: {} })).toBeNull();
  });
});

describe('J — regressão das Etapas 1–3 no resolver', () => {
  it('prioridade E164 → DDI+nacional → legado BR', () => {
    expect(resolveInternationalPhone({ telefoneE164: '17137326616' })).toBe(
      '17137326616',
    );
    expect(
      resolveInternationalPhone({ telefone: '912345678', telefoneDdi: '351' }),
    ).toBe('351912345678');
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe(
      '5583988192848',
    );
  });

  it('identificacao com DDI 1 não vira 55', () => {
    expect(
      resolveInternationalPhoneFromIdentificacao({
        telefone: '7137326616',
        telefoneDdi: '1',
      }),
    ).toBe('17137326616');
  });

  it('dígitos canônicos do helper batem com o resolver', () => {
    const fields = { telefone: '83988192848', telefoneDdi: '55' };
    expect(resolveWhatsappCanonicalDigits(fields)).toBe(
      resolveInternationalPhone(fields),
    );
  });
});

import { describe, expect, it } from 'vitest';
import {
  countriesWithDdi,
  getPhoneCountryOrDefault,
  listPhoneCountries,
  resolvePhoneCountryIso,
  searchPhoneCountries,
} from '@/lib/phone/callingCountries';
import {
  formatInternationalPhoneDisplay,
  formatNationalPhone,
  isPossibleNationalPhone,
  nationalDigitsForCountry,
  toPersistedInternationalPhone,
  viewCountryFromIdentificacao,
} from '@/lib/phone/internationalPhoneValue';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';
import { pacienteTemTelefoneParaWhatsapp } from '@/lib/metaadmin/buildNovoPacienteCompleto';
import { buildNovoPacienteCompleto } from '@/lib/metaadmin/buildNovoPacienteCompleto';

describe('lista de países / DDI', () => {
  it('inclui o mundo (não só BR/US/PT) e prioriza Brasil', () => {
    const list = listPhoneCountries();
    expect(list.length).toBeGreaterThan(100);
    expect(list[0]?.iso).toBe('BR');
    expect(list[0]?.ddi).toBe('55');
    expect(list.some((c) => c.iso === 'US' && c.ddi === '1')).toBe(true);
    expect(list.some((c) => c.iso === 'PT' && c.ddi === '351')).toBe(true);
    expect(list.some((c) => c.iso === 'JP')).toBe(true);
  });

  it('busca por nome e por DDI', () => {
    expect(searchPhoneCountries('Portugal').some((c) => c.iso === 'PT')).toBe(true);
    expect(searchPhoneCountries('351').some((c) => c.iso === 'PT')).toBe(true);
    expect(searchPhoneCountries('estados unidos').some((c) => c.iso === 'US')).toBe(true);
  });

  it('DDI +1 não assume um único país', () => {
    const nanp = countriesWithDdi('1');
    expect(nanp.length).toBeGreaterThan(1);
    expect(nanp.some((c) => c.iso === 'US')).toBe(true);
    expect(nanp.some((c) => c.iso === 'CA')).toBe(true);
  });
});

describe('ETAPA 2 — paciente antigo (sem telefoneDdi)', () => {
  const legado = { telefone: '83988192848' };

  it('UI assume 🇧🇷 +55 sem reescrever o valor', () => {
    const view = viewCountryFromIdentificacao(legado);
    expect(view.iso).toBe('BR');
    expect(view.ddi).toBe('55');
    expect(view.flag).toContain('🇧🇷');
    expect(view.isLegacyBrazil).toBe(true);
    expect(legado).toEqual({ telefone: '83988192848' });
  });

  it('máscara brasileira no display', () => {
    expect(formatInternationalPhoneDisplay(legado)).toBe('🇧🇷 +55 (83) 98819-2848');
  });

  it('envio WhatsApp legado → 5583988192848', () => {
    expect(resolveInternationalPhone(legado)).toBe('5583988192848');
  });
});

describe('ETAPA 2 — Brasil novo / EUA / Portugal', () => {
  it('Brasil novo telefone + ddi 55 → 5583988192848', () => {
    const saved = toPersistedInternationalPhone('BR', '83988192848', '55');
    expect(saved).toEqual({
      telefone: '83988192848',
      telefoneDdi: '55',
      telefonePais: 'BR',
    });
    expect(resolveInternationalPhone(saved)).toBe('5583988192848');
    expect(formatNationalPhone('BR', saved.telefone)).toBe('(83) 98819-2848');
  });

  it('EUA salva nacional separado do DDI', () => {
    const saved = toPersistedInternationalPhone('US', '7137326616', '1');
    expect(saved).toEqual({
      telefone: '7137326616',
      telefoneDdi: '1',
      telefonePais: 'US',
    });
    expect(saved.telefone).not.toBe('17137326616');
    expect(resolveInternationalPhone(saved)).toBe('17137326616');
    expect(formatInternationalPhoneDisplay(saved)).toBe('🇺🇸 +1 (713) 732-6616');
  });

  it('Portugal 912345678 + 351 → 351912345678', () => {
    const saved = toPersistedInternationalPhone('PT', '912345678', '351');
    expect(saved).toEqual({
      telefone: '912345678',
      telefoneDdi: '351',
      telefonePais: 'PT',
    });
    expect(resolveInternationalPhone(saved)).toBe('351912345678');
    expect(formatInternationalPhoneDisplay(saved)).toMatch(/🇵🇹 \+351 912\s?345\s?678/);
  });
});

describe('ETAPA 2 — troca de país e máscara', () => {
  it('Brasil → EUA não mantém máscara BR', () => {
    const br = formatNationalPhone('BR', '83988192848');
    expect(br).toBe('(83) 98819-2848');
    const us = formatNationalPhone('US', '7137326616');
    expect(us).toBe('(713) 732-6616');
    expect(us).not.toMatch(/\(83\)/);
  });

  it('EUA → Brasil volta a máscara BR', () => {
    expect(formatNationalPhone('US', '7137326616')).toBe('(713) 732-6616');
    expect(formatNationalPhone('BR', '83988192848')).toBe('(83) 98819-2848');
  });

  it('não aplica 10/11 dígitos BR em número dos EUA', () => {
    expect(isPossibleNationalPhone('US', '7137326616')).toBe(true);
    expect(isPossibleNationalPhone('PT', '912345678')).toBe(true);
    expect(isPossibleNationalPhone('BR', '83988192848')).toBe(true);
  });
});

describe('ETAPA 2 — DDI compartilhado e ISO', () => {
  it('sem telefonePais, +1 mostra EUA só na UI (não inventa o país no save)', () => {
    expect(resolvePhoneCountryIso({ telefoneDdi: '1' })).toBe('US');
    expect(getPhoneCountryOrDefault({ telefoneDdi: '1' }).iso).toBe('US');
    expect(resolvePhoneCountryIso({ telefoneDdi: '1', telefonePais: 'CA' })).toBe('CA');
  });

  it('nacional não inclui o DDI mesmo se o usuário colar +1', () => {
    expect(nationalDigitsForCountry('+1 713 732 6616', 'US', '1')).toBe('7137326616');
    expect(nationalDigitsForCountry('17137326616', 'US', '1')).toBe('7137326616');
  });
});

describe('ETAPA 2 — paciente novo e gate WhatsApp', () => {
  it('paciente novo nasce com Brasil padrão, sem migrar legado', () => {
    const novo = buildNovoPacienteCompleto({ medicoId: 'm1', medicoUserId: 'uid1' });
    expect(novo.dadosIdentificacao.telefoneDdi).toBe('55');
    expect(novo.dadosIdentificacao.telefonePais).toBe('BR');
  });

  it('Portugal com DDI passa no gate (não exige 10 dígitos BR)', () => {
    expect(
      pacienteTemTelefoneParaWhatsapp({
        dadosIdentificacao: {
          nomeCompleto: '',
          email: '',
          dataCadastro: new Date(),
          endereco: {},
          telefone: '912345678',
          telefoneDdi: '351',
        },
      }),
    ).toBe(true);
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { phoneLookupVariants } from '@/lib/whatsapp/canalChatInboundMessage';
import {
  INBOUND_PHONE_QUERY_LIMIT,
  inboundIdentLookupValues,
  inboundPatientMatchesCanonical,
  inboundPhoneKeyLookupValues,
  parseCanonicalWhatsappPhone,
} from '@/lib/whatsapp/canalChatInboundPhoneMatch';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';
import { tryResolvePhoneFromLeadDoc } from '@/lib/whatsapp/resolveLeadPhone';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const BR_INBOUND = '5583988192848';
const US_INBOUND = '17137326616';
const PT_INBOUND = '351912345678';
const BR_COLLISION_NATIONAL = '7137326616';
const BR_COLLISION_INBOUND = '557137326616';

const DOC_BR_LEGADO_KEY = {
  canalChatPhoneKey: BR_INBOUND,
  dadosIdentificacao: { telefone: '83988192848' },
};
const DOC_BR_LEGADO = {
  dadosIdentificacao: { telefone: '83988192848' },
};
const DOC_BR_NOVO = {
  dadosIdentificacao: { telefone: '83988192848', telefoneDdi: '55', telefonePais: 'BR' },
};
const DOC_US_KEY = {
  canalChatPhoneKey: US_INBOUND,
  dadosIdentificacao: { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' },
};
const DOC_US = {
  dadosIdentificacao: { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' },
};
const DOC_US_NANP_SEM_PAIS = {
  dadosIdentificacao: { telefone: '7137326616', telefoneDdi: '1' },
};
const DOC_PT_KEY = {
  canalChatPhoneKey: PT_INBOUND,
  dadosIdentificacao: { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' },
};
const DOC_PT = {
  dadosIdentificacao: { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' },
};
const DOC_BR_COLLISION = {
  dadosIdentificacao: { telefone: BR_COLLISION_NATIONAL },
};
const DOC_E164 = {
  dadosIdentificacao: { telefoneE164: US_INBOUND },
};
const DOC_ROOT_LEGADO = {
  telefone: '83988192848',
};

describe('ETAPA 10 — parse do canônico inbound', () => {
  it('US 17137326616 → callingCode 1 + national 7137326616', () => {
    expect(parseCanonicalWhatsappPhone(US_INBOUND)).toEqual({
      canonical: US_INBOUND,
      callingCode: '1',
      nationalNumber: '7137326616',
    });
  });

  it('PT 351912345678 → 351 + 912345678', () => {
    expect(parseCanonicalWhatsappPhone(PT_INBOUND)).toEqual({
      canonical: PT_INBOUND,
      callingCode: '351',
      nationalNumber: '912345678',
    });
  });

  it('BR 5583988192848 → 55 + 83988192848', () => {
    expect(parseCanonicalWhatsappPhone(BR_INBOUND)).toEqual({
      canonical: BR_INBOUND,
      callingCode: '55',
      nationalNumber: '83988192848',
    });
  });

  it('K — telefone inválido → null / lookup vazio', () => {
    expect(parseCanonicalWhatsappPhone('')).toBeNull();
    expect(parseCanonicalWhatsappPhone('123')).toBeNull();
    expect(inboundIdentLookupValues('123')).toEqual([]);
    expect(inboundPatientMatchesCanonical(DOC_US, '123')).toBe(false);
  });
});

describe('ETAPA 10 — lookup values incluem nacional parseado', () => {
  it('US sem key: ident lookup contém 7137326616', () => {
    expect(inboundIdentLookupValues(US_INBOUND)).toContain('7137326616');
    expect(inboundIdentLookupValues(US_INBOUND)).toContain(US_INBOUND);
  });

  it('PT sem key: ident lookup contém 912345678', () => {
    expect(inboundIdentLookupValues(PT_INBOUND)).toContain('912345678');
    expect(inboundIdentLookupValues(PT_INBOUND)).toContain(PT_INBOUND);
  });

  it('BR legado: variants continuam com nacional', () => {
    expect(phoneLookupVariants(BR_INBOUND)).toContain('83988192848');
    expect(inboundIdentLookupValues(BR_INBOUND)).toContain('83988192848');
    expect(inboundPhoneKeyLookupValues(BR_INBOUND)).toContain(BR_INBOUND);
  });
});

describe('ETAPA 10 — matching inbound A–O', () => {
  it('A — BR legado com canalChatPhoneKey', () => {
    expect(inboundPatientMatchesCanonical(DOC_BR_LEGADO_KEY, BR_INBOUND)).toBe(true);
  });

  it('B — BR legado SEM canalChatPhoneKey encontra pelo ident', () => {
    expect(inboundPatientMatchesCanonical(DOC_BR_LEGADO, BR_INBOUND)).toBe(true);
  });

  it('C — BR novo estruturado', () => {
    expect(inboundPatientMatchesCanonical(DOC_BR_NOVO, BR_INBOUND)).toBe(true);
  });

  it('D — US estruturado COM canalChatPhoneKey', () => {
    expect(inboundPatientMatchesCanonical(DOC_US_KEY, US_INBOUND)).toBe(true);
  });

  it('E — US estruturado SEM canalChatPhoneKey agora encontra', () => {
    expect(inboundPatientMatchesCanonical(DOC_US, US_INBOUND)).toBe(true);
    expect(inboundIdentLookupValues(US_INBOUND)).toContain('7137326616');
  });

  it('F — PT estruturado COM canalChatPhoneKey', () => {
    expect(inboundPatientMatchesCanonical(DOC_PT_KEY, PT_INBOUND)).toBe(true);
  });

  it('G — PT estruturado SEM canalChatPhoneKey agora encontra', () => {
    expect(inboundPatientMatchesCanonical(DOC_PT, PT_INBOUND)).toBe(true);
    expect(inboundIdentLookupValues(PT_INBOUND)).toContain('912345678');
  });

  it('H — inbound US 17137326616 escolhe US e não BR do mesmo nacional', () => {
    expect(inboundPatientMatchesCanonical(DOC_US, US_INBOUND)).toBe(true);
    expect(inboundPatientMatchesCanonical(DOC_BR_COLLISION, US_INBOUND)).toBe(false);
    const candidatos = [DOC_BR_COLLISION, DOC_US].filter((doc) =>
      inboundPatientMatchesCanonical(doc, US_INBOUND),
    );
    expect(candidatos).toEqual([DOC_US]);
  });

  it('I — inbound BR do nacional 7137326616 não seleciona US', () => {
    expect(inboundPatientMatchesCanonical(DOC_BR_COLLISION, BR_COLLISION_INBOUND)).toBe(true);
    expect(inboundPatientMatchesCanonical(DOC_US, BR_COLLISION_INBOUND)).toBe(false);
  });

  it('J — telefone inexistente → nenhum paciente', () => {
    expect(inboundPatientMatchesCanonical(DOC_US, '14155552671')).toBe(false);
    expect(inboundPatientMatchesCanonical(DOC_BR_LEGADO, '14155552671')).toBe(false);
  });

  it('L — NANP / +1 casa por DDI+nacional sem telefonePais', () => {
    expect(inboundPatientMatchesCanonical(DOC_US_NANP_SEM_PAIS, US_INBOUND)).toBe(true);
  });

  it('M — doc com telefoneE164', () => {
    expect(inboundPatientMatchesCanonical(DOC_E164, US_INBOUND)).toBe(true);
  });

  it('N — root telefone legado', () => {
    expect(inboundPatientMatchesCanonical(DOC_ROOT_LEGADO, BR_INBOUND)).toBe(true);
    expect(inboundPatientMatchesCanonical(DOC_ROOT_LEGADO, US_INBOUND)).toBe(false);
  });

  it('O — múltiplos candidatos nacionais → somente canônico correto', () => {
    const docs = [DOC_BR_COLLISION, DOC_US, DOC_PT, DOC_BR_LEGADO];
    expect(docs.filter((d) => inboundPatientMatchesCanonical(d, US_INBOUND))).toEqual([DOC_US]);
    expect(docs.filter((d) => inboundPatientMatchesCanonical(d, PT_INBOUND))).toEqual([DOC_PT]);
    expect(docs.filter((d) => inboundPatientMatchesCanonical(d, BR_INBOUND))).toEqual([DOC_BR_LEGADO]);
  });
});

describe('ETAPA 10 — wiring inbound / limites / sem escrita no lookup', () => {
  it('serviço consulta nacional parseado e valida canônico', () => {
    const src = readRepo('services/canalChatInboundService.ts');
    expect(src).toContain('inboundIdentLookupValues');
    expect(src).toContain('inboundPatientMatchesCanonical');
    expect(src).toContain('INBOUND_PHONE_QUERY_LIMIT');
    expect(src).toContain('.limit(INBOUND_PHONE_QUERY_LIMIT)');
    expect(src).not.toContain('phonesLikelyMatch');
    expect(src).not.toContain('getDocs(collection');
  });

  it('lookup não grava canalChatPhoneKey; aceite OK continua gravando', () => {
    const src = readRepo('services/canalChatInboundService.ts');
    expect(src).toContain('O lookup internacional NÃO escreve a chave automaticamente');
    expect(src).toContain('payload.canalChatPhoneKey = message.phone');
    expect(INBOUND_PHONE_QUERY_LIMIT).toBe(10);
  });

  it('não cria índice novo nem persiste canonical global', () => {
    const match = readRepo('lib/whatsapp/canalChatInboundPhoneMatch.ts');
    expect(match).not.toContain('telefoneCanonical');
    expect(readRepo('firestore.indexes.json')).not.toContain('telefoneCanonical');
  });
});

describe('ETAPA 10 — regressão contratos principais', () => {
  it('BR legado / BR novo / US / PT no resolver', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe(BR_INBOUND);
    expect(resolveInternationalPhone({ telefone: '83988192848', telefoneDdi: '55' })).toBe(
      BR_INBOUND,
    );
    expect(resolveInternationalPhone({ telefone: '7137326616', telefoneDdi: '1' })).toBe(US_INBOUND);
    expect(resolveInternationalPhone({ telefone: '912345678', telefoneDdi: '351' })).toBe(
      PT_INBOUND,
    );
    expect(tryResolvePhoneFromLeadDoc({ telefone: '7137326616', telefoneDdi: '1' })).toBe(
      US_INBOUND,
    );
    expect(tryResolvePhoneFromProfessionalDoc({ telefone: '912345678', telefoneDdi: '351' })).toBe(
      PT_INBOUND,
    );
    expect(getInstagramFounderWhatsAppUrl('medico')).toContain(OFTWARE_WHATSAPP_CTA_NUMBER);
  });
});

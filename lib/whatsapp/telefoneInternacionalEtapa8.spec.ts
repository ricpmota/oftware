import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildTelHref } from '@/lib/phone/buildTelHref';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';
import {
  buildLeadTelHref,
  buildLeadWhatsappUrl,
  leadCanonicalMatchKey,
  leadPhoneWriteFields,
  leadPhoneWriteFieldsFromIdent,
  leadsPhonesMatch,
  persistWhiteLabelWhatsAppFromPayload,
  phoneFieldsFromLead,
  tryResolvePhoneFromLeadDoc,
} from '@/lib/whatsapp/resolveLeadPhone';
import { findIndicacaoForLead, buildIndicacaoByPhoneMap } from '@/lib/crm/resolveLeadReferral';
import { getLeadPhoneDigits, getLeadPhoneFields } from '@/lib/crm/leadContactHelpers';
import type { LeadMedico } from '@/types/leadMedico';
import type { Indicacao } from '@/types/indicacao';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const BR_LEGADO = { telefone: '83988192848' };
const BR_NOVO = { telefone: '83988192848', telefoneDdi: '55', telefonePais: 'BR' };
const US = { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' };
const PT = { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' };

const WL_BR_LEGADO = { whatsapp: '5583988192848' };
const WL_BR_NOVO = { whatsapp: '83988192848', whatsappDdi: '55', whatsappPais: 'BR' };
const WL_US = { whatsapp: '7137326616', whatsappDdi: '1', whatsappPais: 'US' };
const WL_PT = { whatsapp: '912345678', whatsappDdi: '351', whatsappPais: 'PT' };

const LEAD_FORM_FILES = [
  'components/whitelabel/WhiteLabelLeadPageClient.tsx',
  'components/mentoria/MentoriaLeadModal.tsx',
];

function leadMedico(partial: Partial<LeadMedico>): LeadMedico {
  return {
    id: 'l1',
    uid: 'u1',
    email: 'a@test.com',
    name: 'Lead',
    status: 'nao_qualificado',
    dataStatus: new Date(),
    medicoId: 'm1',
    ...partial,
  };
}

describe('ETAPA 8 — LeadMedico A–C', () => {
  it('A — LeadMedico legado BR 83988192848 sem DDI → 5583988192848', () => {
    expect(tryResolvePhoneFromLeadDoc(BR_LEGADO)).toBe('5583988192848');
  });

  it('B — LeadMedico US 7137326616 + 1 → 17137326616', () => {
    expect(tryResolvePhoneFromLeadDoc(US)).toBe('17137326616');
    expect(tryResolvePhoneFromLeadDoc(US)).not.toMatch(/^55/);
  });

  it('C — LeadMedico PT 912345678 + 351 → 351912345678', () => {
    expect(tryResolvePhoneFromLeadDoc(PT)).toBe('351912345678');
  });
});

describe('ETAPA 8 — LeadProfissional D–F', () => {
  it('D — LeadProfissional legado BR', () => {
    expect(tryResolvePhoneFromLeadDoc({ telefone: '11999998888' })).toBe('5511999998888');
  });

  it('E — LeadProfissional US', () => {
    expect(tryResolvePhoneFromLeadDoc(US)).toBe('17137326616');
  });

  it('F — LeadProfissional PT', () => {
    expect(tryResolvePhoneFromLeadDoc(PT)).toBe('351912345678');
  });
});

describe('ETAPA 8 — lead white-label G–I', () => {
  it('G — white-label legado BR (whatsapp já com 55, sem DDI)', () => {
    expect(tryResolvePhoneFromLeadDoc(WL_BR_LEGADO)).toBe('5583988192848');
  });

  it('H — white-label US', () => {
    expect(tryResolvePhoneFromLeadDoc(WL_US)).toBe('17137326616');
    expect(tryResolvePhoneFromLeadDoc(WL_US)).not.toMatch(/^55/);
  });

  it('I — white-label PT', () => {
    expect(tryResolvePhoneFromLeadDoc(WL_PT)).toBe('351912345678');
  });
});

describe('ETAPA 8 — wa.me J–K e tel: L–M', () => {
  it('J — wa.me US', () => {
    expect(buildLeadWhatsappUrl(US)).toBe('https://wa.me/17137326616');
    expect(buildWhatsappUrl(phoneFieldsFromLead(WL_US))).toBe('https://wa.me/17137326616');
  });

  it('K — wa.me PT', () => {
    expect(buildLeadWhatsappUrl(PT)).toBe('https://wa.me/351912345678');
  });

  it('L — tel: US', () => {
    expect(buildLeadTelHref(US)).toBe('tel:+17137326616');
    expect(buildTelHref(phoneFieldsFromLead(US))).toBe('tel:+17137326616');
  });

  it('M — tel: PT', () => {
    expect(buildLeadTelHref(PT)).toBe('tel:+351912345678');
  });
});

describe('ETAPA 8 — validação N e lazy backfill O–P', () => {
  it('N — PT de 9 dígitos aceito', () => {
    expect(isValidIdentificacaoPhone(PT)).toBe(true);
    expect(persistWhiteLabelWhatsAppFromPayload(WL_PT).ok).toBe(true);
  });

  it('O — lead antigo abre como BR sem gravar DDI', () => {
    expect(leadPhoneWriteFields(BR_LEGADO)).toEqual({ telefone: '83988192848' });
    expect(leadPhoneWriteFields(BR_LEGADO)).not.toHaveProperty('telefoneDdi');
    const legadoPersist = persistWhiteLabelWhatsAppFromPayload({ whatsapp: '83988192848' });
    expect(legadoPersist).toEqual({ ok: true, fields: { whatsapp: '5583988192848' } });
    expect(legadoPersist.ok && legadoPersist.fields).not.toHaveProperty('whatsappDdi');
  });

  it('P — novo lead BR salva DDI 55 quando aplicável', () => {
    expect(leadPhoneWriteFields(BR_NOVO)).toEqual(BR_NOVO);
    const novo = persistWhiteLabelWhatsAppFromPayload(WL_BR_NOVO);
    expect(novo).toEqual({
      ok: true,
      fields: { whatsapp: '83988192848', whatsappDdi: '55', whatsappPais: 'BR' },
    });
  });
});

describe('ETAPA 8 — matching Q–S', () => {
  it('Q — matching BR legado por canônico', () => {
    expect(leadsPhonesMatch(BR_LEGADO, { telefone: '83988192848' })).toBe(true);
    expect(leadsPhonesMatch(BR_LEGADO, BR_NOVO)).toBe(true);
    expect(leadCanonicalMatchKey(BR_LEGADO)).toBe('5583988192848');
  });

  it('R — matching US por canônico e sem colidir com BR nacional igual', () => {
    expect(leadsPhonesMatch(US, { telefone: '7137326616', telefoneDdi: '1' })).toBe(true);
    expect(leadsPhonesMatch(US, { telefone: '7137326616' })).toBe(false);
    expect(leadCanonicalMatchKey(US)).toBe('17137326616');
    expect(leadCanonicalMatchKey({ telefone: '7137326616' })).toBe('557137326616');
  });

  it('S — matching PT por canônico', () => {
    expect(leadsPhonesMatch(PT, WL_PT)).toBe(true);
    expect(leadsPhonesMatch(PT, { telefone: '912345678' })).toBe(false);
  });

  it('indicação BR não casa com lead US do mesmo nacional', () => {
    const indicacoes = [
      {
        id: 'i1',
        medicoId: 'm1',
        telefonePaciente: '7137326616',
      } as Indicacao,
    ];
    const map = buildIndicacaoByPhoneMap(indicacoes);
    expect(findIndicacaoForLead(leadMedico({ telefone: '7137326616' }), map)?.id).toBe('i1');
    expect(findIndicacaoForLead(leadMedico({ telefone: '7137326616', telefoneDdi: '1' }), map)).toBeNull();
  });
});

describe('ETAPA 8 — T conversão paciente → lead preserva DDI', () => {
  it('T — DDI do paciente não se perde ao copiar para LeadMedico', () => {
    expect(leadPhoneWriteFieldsFromIdent(US)).toEqual(US);
    expect(leadPhoneWriteFieldsFromIdent(BR_LEGADO)).toEqual({ telefone: '83988192848' });
    expect(leadPhoneWriteFieldsFromIdent(BR_LEGADO)).not.toHaveProperty('telefoneDdi');
    expect(readRepo('lib/crm/createLeadFromPacienteCadastro.ts')).toContain('telefoneDdi');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('telefoneDdi: salvo.dadosIdentificacao?.telefoneDdi');
  });
});

describe('ETAPA 8 — U/V WhatsApp automático white-label', () => {
  it('U — lead US resolve canônico e envia com phoneIsResolved', () => {
    expect(tryResolvePhoneFromLeadDoc(WL_US)).toBe('17137326616');
    const notify = readRepo('lib/whiteLabel/notifyWhiteLabelMeetingWhatsApp.ts');
    expect(notify).toContain('tryResolvePhoneFromLeadDoc');
    expect(notify).toContain('phoneIsResolved: true');
    expect(notify).not.toContain('55${');
  });

  it('V — lead PT no mesmo caminho canônico', () => {
    expect(tryResolvePhoneFromLeadDoc(WL_PT)).toBe('351912345678');
  });
});

describe('ETAPA 8 — W responsável white-label fora do contrato', () => {
  it('W — whatsappResponsavelPhone permanece sem DDI estruturado', () => {
    const notify = readRepo('lib/whiteLabel/notifyWhiteLabelMeetingWhatsApp.ts');
    expect(notify).toContain('whatsappResponsavelPhone');
    expect(notify).not.toContain('whatsappResponsavelDdi');
    expect(readRepo('components/metaadmingeral/WhiteLabelAgendaSettingsPanel.tsx')).toContain(
      'whatsappResponsavelPhone',
    );
  });
});

describe('ETAPA 8 — CRM 360 / paciente vinculado / persistência', () => {
  it('paciente vinculado US prevalece sobre lead legado BR', () => {
    const lead = leadMedico({ telefone: '83988192848' });
    const paciente = {
      dadosIdentificacao: US,
    } as Parameters<typeof getLeadPhoneFields>[1];
    expect(getLeadPhoneDigits(lead, paciente)).toBe('17137326616');
    expect(getLeadPhoneFields(lead, paciente).telefoneDdi).toBe('1');
  });

  it('getLeadPhoneDigits do lead US usa DDI (não cleanPhoneBr)', () => {
    expect(getLeadPhoneDigits(leadMedico(US))).toBe('17137326616');
    const helpers = readRepo('lib/crm/leadContactHelpers.ts');
    expect(helpers).toContain('phoneFieldsFromLead');
    expect(helpers).not.toContain('cleanPhoneBr');
  });

  it('cleanPhoneBr permanece no módulo CRM mas sem caller de lead internacional', () => {
    expect(readRepo('lib/paciente360/paciente360WhatsAppMessages.ts')).toContain('export function cleanPhoneBr');
    expect(readRepo('components/crm/medico/LeadsMedicoPipelineCard.tsx')).toContain('buildTelHref');
    expect(readRepo('components/crm/medico/LeadsMedicoPipelineCard.tsx')).not.toContain('cleanPhoneBr');
  });
});

describe('ETAPA 8 — X regressão Etapas 1–7 + wiring', () => {
  it('X — resolver central e profissional inalterados; CTA Oftware permanece', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe('5583988192848');
    expect(resolveInternationalPhone(US)).toBe('17137326616');
    expect(resolveInternationalPhone(PT)).toBe('351912345678');
    expect(tryResolvePhoneFromProfessionalDoc(US)).toBe('17137326616');
    expect(getInstagramFounderWhatsAppUrl('medico')).toContain(OFTWARE_WHATSAPP_CTA_NUMBER);
  });

  it('formulários vivos de lead reutilizam InternationalPhoneInput', () => {
    for (const file of LEAD_FORM_FILES) {
      const src = readRepo(file);
      expect(src).toContain("from '@/components/phone/InternationalPhoneInput'");
      expect(src).toContain('<InternationalPhoneInput');
      expect(src).toContain('isValidIdentificacaoPhone');
    }
  });

  it('APIs de lead persistem DDI estruturado', () => {
    expect(readRepo('app/api/whitelabel/leads/route.ts')).toContain('persistWhiteLabelWhatsAppFromPayload');
    expect(readRepo('lib/whiteLabel/leadService.ts')).toContain('persistWhiteLabelWhatsAppFromPayload');
    expect(readRepo('app/api/lead/route.ts')).toContain('whatsappDdi');
  });

  it('instagramBio.whatsapp e indicação não foram internacionalizados nesta etapa', () => {
    expect(readRepo('lib/instagram/instagramBioConfig.ts')).not.toContain('telefoneDdi');
    expect(readRepo('components/ChatIA.tsx')).not.toContain('InternationalPhoneInput');
  });
});

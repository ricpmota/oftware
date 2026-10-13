import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { IDENTIFICACAO_PHONE_ERROR, isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';
import { resolveInternationalPhone } from '@/lib/whatsapp/resolveInternationalPhone';
import { tryResolvePhoneFromProfessionalDoc } from '@/lib/whatsapp/resolveProfessionalPhone';
import { tryResolvePhoneFromLeadDoc } from '@/lib/whatsapp/resolveLeadPhone';
import { buildIndicacaoByPhoneMap, findIndicacaoForLead } from '@/lib/crm/resolveLeadReferral';
import type { Indicacao } from '@/types/indicacao';
import type { LeadMedico } from '@/types/leadMedico';
import {
  buildIndicacaoWhatsappUrl,
  buildSolicitacaoWhatsappUrl,
  findMatchingIndicacao,
  identPhoneWriteFieldsFromSolicitacao,
  indicadoPorPhoneWriteFields,
  indicacaoCanonicalMatchKey,
  indicacaoMatchesPacienteIdent,
  indicacaoPhoneWriteFields,
  mergeIdentPhonePreferExisting,
  phoneFieldsFromIndicacao,
  solicitacaoPhoneWriteFields,
  solicitacaoPhoneWriteFieldsFromIdent,
  tryResolveIndicacaoPhone,
  tryResolveSolicitacaoPhone,
} from '@/lib/whatsapp/resolveIndicacaoSolicitacaoPhone';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const BR_LEGADO = { telefonePaciente: '83988192848' };
const BR_NOVO = { telefonePaciente: '83988192848', telefonePacienteDdi: '55', telefonePacientePais: 'BR' };
const US = { telefonePaciente: '7137326616', telefonePacienteDdi: '1', telefonePacientePais: 'US' };
const PT = { telefonePaciente: '912345678', telefonePacienteDdi: '351', telefonePacientePais: 'PT' };

const SOL_BR_LEGADO = { pacienteTelefone: '83988192848' };
const SOL_BR_NOVO = { pacienteTelefone: '83988192848', pacienteTelefoneDdi: '55', pacienteTelefonePais: 'BR' };
const SOL_US = { pacienteTelefone: '7137326616', pacienteTelefoneDdi: '1', pacienteTelefonePais: 'US' };
const SOL_PT = { pacienteTelefone: '912345678', pacienteTelefoneDdi: '351', pacienteTelefonePais: 'PT' };

const IDENT_US = { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' };
const IDENT_PT = { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' };
const IDENT_BR_LEGADO = { telefone: '83988192848' };

const FORM_FILES = [
  'app/meta/page.tsx',
  'app/dr/[...slug]/page.tsx',
];

function indicacao(partial: Partial<Indicacao>): Indicacao {
  return {
    id: 'i1',
    indicadoPor: 'a@test.com',
    nomePaciente: 'Indicado',
    telefonePaciente: '',
    estado: 'PB',
    cidade: 'João Pessoa',
    medicoId: 'm1',
    medicoNome: 'Dr',
    status: 'pendente',
    criadoEm: new Date(),
    ...partial,
  };
}

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

describe('ETAPA 9 — Indicação A–D persistência e resolução', () => {
  it('A — indicação BR legado 83988192848 sem DDI → 5583988192848', () => {
    expect(tryResolveIndicacaoPhone(BR_LEGADO)).toBe('5583988192848');
    expect(indicacaoPhoneWriteFields(BR_LEGADO)).toEqual({ telefonePaciente: '83988192848' });
    expect(indicacaoPhoneWriteFields(BR_LEGADO)).not.toHaveProperty('telefonePacienteDdi');
  });

  it('B — indicação BR nova persiste DDI 55 sem concatenar', () => {
    expect(indicacaoPhoneWriteFields(BR_NOVO)).toEqual(BR_NOVO);
    expect(tryResolveIndicacaoPhone(BR_NOVO)).toBe('5583988192848');
    expect(indicacaoPhoneWriteFields(BR_NOVO).telefonePaciente).toBe('83988192848');
  });

  it('C — indicação US 7137326616 + 1 → 17137326616', () => {
    expect(tryResolveIndicacaoPhone(US)).toBe('17137326616');
    expect(tryResolveIndicacaoPhone(US)).not.toMatch(/^55/);
    expect(indicacaoPhoneWriteFields(US)).toEqual(US);
    expect(indicacaoPhoneWriteFields(US).telefonePaciente).not.toBe('17137326616');
  });

  it('D — indicação PT 912345678 + 351 → 351912345678', () => {
    expect(tryResolveIndicacaoPhone(PT)).toBe('351912345678');
    expect(indicacaoPhoneWriteFields(PT)).toEqual(PT);
  });
});

describe('ETAPA 9 — Validação E', () => {
  it('E — PT 9 dígitos + 351 é válido; mensagem neutra', () => {
    expect(isValidIdentificacaoPhone(IDENT_PT)).toBe(true);
    expect(IDENTIFICACAO_PHONE_ERROR).toBe('Informe um número de telefone válido.');
    expect(readRepo('app/meta/page.tsx')).toContain('IDENTIFICACAO_PHONE_ERROR');
    expect(readRepo('app/dr/[...slug]/page.tsx')).toContain('IDENTIFICACAO_PHONE_ERROR');
  });
});

describe('ETAPA 9 — wa.me indicação F–G', () => {
  it('F — wa.me indicação US', () => {
    expect(buildIndicacaoWhatsappUrl(US)).toBe('https://wa.me/17137326616');
    expect(buildWhatsappUrl(phoneFieldsFromIndicacao(US))).toBe('https://wa.me/17137326616');
  });

  it('G — wa.me indicação PT', () => {
    expect(buildIndicacaoWhatsappUrl(PT)).toBe('https://wa.me/351912345678');
    expect(buildIndicacaoWhatsappUrl(BR_LEGADO)).toBe('https://wa.me/5583988192848');
  });
});

describe('ETAPA 9 — Matching H–K e virouVenda L–M', () => {
  it('H — matching indicação US ↔ paciente US', () => {
    expect(indicacaoMatchesPacienteIdent(US, IDENT_US)).toBe(true);
    expect(findMatchingIndicacao([indicacao(US)], IDENT_US)?.telefonePacienteDdi).toBe('1');
  });

  it('I — matching indicação PT ↔ paciente PT', () => {
    expect(indicacaoMatchesPacienteIdent(PT, IDENT_PT)).toBe(true);
  });

  it('J — matching BR legado ↔ paciente legado', () => {
    expect(indicacaoMatchesPacienteIdent(BR_LEGADO, IDENT_BR_LEGADO)).toBe(true);
    expect(indicacaoMatchesPacienteIdent(BR_LEGADO, { telefone: '83988192848', telefoneDdi: '55' })).toBe(true);
  });

  it('K — BR nacional 7137326616 NÃO colide com US 7137326616 + DDI 1', () => {
    expect(indicacaoMatchesPacienteIdent({ telefonePaciente: '7137326616' }, IDENT_US)).toBe(false);
    expect(indicacaoCanonicalMatchKey({ telefonePaciente: '7137326616' })).toBe('557137326616');
    expect(indicacaoCanonicalMatchKey(US)).toBe('17137326616');
    const map = buildIndicacaoByPhoneMap([indicacao(US)]);
    expect(findIndicacaoForLead(leadMedico(IDENT_US), map)?.id).toBe('i1');
    expect(findIndicacaoForLead(leadMedico({ telefone: '7137326616' }), map)).toBeNull();
  });

  it('L — virouVenda US: cadastro do paciente usa ident estruturado', () => {
    expect(indicacaoMatchesPacienteIdent(US, IDENT_US)).toBe(true);
    const pacienteSvc = readRepo('services/pacienteService.ts');
    expect(pacienteSvc).toContain('getIndicacaoPorTelefone(ident)');
    expect(pacienteSvc).toContain('marcarComoVenda');
  });

  it('M — virouVenda PT no mesmo matching canônico', () => {
    expect(indicacaoMatchesPacienteIdent(PT, IDENT_PT)).toBe(true);
    const svc = readRepo('services/indicacaoService.ts');
    expect(svc).toContain('findMatchingIndicacao');
    expect(svc).toContain("where('status', 'in', ['pendente', 'visualizada'])");
    expect(svc).not.toContain('where("dadosIdentificacao.telefone"');
  });

  it('N — abrir indicação antiga não grava DDI automaticamente', () => {
    expect(indicacaoPhoneWriteFields(BR_LEGADO)).not.toHaveProperty('telefonePacienteDdi');
    expect(readRepo('services/indicacaoService.ts')).toContain('optionalIndicacaoDdiPais');
    expect(readRepo('lib/whatsapp/resolveIndicacaoSolicitacaoPhone.ts')).toContain(
      'if (telefonePacienteDdi)',
    );
  });
});

describe('ETAPA 9 — Solicitação O–R persistência', () => {
  it('O — solicitação BR legado sem DDI', () => {
    expect(tryResolveSolicitacaoPhone(SOL_BR_LEGADO)).toBe('5583988192848');
    expect(solicitacaoPhoneWriteFields(SOL_BR_LEGADO)).toEqual({ pacienteTelefone: '83988192848' });
    expect(solicitacaoPhoneWriteFields(SOL_BR_LEGADO)).not.toHaveProperty('pacienteTelefoneDdi');
  });

  it('P — solicitação BR nova persiste DDI 55', () => {
    expect(solicitacaoPhoneWriteFields(SOL_BR_NOVO)).toEqual(SOL_BR_NOVO);
    expect(tryResolveSolicitacaoPhone(SOL_BR_NOVO)).toBe('5583988192848');
  });

  it('Q — solicitação US 7137326616 + 1', () => {
    expect(tryResolveSolicitacaoPhone(SOL_US)).toBe('17137326616');
    expect(solicitacaoPhoneWriteFields(SOL_US).pacienteTelefone).toBe('7137326616');
    expect(solicitacaoPhoneWriteFields(SOL_US).pacienteTelefone).not.toBe('17137326616');
  });

  it('R — solicitação PT 912345678 + 351', () => {
    expect(tryResolveSolicitacaoPhone(SOL_PT)).toBe('351912345678');
    expect(solicitacaoPhoneWriteFields(SOL_PT)).toEqual(SOL_PT);
  });
});

describe('ETAPA 9 — solicitação → paciente S–T', () => {
  it('S — solicitação US → paciente preserva DDI nacional', () => {
    expect(identPhoneWriteFieldsFromSolicitacao(SOL_US)).toEqual(IDENT_US);
    expect(identPhoneWriteFieldsFromSolicitacao(SOL_US).telefone).toBe('7137326616');
  });

  it('T — solicitação PT → paciente preserva DDI', () => {
    expect(identPhoneWriteFieldsFromSolicitacao(SOL_PT)).toEqual(IDENT_PT);
    expect(readRepo('app/dr/[...slug]/page.tsx')).toContain('identPhoneWriteFieldsFromSolicitacao');
    expect(readRepo('app/meta/page.tsx')).toContain('identPhoneWriteFieldsFromSolicitacao');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('mergeIdentPhonePreferExisting');
  });
});

describe('ETAPA 9 — solicitação → LeadMedico U–V', () => {
  it('U — solicitação US → LeadMedico preserva DDI', () => {
    expect(identPhoneWriteFieldsFromSolicitacao(SOL_US)).toEqual({
      telefone: '7137326616',
      telefoneDdi: '1',
      telefonePais: 'US',
    });
    expect(readRepo('lib/metaadmin/loadLeadsMedicoData.ts')).toContain('identPhoneWriteFieldsFromSolicitacao');
  });

  it('V — solicitação PT → LeadMedico preserva DDI', () => {
    expect(identPhoneWriteFieldsFromSolicitacao(SOL_PT)).toEqual(IDENT_PT);
    expect(solicitacaoPhoneWriteFieldsFromIdent(IDENT_PT)).toEqual(SOL_PT);
  });
});

describe('ETAPA 9 — boas-vindas W–X', () => {
  it('W — fallback solicitação US → 17137326616 sem 55', () => {
    expect(tryResolveSolicitacaoPhone(SOL_US)).toBe('17137326616');
    const src = readRepo('services/boasVindasTratamentoWhatsappService.ts');
    expect(src).toContain('tryResolveSolicitacaoPhone');
    expect(src).not.toContain('normalizeWhatsappPhone');
    expect(src).toContain('tryResolvePhoneFromPacienteDoc');
  });

  it('X — fallback solicitação PT → 351912345678', () => {
    expect(tryResolveSolicitacaoPhone(SOL_PT)).toBe('351912345678');
    expect(tryResolveSolicitacaoPhone(SOL_BR_LEGADO)).toBe('5583988192848');
  });
});

describe('ETAPA 9 — wa.me solicitação Y–Z', () => {
  it('Y — wa.me solicitação US', () => {
    expect(buildSolicitacaoWhatsappUrl(SOL_US)).toBe('https://wa.me/17137326616');
  });

  it('Z — wa.me solicitação PT', () => {
    expect(buildSolicitacaoWhatsappUrl(SOL_PT)).toBe('https://wa.me/351912345678');
    expect(buildSolicitacaoWhatsappUrl(SOL_BR_LEGADO)).toBe('https://wa.me/5583988192848');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('buildSolicitacaoWhatsappUrl(solicitacao)');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('buildIndicacaoWhatsappUrl(indicacao)');
    expect(readRepo('app/metaadmin/page.tsx')).not.toContain('55${indicacao.telefonePaciente');
    expect(readRepo('app/metaadmin/page.tsx')).not.toContain('55${solicitacao.pacienteTelefone');
  });
});

describe('ETAPA 9 — AA aviso ao médico e indicadoPor', () => {
  it('AA — aviso ao médico não regride Etapa 7', () => {
    const aviso = readRepo('services/solicitacaoMedicoAvisoWhatsappService.ts');
    expect(aviso).toContain('tryResolvePhoneFromProfessionalDoc');
    expect(aviso).not.toContain('pacienteTelefoneDdi');
    expect(tryResolvePhoneFromProfessionalDoc(IDENT_US)).toBe('17137326616');
  });

  it('indicadoPorTelefone é snapshot do ident do indicador', () => {
    expect(indicadoPorPhoneWriteFields(IDENT_US)).toEqual({
      indicadoPorTelefone: '7137326616',
      indicadoPorTelefoneDdi: '1',
      indicadoPorTelefonePais: 'US',
    });
    expect(indicadoPorPhoneWriteFields(IDENT_BR_LEGADO)).toEqual({
      indicadoPorTelefone: '83988192848',
    });
    expect(indicadoPorPhoneWriteFields(IDENT_BR_LEGADO)).not.toHaveProperty('indicadoPorTelefoneDdi');
    expect(readRepo('services/solicitacaoMedicoService.ts')).toContain('indicadoPorPhoneWriteFields');
  });

  it('ident existente prevalece sobre solicitação no aceite', () => {
    expect(mergeIdentPhonePreferExisting(IDENT_US, SOL_PT)).toEqual(IDENT_US);
    expect(mergeIdentPhonePreferExisting({}, SOL_US)).toEqual(IDENT_US);
  });
});

describe('ETAPA 9 — AB regressão Etapas 1–8 + wiring', () => {
  it('AB — resolver central, lead e profissional inalterados', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe('5583988192848');
    expect(resolveInternationalPhone(IDENT_US)).toBe('17137326616');
    expect(resolveInternationalPhone(IDENT_PT)).toBe('351912345678');
    expect(tryResolvePhoneFromLeadDoc(IDENT_US)).toBe('17137326616');
    expect(tryResolvePhoneFromProfessionalDoc(IDENT_PT)).toBe('351912345678');
    expect(getInstagramFounderWhatsAppUrl('medico')).toContain(OFTWARE_WHATSAPP_CTA_NUMBER);
  });

  it('UIs vivas reutilizam InternationalPhoneInput', () => {
    for (const file of FORM_FILES) {
      const src = readRepo(file);
      expect(src, file).toContain("from '@/components/phone/InternationalPhoneInput'");
      expect(src, file).toContain('<InternationalPhoneInput');
      expect(src, file).toContain('isValidIdentificacaoPhone');
    }
  });

  it('não cria resolver próprio nem persiste chave canônica', () => {
    const helper = readRepo('lib/whatsapp/resolveIndicacaoSolicitacaoPhone.ts');
    expect(helper).toContain('resolveInternationalPhone');
    expect(helper).toContain('Não persistir');
    expect(readRepo('services/indicacaoService.ts')).not.toContain('telefoneCanonical');
    expect(readRepo('services/solicitacaoMedicoService.ts')).not.toContain('telefoneCanonical');
  });

  it('inbound Canal Chat, EasySign e VM permanecem fora do escopo', () => {
    expect(readRepo('lib/whatsapp/canalChatInboundMessage.ts')).not.toContain('pacienteTelefoneDdi');
    expect(readRepo('lib/signature/bryEasySign/contratoTratamentoEasySignPoc.server.ts')).not.toContain(
      'telefonePacienteDdi',
    );
    expect(readRepo('infra/whatsapp/wppconnect/config.ts')).not.toContain('pacienteTelefoneDdi');
    expect(readRepo('infra/whatsapp/wppconnect/config.ts')).not.toContain('telefonePacienteDdi');
  });
});

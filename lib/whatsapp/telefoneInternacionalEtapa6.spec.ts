import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { phoneLookupVariants } from '@/lib/whatsapp/canalChatInboundMessage';
import { buildPatientWhatsappUrl, buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { toPersistedInternationalPhone } from '@/lib/phone/internationalPhoneValue';
import {
  resolveInternationalPhone,
  resolvePhoneForWhatsappSend,
  tryResolvePhoneFromPacienteDoc,
} from '@/lib/whatsapp/resolveInternationalPhone';
import { resolveWhatsappTestDestination } from '@/lib/whatsapp/resolveWhatsappTestDestination';
import { phonesLikelyMatch } from '@/services/whatsappProviderClient';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const BR_LEGADO = { telefone: '83988192848' };
const BR_NOVO = { telefone: '83988192848', telefoneDdi: '55', telefonePais: 'BR' };
const US = { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' };
const PT = { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' };

const PATIENT_DOC = {
  legado: { dadosIdentificacao: BR_LEGADO },
  brNovo: { dadosIdentificacao: BR_NOVO },
  us: { dadosIdentificacao: US },
  pt: { dadosIdentificacao: PT },
};

const PATIENT_SEND_FILES = [
  'services/whatsappRemindersService.ts',
  'services/whatsappAutoAplicacaoService.ts',
  'services/whatsappPacienteCadastroLinkService.ts',
  'services/whatsappNutriCheckInQueue.ts',
  'services/cobrancaAutomaticaWhatsappService.ts',
  'services/financeiroCobrancaWhatsappService.ts',
  'services/calendarioLembreteWhatsappService.ts',
  'services/compartilhamentoAceiteWhatsappService.ts',
  'services/boasVindasTratamentoWhatsappService.ts',
  'services/whatsappPatientSendRouter.ts',
  'lib/nutri/agenda/consultaReminderService.ts',
  'lib/metaadmin/agenda/consultaReminderService.ts',
  'lib/nutri/cardapio/cardapioPacienteNotifyService.ts',
  'lib/metaadmin/examesLaboratoriaisPacienteNotifyService.ts',
  'lib/metaadmin/pacienteCanalChatNotifyCore.ts',
  'lib/nutri/agenda/nutriWelcomeWhatsappService.ts',
  'lib/phone/buildWhatsappUrl.ts',
  'app/metaadmin/page.tsx',
];

const INTERNATIONAL_SEND_TEST_FILES = [
  'services/whatsappSendTestService.ts',
  'services/whatsappPatientSendRouter.ts',
  'services/cobrancaAutomaticaWhatsappService.ts',
  'services/financeiroCobrancaWhatsappService.ts',
  'services/canalChatPendingPaymentService.ts',
  'app/api/metaadmingeral/whitelabel/agenda/whatsapp-test/route.ts',
];

describe('ETAPA 6 — A/B/C teste auxiliar MetaAdmin BR/US/PT', () => {
  it('A — MetaAdmin BR 83988192848 + 55 → 5583988192848', () => {
    expect(resolveWhatsappTestDestination(BR_NOVO)).toBe('5583988192848');
  });

  it('B — MetaAdmin US 7137326616 + 1 → 17137326616', () => {
    expect(resolveWhatsappTestDestination(US)).toBe('17137326616');
    expect(resolveWhatsappTestDestination(US)).not.toMatch(/^55/);
  });

  it('C — MetaAdmin PT 912345678 + 351 → 351912345678', () => {
    expect(resolveWhatsappTestDestination(PT)).toBe('351912345678');
  });

  it('rota /api/metaadmin/whatsapp/send-test aceita telefone+DDI e ignora phoneIsResolved do client', () => {
    const route = readRepo('app/api/metaadmin/whatsapp/send-test/route.ts');
    expect(route).toContain('telefoneDdi');
    expect(route).toContain('telefonePais');
    expect(route).toContain('sendWhatsappTestMessageForDoctor');
    expect(route).not.toMatch(/body\?\.phoneIsResolved/);
    expect(route).not.toContain('phoneIsResolved:');
  });

  it('serviço de teste resolve no server e marca phoneIsResolved: true', () => {
    const service = readRepo('services/whatsappSendTestService.ts');
    expect(service).toContain('resolveWhatsappTestDestination');
    expect(service).toContain('phoneIsResolved: true');
  });

  it('legado { phone } sem DDI continua BR', () => {
    expect(resolveWhatsappTestDestination({ phone: '83988192848' })).toBe('5583988192848');
  });
});

describe('ETAPA 6 — D white-label agenda whatsapp-test', () => {
  it('UI do lead reutiliza InternationalPhoneInput e envia telefone+DDI', () => {
    const ui = readRepo('components/metaadmingeral/WhiteLabelAgendaSettingsPanel.tsx');
    expect(ui).toContain("from '@/components/phone/InternationalPhoneInput'");
    expect(ui).toContain('<InternationalPhoneInput');
    expect(ui).toContain('telefoneDdi');
    expect(ui).toContain('telefonePais');
    expect(ui).toContain('isValidIdentificacaoPhone');
    expect(ui).not.toMatch(/phoneIsResolved/);
    expect(ui).not.toContain('telefoneE164');
  });

  it('responsável permanece BR-only (settings.whatsappResponsavelPhone, sem seletor)', () => {
    const ui = readRepo('components/metaadmingeral/WhiteLabelAgendaSettingsPanel.tsx');
    expect(ui).toContain('whatsappResponsavelPhone');
    expect(ui).toContain('phone: settings.whatsappResponsavelPhone');
  });

  it('servidor resolve lead e envia canônico; responsável não usa phoneIsResolved', () => {
    const route = readRepo('app/api/metaadmingeral/whitelabel/agenda/whatsapp-test/route.ts');
    expect(route).toContain('resolveWhatsappTestDestination');
    expect(route).toContain('phoneIsResolved: true');
    expect(route).toContain("target === 'lead'");
    expect(route).toContain('whatsappResponsavelPhone');
    expect(route).not.toMatch(/body\?\.phoneIsResolved/);
  });
});

describe('ETAPA 6 — E/F/G/H resolvers de paciente', () => {
  it('E — BR legado 83988192848 → 5583988192848', () => {
    expect(tryResolvePhoneFromPacienteDoc(PATIENT_DOC.legado)).toBe('5583988192848');
    expect(resolveInternationalPhone(BR_LEGADO)).toBe('5583988192848');
  });

  it('F — BR novo ddi 55 → 5583988192848', () => {
    expect(tryResolvePhoneFromPacienteDoc(PATIENT_DOC.brNovo)).toBe('5583988192848');
  });

  it('G — US ddi 1 → 17137326616 (sem 55)', () => {
    expect(tryResolvePhoneFromPacienteDoc(PATIENT_DOC.us)).toBe('17137326616');
    expect(tryResolvePhoneFromPacienteDoc(PATIENT_DOC.us)).not.toBe('5517137326616');
  });

  it('H — PT ddi 351 → 351912345678', () => {
    expect(tryResolvePhoneFromPacienteDoc(PATIENT_DOC.pt)).toBe('351912345678');
  });
});

describe('ETAPA 6 — I/J wa.me US/PT', () => {
  it('I — wa.me US', () => {
    expect(buildWhatsappUrl(US)).toBe('https://wa.me/17137326616');
    expect(buildPatientWhatsappUrl(PATIENT_DOC.us)).toBe('https://wa.me/17137326616');
  });

  it('J — wa.me PT', () => {
    expect(buildWhatsappUrl(PT)).toBe('https://wa.me/351912345678');
    expect(buildPatientWhatsappUrl(PATIENT_DOC.pt)).toBe('https://wa.me/351912345678');
  });

  it('BR legado e novo continuam wa.me/5583988192848', () => {
    expect(buildPatientWhatsappUrl(PATIENT_DOC.legado)).toBe('https://wa.me/5583988192848');
    expect(buildPatientWhatsappUrl(PATIENT_DOC.brNovo)).toBe('https://wa.me/5583988192848');
  });
});

describe('ETAPA 6 — K fila US não recebe 55', () => {
  it('item.phone 17137326616 com phoneIsResolved permanece sem 55', () => {
    expect(resolvePhoneForWhatsappSend('17137326616', true)).toBe('17137326616');
    expect(resolvePhoneForWhatsappSend('351912345678', true)).toBe('351912345678');
    expect(resolvePhoneForWhatsappSend('5583988192848', true)).toBe('5583988192848');
  });
});

describe('ETAPA 6 — L/M inbound US/PT (caracterização, sem refactor)', () => {
  it('L — inbound US 17137326616: variants incluem E164 e um 55 falso; não incluem o nacional', () => {
    const variants = phoneLookupVariants('17137326616');
    expect(variants).toContain('17137326616');
    expect(variants).toContain('5517137326616');
    expect(variants).not.toContain('7137326616');
  });

  it('M — inbound PT 351912345678: variants são o E164; não incluem o nacional', () => {
    const variants = phoneLookupVariants('351912345678');
    expect(variants).toContain('351912345678');
    expect(variants).not.toContain('912345678');
  });

  it('após o doc ser encontrado, phonesLikelyMatch associa inbound US/PT ao telefone canônico', () => {
    const us = tryResolvePhoneFromPacienteDoc(PATIENT_DOC.us);
    const pt = tryResolvePhoneFromPacienteDoc(PATIENT_DOC.pt);
    expect(us).toBe('17137326616');
    expect(pt).toBe('351912345678');
    expect(phonesLikelyMatch(us!, '17137326616')).toBe(true);
    expect(phonesLikelyMatch(pt!, '351912345678')).toBe(true);
  });

  it('BR inbound 5583988192848 ainda gera o nacional para lookup legado', () => {
    const variants = phoneLookupVariants('5583988192848');
    expect(variants).toContain('5583988192848');
    expect(variants).toContain('83988192848');
  });
});

describe('ETAPA 6 — N nenhum caller vivo de PACIENTE concatena 55', () => {
  it('fluxos de envio/wa.me de paciente não fazem `55${` nem wa.me/55', () => {
    for (const file of PATIENT_SEND_FILES) {
      const src = readRepo(file);
      expect(src, file).not.toContain('55${');
      expect(src, file).not.toContain('wa.me/55');
    }
  });

  it('extractores de paciente usam tryResolvePhoneFromPacienteDoc', () => {
    const extractors = [
      'services/whatsappRemindersService.ts',
      'services/whatsappAutoAplicacaoService.ts',
      'services/whatsappPacienteCadastroLinkService.ts',
      'services/whatsappNutriCheckInQueue.ts',
      'services/cobrancaAutomaticaWhatsappService.ts',
      'services/financeiroCobrancaWhatsappService.ts',
      'services/calendarioLembreteWhatsappService.ts',
      'services/compartilhamentoAceiteWhatsappService.ts',
      'services/boasVindasTratamentoWhatsappService.ts',
      'lib/nutri/agenda/consultaReminderService.ts',
      'lib/metaadmin/agenda/consultaReminderService.ts',
      'lib/nutri/cardapio/cardapioPacienteNotifyService.ts',
      'lib/metaadmin/examesLaboratoriaisPacienteNotifyService.ts',
      'lib/metaadmin/pacienteCanalChatNotifyCore.ts',
      'lib/nutri/agenda/nutriWelcomeWhatsappService.ts',
    ];
    for (const file of extractors) {
      expect(readRepo(file), file).toContain('tryResolvePhoneFromPacienteDoc');
    }
  });
});

describe('ETAPA 6 — O callers internacionais de sendTestMessage usam phoneIsResolved', () => {
  it('callers internacionais passam phoneIsResolved: true', () => {
    for (const file of INTERNATIONAL_SEND_TEST_FILES) {
      expect(readRepo(file), file).toContain('phoneIsResolved: true');
    }
  });

  it('notify white-label de reunião: lead internacional usa phoneIsResolved; responsável permanece legado', () => {
    const notify = readRepo('lib/whiteLabel/notifyWhiteLabelMeetingWhatsApp.ts');
    expect(notify).toContain('sendTestMessage(');
    expect(notify).toContain('phoneIsResolved: true');
    expect(notify).toContain('tryResolvePhoneFromLeadDoc');
    expect(notify).toContain('whatsappResponsavelPhone');
    expect(notify).not.toContain('whatsappResponsavelDdi');
  });
});

describe('ETAPA 6 — regressão Etapas 1–5', () => {
  it('resolver central BR/US/PT inalterado', () => {
    expect(resolveInternationalPhone({ telefone: '83988192848' })).toBe('5583988192848');
    expect(resolveInternationalPhone({ telefone: '7137326616', telefoneDdi: '1' })).toBe(
      '17137326616',
    );
    expect(resolveInternationalPhone({ telefone: '912345678', telefoneDdi: '351' })).toBe(
      '351912345678',
    );
  });

  it('persistência de teste não grava E164 no payload da UI white-label', () => {
    const saved = toPersistedInternationalPhone('US', '7137326616', '1');
    expect(saved).toEqual({ telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' });
    expect(resolveWhatsappTestDestination(saved)).toBe('17137326616');
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { buildTelHref } from '@/lib/phone/buildTelHref';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';
import { getMedicoWhatsAppUrl } from '@/lib/instagram/medicoWhatsAppUrl';
import { getInstagramFounderWhatsAppUrl } from '@/lib/landing/instagramFounderWhatsApp';
import { OFTWARE_WHATSAPP_CTA_NUMBER } from '@/lib/landing/oftwareWhatsAppCta';
import {
  professionalPhoneWriteFields,
  telefoneAvisoWriteFieldsFromProfessional,
  tryResolvePhoneFromProfessionalDoc,
  tryResolveTelefoneAviso,
} from '@/lib/whatsapp/resolveProfessionalPhone';
import { getFirstIncompleteMedicoStep } from '@/lib/meta/metaMedicoVerificacao';
import { getFirstIncompleteNutriPersonalStep } from '@/lib/meta/metaNutriPersonalVerificacao';

const ROOT = resolve(__dirname, '../..');

function readRepo(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

const BR_LEGADO = { telefone: '83988192848' };
const BR_NOVO = { telefone: '83988192848', telefoneDdi: '55', telefonePais: 'BR' };
const US = { telefone: '7137326616', telefoneDdi: '1', telefonePais: 'US' };
const PT = { telefone: '912345678', telefoneDdi: '351', telefonePais: 'PT' };

const PROFESSIONAL_FORM_FILES = [
  'components/metaadmin/MetaMedicoWizard.tsx',
  'components/meta/MetaNutriPersonalWizard.tsx',
  'app/metaadmin/page.tsx',
  'app/metanutri/page.v2.tsx',
  'app/metapersonal/page.v2.tsx',
  'app/metapsi/page.v2.tsx',
  'app/metaadmingeral/page.tsx',
  'components/metaadmin/ModalNovoLembrete.tsx',
];

const AVISO_FILES = [
  'services/solicitacaoMedicoAvisoWhatsappService.ts',
  'lib/nutri/prontuario/prontuarioConsultaMedicoNotifyService.ts',
  'services/calendarioLembreteWhatsappService.ts',
  'lib/metaadmin/agenda/consultaReminderService.ts',
  'lib/nutri/agenda/consultaReminderService.ts',
];

describe('ETAPA 7 — profissional: resolução A–L', () => {
  it('A — médico legado 83988192848 sem DDI → 5583988192848', () => {
    expect(tryResolvePhoneFromProfessionalDoc(BR_LEGADO)).toBe('5583988192848');
  });

  it('B — médico US 7137326616 + 1 → 17137326616', () => {
    expect(tryResolvePhoneFromProfessionalDoc(US)).toBe('17137326616');
    expect(tryResolvePhoneFromProfessionalDoc(US)).not.toMatch(/^55/);
  });

  it('C — médico PT 912345678 + 351 → 351912345678', () => {
    expect(tryResolvePhoneFromProfessionalDoc(PT)).toBe('351912345678');
  });

  it('D — nutri legado sem DDI → Brasil', () => {
    expect(tryResolvePhoneFromProfessionalDoc({ telefone: '11999998888' })).toBe('5511999998888');
  });

  it('E — nutri US', () => {
    expect(tryResolvePhoneFromProfessionalDoc(US)).toBe('17137326616');
  });

  it('F — nutri PT', () => {
    expect(tryResolvePhoneFromProfessionalDoc(PT)).toBe('351912345678');
  });

  it('G — personal legado nacional → Brasil', () => {
    expect(tryResolvePhoneFromProfessionalDoc({ telefone: '83988192848' })).toBe('5583988192848');
  });

  it('H — personal US', () => {
    expect(tryResolvePhoneFromProfessionalDoc(US)).toBe('17137326616');
  });

  it('I — personal PT', () => {
    expect(tryResolvePhoneFromProfessionalDoc(PT)).toBe('351912345678');
  });

  it('J — psi legado nacional → Brasil', () => {
    expect(tryResolvePhoneFromProfessionalDoc({ telefone: '21987654321' })).toBe('5521987654321');
  });

  it('K — psi US', () => {
    expect(tryResolvePhoneFromProfessionalDoc(US)).toBe('17137326616');
  });

  it('L — psi PT', () => {
    expect(tryResolvePhoneFromProfessionalDoc(PT)).toBe('351912345678');
  });
});

describe('ETAPA 7 — wa.me / tel: / avisos / telefoneAviso', () => {
  it('M — wa.me profissional US', () => {
    expect(buildWhatsappUrl(US)).toBe('https://wa.me/17137326616');
    expect(getMedicoWhatsAppUrl(US)).toBe('https://wa.me/17137326616');
  });

  it('N — wa.me profissional PT', () => {
    expect(buildWhatsappUrl(PT)).toBe('https://wa.me/351912345678');
    expect(getMedicoWhatsAppUrl(PT)).toBe('https://wa.me/351912345678');
  });

  it('O — aviso automático médico US usa DDI estruturado', () => {
    const aviso = telefoneAvisoWriteFieldsFromProfessional(US);
    expect(aviso).toEqual({
      telefoneAviso: '7137326616',
      telefoneAvisoDdi: '1',
      telefoneAvisoPais: 'US',
    });
    expect(tryResolveTelefoneAviso(aviso)).toBe('17137326616');
    expect(tryResolveTelefoneAviso(aviso)).not.toMatch(/^55/);
  });

  it('P — aviso automático médico PT', () => {
    const aviso = telefoneAvisoWriteFieldsFromProfessional(PT);
    expect(aviso?.telefoneAvisoDdi).toBe('351');
    expect(tryResolveTelefoneAviso(aviso)).toBe('351912345678');
  });

  it('Q — telefoneAviso internacional com DDI no lembrete', () => {
    expect(
      tryResolveTelefoneAviso({
        telefoneAviso: '7137326616',
        telefoneAvisoDdi: '1',
        telefoneAvisoPais: 'US',
      }),
    ).toBe('17137326616');
    expect(
      tryResolveTelefoneAviso({ telefoneAviso: '83988192848' }),
    ).toBe('5583988192848');
  });

  it('R — tel: US', () => {
    expect(buildTelHref(US)).toBe('tel:+17137326616');
    expect(buildTelHref(US)).not.toContain('wa.me');
  });

  it('S — tel: PT', () => {
    expect(buildTelHref(PT)).toBe('tel:+351912345678');
  });

  it('T — formulário não rejeita PT de 9 dígitos', () => {
    expect(isValidIdentificacaoPhone(PT)).toBe(true);
    expect(
      getFirstIncompleteMedicoStep(
        {
          nome: 'Médico PT',
          telefone: PT.telefone,
          telefoneDdi: PT.telefoneDdi,
          telefonePais: PT.telefonePais,
        } as never,
      ),
    ).not.toBe(2);
    expect(
      getFirstIncompleteNutriPersonalStep(
        {
          nome: 'Nutri PT',
          telefone: PT.telefone,
          telefoneDdi: PT.telefoneDdi,
          telefonePais: PT.telefonePais,
        } as never,
        'nutri',
      ),
    ).not.toBe(2);
    expect(readRepo('components/metaadmin/MetaMedicoWizard.tsx')).toContain('isValidIdentificacaoPhone');
    expect(readRepo('components/meta/MetaNutriPersonalWizard.tsx')).toContain('isValidIdentificacaoPhone');
    expect(readRepo('components/metaadmin/MetaMedicoWizard.tsx')).not.toContain('length >= 10');
  });

  it('U — abrir profissional antigo sem editar não grava DDI', () => {
    expect(professionalPhoneWriteFields(BR_LEGADO)).toEqual({ telefone: '83988192848' });
    expect(professionalPhoneWriteFields(BR_LEGADO)).not.toHaveProperty('telefoneDdi');
    expect(professionalPhoneWriteFields(US)).toEqual(US);
  });
});

describe('ETAPA 7 — V regressão Etapas 1–6 + wiring', () => {
  it('V — paciente legado continua BR e CTA Oftware não muda', () => {
    expect(buildWhatsappUrl({ telefone: '83988192848' })).toBe('https://wa.me/5583988192848');
    expect(getInstagramFounderWhatsAppUrl('medico')).toContain(OFTWARE_WHATSAPP_CTA_NUMBER);
    expect(getInstagramFounderWhatsAppUrl('medico')).toContain('wa.me/5583988192848');
  });

  it('formulários reais reutilizam InternationalPhoneInput', () => {
    for (const file of PROFESSIONAL_FORM_FILES) {
      const src = readRepo(file);
      expect(src).toContain("from '@/components/phone/InternationalPhoneInput'");
      expect(src).toContain('<InternationalPhoneInput');
    }
  });

  it('avisos de profissional resolvem DDI estruturado', () => {
    for (const file of AVISO_FILES) {
      const src = readRepo(file);
      expect(
        src.includes('tryResolvePhoneFromProfessionalDoc') ||
          src.includes('tryResolveTelefoneAviso') ||
          src.includes('telefoneAvisoWriteFieldsFromProfessional'),
      ).toBe(true);
    }
  });

  it('calendário não usa mais normalizeWhatsappPhone no telefoneAviso', () => {
    const src = readRepo('services/calendarioLembreteWhatsappService.ts');
    expect(src).toContain('tryResolveTelefoneAviso');
    expect(src).not.toContain('normalizeWhatsappPhone');
  });

  it('wa.me de profissional passa campos estruturados', () => {
    expect(readRepo('app/metaadmin/page.tsx')).toContain('phoneFieldsFromProfessional(personal)');
    expect(readRepo('app/metaadmin/page.tsx')).toContain('phoneFieldsFromProfessional(nutri)');
    expect(readRepo('app/meta/page.tsx')).toContain('phoneFieldsFromProfessional(medico)');
    expect(readRepo('lib/instagram/buildInstagramWhiteLabelHub.ts')).toContain(
      'phoneFieldsFromProfessional(medico)',
    );
  });

  it('não persiste telefoneE164 por padrão no write de profissional', () => {
    const written = professionalPhoneWriteFields(US);
    expect(written).not.toHaveProperty('telefoneE164');
  });
});

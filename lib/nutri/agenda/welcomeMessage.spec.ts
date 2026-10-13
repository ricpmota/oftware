import { describe, expect, it } from 'vitest';
import { DEFAULT_NUTRI_WELCOME_MESSAGE } from '@/lib/nutri/agenda/agendaDefaults';
import {
  ensureWelcomeMessageHasLink,
  renderNutriWelcomeMessage,
  buildWhatsappManualUrl,
  formatNomeMedicoWelcome,
  applyWelcomeCta,
  CTA_ANAMNESE_FEITA,
  CTA_ANAMNESE_PENDENTE,
} from '@/lib/nutri/agenda/welcomeMessage';
import { NUTRI_CONSULTA_LINK_PLACEHOLDER } from '@/types/nutriAgenda';

describe('nutri welcome message', () => {
  it('recoloca o placeholder do link se a nutricionista apagar', () => {
    const out = ensureWelcomeMessageHasLink('Olá, {{nome_paciente}}!');
    expect(out).toContain(NUTRI_CONSULTA_LINK_PLACEHOLDER);
  });

  it('preserva o placeholder quando já existe', () => {
    const out = ensureWelcomeMessageHasLink(DEFAULT_NUTRI_WELCOME_MESSAGE);
    expect(out.split(NUTRI_CONSULTA_LINK_PLACEHOLDER).length - 1).toBe(1);
  });

  it('substitui placeholders e nunca remove o link', () => {
    const text = renderNutriWelcomeMessage({
      template: 'Oi {{nome_paciente}}, sou {{nome_nutri}}. Médico: {{nome_medico}}.',
      pacienteNome: 'Ana Silva',
      nutriNome: 'Dra. Nutri',
      medicoNome: 'Dr. João',
      agendamentoUrl: 'https://exemplo.com/consulta-nutri/ABC',
    });
    expect(text).toContain('Ana');
    expect(text).toContain('Dra. Nutri');
    expect(text).toContain('Dr. João');
    expect(text).toContain('https://exemplo.com/consulta-nutri/ABC');
    expect(text).not.toContain(NUTRI_CONSULTA_LINK_PLACEHOLDER);
  });
});

describe('buildWhatsappManualUrl', () => {
  it('monta wa.me com DDI e texto encodado', () => {
    const url = buildWhatsappManualUrl('55 11 99999-0000', 'Olá Ana');
    expect(url).toBe(`https://wa.me/5511999990000?text=${encodeURIComponent('Olá Ana')}`);
  });
});

describe('formatNomeMedicoWelcome', () => {
  it('inclui Dr. ou Dra. conforme o gênero e não duplica o título', () => {
    expect(formatNomeMedicoWelcome('Ricardo Mota', 'M')).toBe('Dr. Ricardo Mota');
    expect(formatNomeMedicoWelcome('Ana Lima', 'F')).toBe('Dra. Ana Lima');
    expect(formatNomeMedicoWelcome('Dr. Ricardo Mota', 'M')).toBe('Dr. Ricardo Mota');
    expect(formatNomeMedicoWelcome('seu médico')).toBe('seu médico');
  });
});

describe('applyWelcomeCta', () => {
  it('pede anamnese só quando ainda não foi preenchida', () => {
    const legado =
      'Para começar, preencha sua anamnese (se ainda não fez) e escolha o horário da primeira consulta:';
    expect(applyWelcomeCta(legado, false)).toBe(CTA_ANAMNESE_PENDENTE);
    expect(applyWelcomeCta(legado, true)).toBe(CTA_ANAMNESE_FEITA);
    expect(applyWelcomeCta('{{cta_inicio}}', false)).toBe(CTA_ANAMNESE_PENDENTE);
    expect(applyWelcomeCta('{{cta_inicio}}', true)).toBe(CTA_ANAMNESE_FEITA);
  });
});

describe('renderNutriWelcomeMessage anamnese e título', () => {
  it('usa Dr. no médico e omite o pedido de anamnese quando já está preenchida', () => {
    const text = renderNutriWelcomeMessage({
      template: DEFAULT_NUTRI_WELCOME_MESSAGE,
      pacienteNome: 'Zladimir Costa',
      nutriNome: 'Ricardo Mota',
      medicoNome: 'Ricardo Mota',
      medicoGenero: 'M',
      agendamentoUrl: 'https://exemplo.com/consulta-nutri/ABC',
      anamnesePreenchida: true,
    });
    expect(text).toContain('Dr. Ricardo Mota');
    expect(text).toContain(CTA_ANAMNESE_FEITA);
    expect(text).not.toContain('preencha sua anamnese');
    expect(text).not.toContain('(se ainda não fez)');
  });

  it('pede a anamnese quando o questionário ainda não foi respondido', () => {
    const text = renderNutriWelcomeMessage({
      template: DEFAULT_NUTRI_WELCOME_MESSAGE,
      pacienteNome: 'Zladimir Costa',
      nutriNome: 'Ricardo Mota',
      medicoNome: 'Ricardo Mota',
      medicoGenero: 'M',
      agendamentoUrl: 'https://exemplo.com/consulta-nutri/ABC',
      anamnesePreenchida: false,
    });
    expect(text).toContain(CTA_ANAMNESE_PENDENTE);
    expect(text).not.toContain('(se ainda não fez)');
  });
});

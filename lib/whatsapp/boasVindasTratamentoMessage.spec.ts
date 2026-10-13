import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY,
  buildBoasVindasTratamentoFallback,
  formatArtigoMedicoBoasVindas,
  formatContatoMedicoBoasVindas,
  formatCrmBoasVindas,
  formatMedicoBoasVindas,
  formatSaudacaoBoasVindas,
  prepareBoasVindasTratamentoTemplate,
} from '@/lib/whatsapp/boasVindasTratamentoMessage';
import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';

describe('boas-vindas ao tratamento', () => {
  it('formata Dr./Dra. com o nome completo e não duplica o título', () => {
    expect(formatMedicoBoasVindas('Ana Silva', 'F')).toBe('Dra. Ana Silva');
    expect(formatMedicoBoasVindas('Ricardo Mota', 'M')).toBe('Dr. Ricardo Mota');
    expect(formatMedicoBoasVindas('Dra. Ana Silva', 'F')).toBe('Dra. Ana Silva');
  });

  it('formata o CRM no padrão CRM/UF', () => {
    expect(formatCrmBoasVindas('123456', 'sp')).toBe('CRM/SP 123456');
    expect(formatCrmBoasVindas('123456', null)).toBe('CRM 123456');
    expect(formatCrmBoasVindas('', 'SP')).toBe('');
  });

  it('escolhe artigo e contato conforme o gênero do médico', () => {
    expect(formatArtigoMedicoBoasVindas('F')).toBe('a');
    expect(formatArtigoMedicoBoasVindas('M')).toBe('o');
    expect(formatContatoMedicoBoasVindas('F')).toBe('a sua médica');
    expect(formatContatoMedicoBoasVindas('M')).toBe('o seu médico');
  });

  it('escolhe bem-vinda ou bem-vindo conforme o sexo do paciente', () => {
    expect(formatSaudacaoBoasVindas('F')).toBe('bem-vinda');
    expect(formatSaudacaoBoasVindas('feminino')).toBe('bem-vinda');
    expect(formatSaudacaoBoasVindas('M')).toBe('bem-vindo');
    expect(formatSaudacaoBoasVindas(null)).toBe('bem-vindo');
  });

  it('monta o modelo oficial pedindo para salvar o contato', () => {
    const text = buildBoasVindasTratamentoFallback({
      pacienteNome: 'Maria Souza',
      pacienteSexo: 'F',
      medicoNome: 'Ana Silva',
      medicoGenero: 'F',
      crmNumero: '123456',
      crmUf: 'SP',
    });

    expect(text).toBe(
      [
        'Olá, Maria! 👋',
        '',
        'Seja bem-vinda ao acompanhamento com a *Dra. Ana Silva – CRM/SP 123456*.',
        '',
        'Este é o *canal oficial de notificações do seu acompanhamento*. Por aqui, você poderá receber informações importantes, como *lembretes, avisos e links de pagamento* relacionados ao seu tratamento.',
        '',
        '📲 *Salve este número nos seus contatos* para garantir que nossas mensagens cheguem corretamente até você.',
        '',
        'Para confirmar que este canal está funcionando corretamente, responda apenas:',
        '',
        'OK',
        '',
        'Para dúvidas sobre o tratamento ou orientações médicas, continue falando diretamente com a sua médica.',
        '',
        'Seja muito bem-vinda! 💚',
      ].join('\n'),
    );
    expect(text).not.toContain('(a)');
  });

  it('usa bem-vindo e o seu médico para paciente e médico masculinos, sem CRM se faltar', () => {
    const text = buildBoasVindasTratamentoFallback({
      pacienteNome: 'João',
      pacienteSexo: 'M',
      medicoNome: 'Ricardo Mota',
      medicoGenero: 'M',
    });
    expect(text).toContain('Seja bem-vindo ao acompanhamento com o *Dr. Ricardo Mota*.');
    expect(text).toContain('o seu médico');
    expect(text).toContain('Seja muito bem-vindo! 💚');
    expect(text).not.toContain('bem-vinda');
    expect(text).not.toContain('CRM');
  });

  it('renderiza o template padrão com as variáveis do Canal Chat', () => {
    const body = prepareBoasVindasTratamentoTemplate(
      DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY,
      'CRM/SP 123456',
    );
    const rendered = renderAutomationTemplate(body, {
      nome: 'Maria',
      saudacao: 'bem-vinda',
      artigo: 'a',
      medico: 'Dra. Ana Silva',
      crm: 'CRM/SP 123456',
      contato_medico: 'a sua médica',
    });
    expect(rendered).toContain(
      'Seja bem-vinda ao acompanhamento com a *Dra. Ana Silva – CRM/SP 123456*.',
    );
    expect(rendered).toContain('Salve este número nos seus contatos');
    expect(rendered).toContain('links de pagamento');
    expect(rendered).toContain('responda apenas:');
    expect(rendered).toContain('\nOK\n');
    expect(rendered).toContain('a sua médica');
    expect(rendered).toContain('Seja muito bem-vinda! 💚');
    expect(rendered).not.toContain('(a)');
  });
});

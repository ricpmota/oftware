import { describe, expect, it } from 'vitest';
import { buildRelatorioShareCopy } from './relatorioShareCopy';

describe('buildRelatorioShareCopy', () => {
  it('fala do relatório do paciente e do médico', () => {
    const copy = buildRelatorioShareCopy({
      pacienteNome: 'Maria Silva',
      medicoNome: 'Ricardo Mendes',
      medicoGenero: 'M',
    });
    expect(copy.title).toBe('Relatório de Maria Silva');
    expect(copy.description).toBe(
      'Evolução do tratamento, exames e acompanhamento com Dr. Ricardo Mendes.'
    );
    expect(copy.description.toLowerCase()).not.toContain('oftware');
  });

  it('usa Dra. quando o médico é do gênero feminino', () => {
    const copy = buildRelatorioShareCopy({
      pacienteNome: 'Ana',
      medicoNome: 'Paula Lima',
      medicoGenero: 'F',
    });
    expect(copy.description).toContain('Dra. Paula Lima');
  });

  it('cai no texto genérico do relatório sem nome', () => {
    const copy = buildRelatorioShareCopy({});
    expect(copy.title).toBe('Relatório do paciente');
    expect(copy.description).toBe('Evolução do tratamento, exames e acompanhamento deste paciente.');
  });
});

import { describe, expect, it } from 'vitest';
import { buildProntuarioConsultaMedicoNotifyTexto } from './prontuarioConsultaMedicoNotify';

describe('buildProntuarioConsultaMedicoNotifyTexto', () => {
  it('informa paciente, nutricionista, dia e hora para o médico conferir', () => {
    const texto = buildProntuarioConsultaMedicoNotifyTexto({
      medicoNome: 'Dr. Ricardo Mota',
      profissionalNome: 'Ana Costa',
      pacienteNome: 'Maria Souza',
      data: '25/08/2026',
      hora: '06:31',
      titulo: 'Consulta nutricional',
    });
    expect(texto).toContain('Olá, Dr. Ricardo Mota!');
    expect(texto).toContain('A nutricionista Ana Costa registrou uma consulta no prontuário de Maria Souza.');
    expect(texto).toContain('Confira no prontuário o que foi escrito.');
    expect(texto).toContain('📅 25/08/2026');
    expect(texto).toContain('🕐 06:31');
    expect(texto).toContain('Consulta nutricional');
  });

  it('usa o educador físico quando o registro vem do personal', () => {
    const texto = buildProntuarioConsultaMedicoNotifyTexto({
      medicoNome: 'Dra. Helena',
      profissionalNome: 'Carlos Lima',
      pacienteNome: 'João',
      data: '11/10/2026',
      hora: '14:00',
      titulo: 'Consulta Educador Físico',
      papel: 'personal',
      genero: 'M',
    });
    expect(texto).toContain(
      'O educador físico Carlos Lima registrou uma consulta no prontuário de João.'
    );
    expect(texto).toContain('Confira no prontuário o que foi escrito.');
  });

  it('usa fallbacks quando nomes estão vazios', () => {
    const texto = buildProntuarioConsultaMedicoNotifyTexto({
      medicoNome: '',
      profissionalNome: '  ',
      pacienteNome: '',
      data: '',
      hora: '',
    });
    expect(texto).toContain('Olá, Doutor(a)!');
    expect(texto).toContain('A nutricionista registrou uma consulta no prontuário de Paciente.');
    expect(texto).toContain('📅 —');
    expect(texto).toContain('🕐 —');
  });
});

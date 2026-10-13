import { describe, expect, it } from 'vitest';
import { buildExamesLaboratoriaisPacienteNotifyTexto } from './examesLaboratoriaisPacienteNotify';

describe('buildExamesLaboratoriaisPacienteNotifyTexto', () => {
  it('informa o médico, os exames e o link do /meta', () => {
    const texto = buildExamesLaboratoriaisPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      medicoNome: 'Dr. Ricardo Mota',
      examesUrl: 'https://www.oftware.com.br/meta?menu=exames',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Dr. Ricardo Mota');
    expect(texto).toContain('exames laboratoriais');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=exames');
  });

  it('usa fallbacks quando nomes estão vazios', () => {
    const texto = buildExamesLaboratoriaisPacienteNotifyTexto({
      pacienteNome: '',
      medicoNome: '  ',
      examesUrl: 'https://www.oftware.com.br/meta?menu=exames',
    });
    expect(texto).toContain('Olá, Paciente!');
    expect(texto).toContain('seu médico');
  });
});

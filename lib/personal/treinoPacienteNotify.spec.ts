import { describe, expect, it } from 'vitest';
import { buildTreinoPacienteNotifyTexto } from './treinoPacienteNotify';

describe('buildTreinoPacienteNotifyTexto', () => {
  it('informa o personal e o link do treino no /meta', () => {
    const texto = buildTreinoPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      personalNome: 'O personal João Silva',
      treinoUrl: 'https://www.oftware.com.br/meta?menu=personal',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('João Silva');
    expect(texto).toContain('treino');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=personal');
  });

  it('usa fallbacks quando nomes estão vazios', () => {
    const texto = buildTreinoPacienteNotifyTexto({
      pacienteNome: '',
      personalNome: '  ',
      treinoUrl: 'https://www.oftware.com.br/meta?menu=personal',
    });
    expect(texto).toContain('Olá, Paciente!');
    expect(texto).toContain('Seu personal trainer');
  });
});

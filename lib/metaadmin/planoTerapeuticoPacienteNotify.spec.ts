import { describe, expect, it } from 'vitest';
import { buildPlanoTerapeuticoPacienteNotifyTexto } from './planoTerapeuticoPacienteNotify';

describe('buildPlanoTerapeuticoPacienteNotifyTexto', () => {
  it('informa a alteração do plano e o link de Aplicações', () => {
    const texto = buildPlanoTerapeuticoPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      medicoNome: 'Dr. Ricardo Mota',
      aplicacoesUrl: 'https://www.oftware.com.br/meta?menu=aplicacoes',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Dr. Ricardo Mota');
    expect(texto).toContain('Plano Terapêutico');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=aplicacoes');
  });
});

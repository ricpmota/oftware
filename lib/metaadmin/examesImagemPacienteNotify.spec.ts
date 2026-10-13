import { describe, expect, it } from 'vitest';
import { buildExamesImagemPacienteNotifyTexto } from './examesImagemPacienteNotify';

describe('buildExamesImagemPacienteNotifyTexto', () => {
  it('informa o médico, o exame de imagem e o link da aba Imagens', () => {
    const texto = buildExamesImagemPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      medicoNome: 'Dr. Ricardo Mota',
      examesImagensUrl: 'https://www.oftware.com.br/meta?menu=exames&aba=imagens',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Dr. Ricardo Mota');
    expect(texto).toContain('exame de imagem');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=exames&aba=imagens');
  });
});

import { describe, expect, it } from 'vitest';
import { buildOrientacoesPacienteNotifyTexto } from './orientacoesPacienteNotify';

describe('buildOrientacoesPacienteNotifyTexto', () => {
  it('informa a nutricionista e o link das mensagens no /meta', () => {
    const texto = buildOrientacoesPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'A nutricionista Ana Costa',
      mensagensUrl: 'https://www.oftware.com.br/meta?menu=mensagens',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Ana Costa');
    expect(texto).toContain('orientação');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=mensagens');
  });
});

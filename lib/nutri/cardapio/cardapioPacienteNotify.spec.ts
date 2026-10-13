import { describe, expect, it } from 'vitest';
import { buildCardapioPacienteNotifyTexto } from './cardapioPacienteNotify';

describe('buildCardapioPacienteNotifyTexto', () => {
  it('informa a nutricionista e o link do cardápio no /meta', () => {
    const texto = buildCardapioPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      nutriNome: 'A nutricionista Ana Costa',
      cardapioUrl: 'https://www.oftware.com.br/meta?menu=nutri&aba=cardapio',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Ana Costa');
    expect(texto).toContain('cardápio');
    expect(texto).toContain('https://www.oftware.com.br/meta?menu=nutri&aba=cardapio');
  });

  it('usa fallbacks quando nomes estão vazios', () => {
    const texto = buildCardapioPacienteNotifyTexto({
      pacienteNome: '',
      nutriNome: '  ',
      cardapioUrl: 'https://www.oftware.com.br/meta?menu=nutri&aba=cardapio',
    });
    expect(texto).toContain('Olá, Paciente!');
    expect(texto).toContain('Sua nutricionista');
  });
});

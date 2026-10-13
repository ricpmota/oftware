import { describe, expect, it } from 'vitest';
import { buildPacienteCadastroLinkMessage } from './buildPacienteCadastroLinkMessage';

describe('buildPacienteCadastroLinkMessage', () => {
  it('inclui nome do médico, e-mail e o link de login', () => {
    const text = buildPacienteCadastroLinkMessage({
      pacienteNome: 'Maria Silva',
      medicoNome: 'João Costa',
      medicoGenero: 'M',
      email: 'maria@gmail.com',
      loginUrl: 'https://www.ometodoemagrecer.com.br/meta',
    });
    expect(text).toContain('Maria');
    expect(text).toContain('Dr. João Costa');
    expect(text).toContain('maria@gmail.com');
    expect(text).toContain('https://www.ometodoemagrecer.com.br/meta');
    expect(text).toContain('Google');
  });
});

import { describe, expect, it } from 'vitest';
import { buildBioimpedanciaPacienteNotifyTexto } from './bioimpedanciaPacienteNotify';

describe('buildBioimpedanciaPacienteNotifyTexto', () => {
  it('informa o médico, a bioimpedância e o link do /meta', () => {
    const texto = buildBioimpedanciaPacienteNotifyTexto({
      pacienteNome: 'Maria Souza',
      medicoNome: 'Dr. Ricardo Mota',
      metaUrl: 'https://www.oftware.com.br/meta',
    });
    expect(texto).toContain('Olá, Maria!');
    expect(texto).toContain('Dr. Ricardo Mota');
    expect(texto).toContain('bioimpedância');
    expect(texto).toContain('https://www.oftware.com.br/meta');
  });
});

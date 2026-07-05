import { describe, expect, it } from 'vitest';
import {
  ORGANIZACAO_METODO_PUBLIC_ORIGIN,
  buildOrganizacaoPublicUrl,
  resolveOrganizacaoPublicOrigin,
} from './organizacaoPublicOrigin';

describe('organizacaoPublicOrigin', () => {
  it('retorna domínio canônico do Método por padrão', () => {
    expect(resolveOrganizacaoPublicOrigin()).toBe(ORGANIZACAO_METODO_PUBLIC_ORIGIN);
    expect(ORGANIZACAO_METODO_PUBLIC_ORIGIN).toBe('https://www.ometodoemagrecer.com.br');
  });

  it('monta URLs públicas com path absoluto ou relativo', () => {
    expect(buildOrganizacaoPublicUrl('/aplicacao/abc123')).toBe(
      'https://www.ometodoemagrecer.com.br/aplicacao/abc123',
    );
    expect(buildOrganizacaoPublicUrl('conclusao/xyz')).toBe(
      'https://www.ometodoemagrecer.com.br/conclusao/xyz',
    );
  });

  it('honra override explícito', () => {
    expect(buildOrganizacaoPublicUrl('/dr/teste', 'https://example.com/')).toBe(
      'https://example.com/dr/teste',
    );
  });
});

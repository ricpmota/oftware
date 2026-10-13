import { describe, expect, it } from 'vitest';
import {
  APLICACAO_PUBLIC_TOKEN_ALPHABET,
  APLICACAO_PUBLIC_TOKEN_LENGTH,
  generateAplicacaoPublicToken,
  isValidAplicacaoPublicToken,
  normalizeAplicacaoPublicToken,
} from './aplicacaoPublicToken';

describe('aplicacaoPublicToken', () => {
  it('gera 8 caracteres do alfabeto sem letras ambíguas', () => {
    const token = generateAplicacaoPublicToken();
    expect(token).toHaveLength(APLICACAO_PUBLIC_TOKEN_LENGTH);
    expect([...token].every((ch) => APLICACAO_PUBLIC_TOKEN_ALPHABET.includes(ch))).toBe(true);
    expect(token).not.toMatch(/[01OI]/);
  });

  it('aceita token curto novo e hex legado', () => {
    expect(isValidAplicacaoPublicToken('X23KMD7P')).toBe(true);
    expect(isValidAplicacaoPublicToken('x23kmd7p')).toBe(true);
    expect(isValidAplicacaoPublicToken('a'.repeat(64))).toBe(true);
    expect(isValidAplicacaoPublicToken('abc')).toBe(false);
    expect(isValidAplicacaoPublicToken('')).toBe(false);
  });

  it('normaliza token curto para maiúsculas e preserva hex legado', () => {
    expect(normalizeAplicacaoPublicToken(' x23kmd7p ')).toBe('X23KMD7P');
    const legacy = 'ab'.repeat(16);
    expect(normalizeAplicacaoPublicToken(legacy)).toBe(legacy);
  });
});

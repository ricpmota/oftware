import { describe, expect, it } from 'vitest';
import {
  PUBLIC_LINK_TOKEN_ALPHABET,
  PUBLIC_LINK_TOKEN_LENGTH,
  generatePublicLinkToken,
  isShortPublicLinkToken,
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from './publicLinkToken';

describe('publicLinkToken', () => {
  it('gera 8 caracteres do alfabeto sem letras ambíguas', () => {
    const token = generatePublicLinkToken();
    expect(token).toHaveLength(PUBLIC_LINK_TOKEN_LENGTH);
    expect([...token].every((ch) => PUBLIC_LINK_TOKEN_ALPHABET.includes(ch))).toBe(true);
    expect(token).not.toMatch(/[01OI]/);
  });

  it('aceita token curto novo e hex legado', () => {
    expect(isValidPublicLinkToken('X23KMD7P')).toBe(true);
    expect(isValidPublicLinkToken('x23kmd7p')).toBe(true);
    expect(isValidPublicLinkToken('a'.repeat(64))).toBe(true);
    expect(isValidPublicLinkToken('abc')).toBe(false);
    expect(isValidPublicLinkToken('')).toBe(false);
  });

  it('normaliza token curto para maiúsculas e preserva hex legado', () => {
    expect(normalizePublicLinkToken(' x23kmd7p ')).toBe('X23KMD7P');
    const legacy = 'ab'.repeat(16);
    expect(normalizePublicLinkToken(legacy)).toBe(legacy);
  });

  it('distingue token curto do hex legado', () => {
    expect(isShortPublicLinkToken('X23KMD7P')).toBe(true);
    expect(isShortPublicLinkToken('ab'.repeat(24))).toBe(false);
  });
});

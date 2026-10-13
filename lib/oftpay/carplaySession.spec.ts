import { describe, expect, it } from 'vitest';
import { isValidCarplayCode, normalizeCarplayCode } from './carplayCode';
import { signCarplaySession, verifyCarplaySession } from './carplaySession';

describe('carplay code', () => {
  it('normaliza espaços e minúsculas', () => {
    expect(normalizeCarplayCode(' ab-12 cd ')).toBe('AB12CD');
  });

  it('aceita 4 a 12 caracteres', () => {
    expect(isValidCarplayCode('AB12')).toBe(true);
    expect(isValidCarplayCode('ABC')).toBe(false);
    expect(isValidCarplayCode('A'.repeat(13))).toBe(false);
  });
});

describe('carplay session', () => {
  const secret = 'teste-carplay';

  it('aceita o token assinado e rejeita outro segredo', () => {
    const token = signCarplaySession('Aluno@Oftware.com', secret, 1_000);
    expect(verifyCarplaySession(token, secret, 1_000)?.email).toBe('aluno@oftware.com');
    expect(verifyCarplaySession(token, 'outro', 1_000)).toBeNull();
  });

  it('rejeita sessão vencida', () => {
    const token = signCarplaySession('aluno@oftware.com', secret, 1_000);
    expect(verifyCarplaySession(token, secret, 1_000 + 31 * 24 * 60 * 60 * 1000)).toBeNull();
  });
});

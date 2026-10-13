import { describe, expect, it } from 'vitest';
import { connectionWhenLabel, matchGivenName } from '@/lib/match/connectionWhen';

const now = new Date(2026, 8, 26, 15, 0, 0).getTime();

describe('connectionWhenLabel', () => {
  it('trata data ausente', () => {
    expect(connectionWhenLabel(undefined, now)).toBe('Conectados');
    expect(connectionWhenLabel(0, now)).toBe('Conectados');
  });

  it('diferencia hoje, ontem, dias e semanas', () => {
    expect(connectionWhenLabel(new Date(2026, 8, 26, 9, 0, 0).getTime(), now)).toBe('Conectados hoje');
    expect(connectionWhenLabel(new Date(2026, 8, 25, 22, 0, 0).getTime(), now)).toBe('Conectados ontem');
    expect(connectionWhenLabel(new Date(2026, 8, 23, 12, 0, 0).getTime(), now)).toBe('Conectados há 3 dias');
    expect(connectionWhenLabel(new Date(2026, 8, 19, 12, 0, 0).getTime(), now)).toBe('Conectados há 1 semana');
    expect(connectionWhenLabel(new Date(2026, 8, 12, 12, 0, 0).getTime(), now)).toBe('Conectados há 2 semanas');
  });
});

describe('matchGivenName', () => {
  it('usa o primeiro nome', () => {
    expect(matchGivenName('Marina Alves')).toBe('Marina');
    expect(matchGivenName('  ')).toBe('Conexão');
  });
});

import { describe, expect, it } from 'vitest';
import { chatAccess, messageDayLabel, prepareMessageText } from '@/lib/match/matchChat';

describe('prepareMessageText', () => {
  it('recusa vazio e passa do limite', () => {
    expect(prepareMessageText('   ')).toEqual({ ok: false });
    expect(prepareMessageText('a'.repeat(2001))).toEqual({ ok: false });
    expect(prepareMessageText('  Oi  ')).toEqual({ ok: true, text: 'Oi' });
    expect(prepareMessageText('   ', true)).toEqual({ ok: true, text: '' });
  });
});

describe('chatAccess', () => {
  it('só libera conexão ativa sem bloqueio', () => {
    expect(chatAccess({ blocked: false, connectionExists: true, connectionActive: true, member: true })).toBe('ok');
    expect(chatAccess({ blocked: true, connectionExists: true, connectionActive: true, member: true })).toBe('blocked');
    expect(chatAccess({ blocked: false, connectionExists: true, connectionActive: false, member: true })).toBe('inactive');
    expect(chatAccess({ blocked: false, connectionExists: false, connectionActive: false, member: false })).toBe('forbidden');
    expect(chatAccess({ blocked: false, connectionExists: true, connectionActive: true, member: false })).toBe('forbidden');
  });
});

describe('messageDayLabel', () => {
  const now = new Date(2026, 8, 26, 15).getTime();

  it('agrupa hoje, ontem e a data', () => {
    expect(messageDayLabel(new Date(2026, 8, 26, 9).getTime(), now)).toBe('Hoje');
    expect(messageDayLabel(new Date(2026, 8, 25, 22).getTime(), now)).toBe('Ontem');
    expect(messageDayLabel(new Date(2026, 8, 24, 12).getTime(), now)).toBe('24 de setembro');
  });
});

import { describe, expect, it } from 'vitest';
import { compareMentorContents, isMentorContentNew, isMentorContentUpdated } from './sort';

describe('mentorados sort', () => {
  it('prioriza featured, depois order crescente e createdAt decrescente', () => {
    const a = { featured: false, order: 1, createdAt: '2026-08-01T00:00:00.000Z' };
    const b = { featured: true, order: 9, createdAt: '2026-08-02T00:00:00.000Z' };
    const c = { featured: false, order: 2, createdAt: '2026-08-03T00:00:00.000Z' };
    const sorted = [a, b, c].sort(compareMentorContents);
    expect(sorted[0]).toBe(b);
    expect(sorted[1]).toBe(a);
    expect(sorted[2]).toBe(c);
  });

  it('marca conteúdo novo em até 15 dias', () => {
    const now = Date.parse('2026-08-19T12:00:00.000Z');
    expect(isMentorContentNew('2026-08-10T12:00:00.000Z', now)).toBe(true);
    expect(isMentorContentNew('2026-07-01T12:00:00.000Z', now)).toBe(false);
  });

  it('marca atualizado quando a edição é recente e distinta da criação', () => {
    const now = Date.parse('2026-08-19T12:00:00.000Z');
    expect(
      isMentorContentUpdated('2026-07-01T12:00:00.000Z', '2026-08-18T12:00:00.000Z', now)
    ).toBe(true);
    expect(
      isMentorContentUpdated('2026-08-18T12:00:00.000Z', '2026-08-18T14:00:00.000Z', now)
    ).toBe(false);
  });
});

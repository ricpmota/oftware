import { describe, expect, it } from 'vitest';
import { randomDisparoGapMs } from '@/lib/disparos/sendGap';

describe('intervalo sorteado', () => {
  it('varia de 50 a 70 segundos, inclusive', () => {
    expect(randomDisparoGapMs(() => 0)).toBe(50_000);
    expect(randomDisparoGapMs(() => 0.999999)).toBe(70_000);
    const seen = new Set<number>();
    for (let i = 0; i < 21; i += 1) {
      seen.add(randomDisparoGapMs(() => i / 21));
    }
    expect(Math.min(...seen)).toBe(50_000);
    expect(Math.max(...seen)).toBe(70_000);
    expect(seen.size).toBe(21);
  });
});
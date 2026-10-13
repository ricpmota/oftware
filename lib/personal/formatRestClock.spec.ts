import { describe, expect, it } from 'vitest';
import { formatRestClock } from '@/lib/personal/formatRestClock';

describe('formatRestClock', () => {
  it('mostra minutos e segundos com zero à esquerda', () => {
    expect(formatRestClock(90)).toBe('1:30');
    expect(formatRestClock(5)).toBe('0:05');
    expect(formatRestClock(0)).toBe('0:00');
    expect(formatRestClock(60)).toBe('1:00');
  });
});

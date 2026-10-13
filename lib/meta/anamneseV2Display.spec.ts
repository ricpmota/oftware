import { describe, expect, it } from 'vitest';
import { buildAnamneseV2Cards } from './anamneseV2Display';

describe('buildAnamneseV2Cards', () => {
  it('monta os cards mesmo sem dados clínicos', () => {
    const cards = buildAnamneseV2Cards(undefined, 'M');
    expect(cards.some((card) => card.id === 'cirurgias')).toBe(true);
    expect(cards.some((card) => card.id === 'triagemDepressao')).toBe(true);
  });

  it('mostra a cirurgia marcada', () => {
    const cards = buildAnamneseV2Cards(
      { cirurgiasRealizadas: { sleeveGastrico: true } } as never,
      'F'
    );
    const cirurgias = cards.find((card) => card.id === 'cirurgias');
    expect(cirurgias?.chips.some((chip) => chip.toLowerCase().includes('sleeve'))).toBe(true);
  });
});

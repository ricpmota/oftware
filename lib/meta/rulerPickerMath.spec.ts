import { describe, expect, it } from 'vitest';
import {
  clampRulerOffset,
  kgLossFromPercent,
  percentLossFromKg,
  rulerOffsetForValue,
  rulerValueForOffset,
  snapRulerValue,
} from './rulerPickerMath';

describe('snapRulerValue', () => {
  const min = 4;
  const max = 32.5;
  const step = 0.1;

  it('encaixa em 0,1 kg e nunca para entre dois steps', () => {
    expect(snapRulerValue(6.84, min, max, step)).toBe(6.8);
    expect(snapRulerValue(6.86, min, max, step)).toBe(6.9);
    expect(snapRulerValue(7, min, max, step)).toBe(7);
    for (let n = min; n <= max; n += 0.037) {
      const snapped = snapRulerValue(n, min, max, step);
      const steps = Math.round((snapped - min) / step);
      expect(Math.abs(snapped - (min + steps * step))).toBeLessThan(1e-9);
      expect(snapped).toBeGreaterThanOrEqual(min);
      expect(snapped).toBeLessThanOrEqual(max);
    }
  });

  it('respeita mínimo e máximo', () => {
    expect(snapRulerValue(0, min, max, step)).toBe(min);
    expect(snapRulerValue(99, min, max, step)).toBe(max);
  });
});

describe('percentual e peso-meta', () => {
  it('7,0 kg em 72,5 kg volta em 9,7% e 7,0 kg', () => {
    const pct = percentLossFromKg(7, 72.5);
    expect(pct).toBe(9.7);
    expect(kgLossFromPercent(pct, 72.5)).toBe(7);
    expect(Math.round((72.5 - 7) * 10) / 10).toBe(65.5);
  });

  it('7,1 kg permanece depois de gravar o percentual', () => {
    const pct = percentLossFromKg(7.1, 72.5);
    expect(kgLossFromPercent(pct, 72.5)).toBe(7.1);
  });
});

describe('offset da régua', () => {
  it('mínimo fica no centro (offset 0) e o valor volta do offset', () => {
    expect(rulerOffsetForValue(4, 4, 0.1, 12)).toBe(0);
    expect(Object.is(rulerOffsetForValue(4, 4, 0.1, 12), -0)).toBe(false);
    const offset = rulerOffsetForValue(7, 4, 0.1, 12);
    expect(rulerValueForOffset(offset, 4, 0.1, 12)).toBeCloseTo(7, 6);
    expect(clampRulerOffset(500, 4, 32.5, 0.1, 12)).toBe(0);
    expect(clampRulerOffset(-99999, 4, 32.5, 0.1, 12)).toBe(rulerOffsetForValue(32.5, 4, 0.1, 12));
  });
});

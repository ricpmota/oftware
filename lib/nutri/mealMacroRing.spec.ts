import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  combinedPredictedPercent,
  percentOfPredicted,
  ringFillPercent,
} from '@/lib/nutri/mealMacroRing';

const ROOT = path.resolve(__dirname, '../..');

describe('mealMacroRing', () => {
  it('calorias 100% + proteínas 80% → total 90% do previsto', () => {
    expect(percentOfPredicted(100, 100)).toBe(100);
    expect(percentOfPredicted(80, 100)).toBe(80);
    expect(combinedPredictedPercent(100, 80)).toBe(90);
  });

  it('previsto zero não divide', () => {
    expect(percentOfPredicted(50, 0)).toBe(0);
    expect(ringFillPercent(150)).toBe(100);
    expect(ringFillPercent(-10)).toBe(0);
  });

  it('mobile liga a bola ao resumo total do dia, sem mudar a miniatura', () => {
    const nutri = readFileSync(path.join(ROOT, 'components/NutriContent.tsx'), 'utf8');
    const dish = readFileSync(path.join(ROOT, 'components/nutri/MealDishImage.tsx'), 'utf8');
    expect(nutri).toContain('MealMacroRing');
    expect(nutri).toContain('md:hidden');
    expect(nutri).toContain('CARDAPIO_RESUMO_TOTAL_DIA_ID');
    expect(dish).toContain(
      'group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border sm:h-[88px] sm:w-[88px] lg:h-24 lg:w-24'
    );
    expect(dish).not.toContain('MealMacroRing');
  });

  it('bolinha não mostra percentual no centro', () => {
    const ring = readFileSync(path.join(ROOT, 'components/nutri/MealMacroRing.tsx'), 'utf8');
    expect(ring).not.toContain('tabular-nums');
    expect(ring).not.toContain('pointer-events-none absolute inset-0');
  });
});

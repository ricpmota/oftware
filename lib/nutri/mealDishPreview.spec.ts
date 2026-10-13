import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(__dirname, '../..');

function readSrc(rel: string): string {
  return readFileSync(path.join(ROOT, rel), 'utf8');
}

describe('preview da foto do prato no cardápio', () => {
  it('miniatura permanece no tamanho da ETAPA 04', () => {
    const dish = readSrc('components/nutri/MealDishImage.tsx');
    expect(dish).toContain(
      'group relative h-[76px] w-[76px] shrink-0 overflow-hidden rounded-xl border sm:h-[88px] sm:w-[88px] lg:h-24 lg:w-24'
    );
  });

  it('clique na foto abre preview e não dispara generate', () => {
    const dish = readSrc('components/nutri/MealDishImage.tsx');
    const nutri = readSrc('components/NutriContent.tsx');
    const modal = readSrc('components/nutri/MealDishPreviewModal.tsx');

    expect(dish).toContain('onPreview');
    expect(dish).toContain('Ver imagem, itens e observação');
    expect(dish).not.toContain('requestMealImageGeneration');
    expect(dish).not.toContain('/api/nutri/meal-image/generate');
    expect(nutri).toContain('onPreview={(imageUrl) => setMealDishPreviewUrl(imageUrl)}');
    expect(nutri).toContain('MealDishPreviewModal');
    expect(modal).toContain('Itens do cardápio');
    expect(modal).toContain('Observação da nutri');
  });

  it('regenerar continua com stopPropagation para não abrir o modal', () => {
    const dish = readSrc('components/nutri/MealDishImage.tsx');
    expect(dish).toContain('event.stopPropagation()');
    expect(dish).toContain('absolute bottom-1 right-1 z-10');
  });
});

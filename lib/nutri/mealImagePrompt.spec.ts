import { describe, expect, it } from 'vitest';
import {
  MEAL_IMAGE_VISUAL_PROMPT_BASE,
  buildMealImagePrompt,
} from '@/lib/nutri/mealImagePrompt';
import type { MealImageSourceOption } from '@/lib/nutri/mealImageSource';

const pratoFrango: MealImageSourceOption = {
  titulo: 'Opção 01 — Maria Silva',
  calorias_kcal: 520,
  proteina_g: 42,
  itensDetalhe: [
    { id: 'a1', nome: 'Frango grelhado', peso_g: 120 },
    { id: 'b1', nome: 'Arroz integral', quantidade: 4, unidade: 'colheres de sopa' },
    { id: 'c1', nome: 'Feijão', quantidade: 0.5, unidade: 'concha' },
    { id: 'd1', nome: 'Salada verde', unidade: 'à vontade' },
  ],
};

describe('buildMealImagePrompt', () => {
  it('usa linguagem natural e o prompt visual padrão', () => {
    const prompt = buildMealImagePrompt(pratoFrango);
    expect(prompt.startsWith(MEAL_IMAGE_VISUAL_PROMPT_BASE)).toBe(true);
    expect(prompt).toContain('Fotografia gastronômica realista de um prato contendo:');
    expect(prompt).toContain('- 120 g de Frango grelhado');
    expect(prompt).toContain('- 4 colheres de sopa de Arroz integral');
    expect(prompt).toContain('- meia concha de Feijão');
    expect(prompt).toContain('- Salada verde à vontade');
    expect(prompt).not.toMatch(/Arroz integral - 4 - colheres de sopa/);
  });

  it('não inclui título, nome do paciente nem dados pessoais', () => {
    const option: MealImageSourceOption = {
      ...pratoFrango,
      titulo: 'Cardápio da Ana Costa CPF 123.456.789-00 email ana@exemplo.com',
      descricao: 'não deve prevalecer sobre itensDetalhe',
    };
    const prompt = buildMealImagePrompt(option);
    expect(prompt).not.toContain('Ana Costa');
    expect(prompt).not.toContain('CPF');
    expect(prompt).not.toContain('123.456.789-00');
    expect(prompt).not.toContain('ana@exemplo.com');
    expect(prompt).not.toContain('Maria Silva');
    expect(prompt).not.toContain('Opção 01');
    expect(prompt).not.toMatch(/diagn[oó]stico/i);
    expect(prompt).not.toMatch(/anamnese/i);
  });

  it('retorna vazio sem composição descrevível', () => {
    expect(buildMealImagePrompt({ titulo: 'Opção 01', itensSelecionados: ['id-1'] })).toBe('');
    expect(buildMealImagePrompt(null)).toBe('');
  });
});

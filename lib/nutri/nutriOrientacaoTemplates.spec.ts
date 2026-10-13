import { describe, expect, it } from 'vitest';
import {
  groupNutriOrientacaoTemplatesByTema,
  normalizeOrientacaoTema,
  normalizeOrientacaoTitulo,
  type NutriOrientacaoTemplate,
} from '@/lib/nutri/nutriOrientacaoTemplatesStore';

function item(overrides: Partial<NutriOrientacaoTemplate>): NutriOrientacaoTemplate {
  return {
    id: '1',
    ownerId: 'nutri-1',
    titulo: 'Beber água',
    tema: 'Hidratação',
    mensagem: 'Beba 2 litros.',
    createdAt: new Date('2026-08-17'),
    updatedAt: new Date('2026-08-17'),
    ...overrides,
  };
}

describe('diretório de orientações', () => {
  it('título e tema vazios viram padrão', () => {
    expect(normalizeOrientacaoTitulo('  Hidratação 2L  ')).toBe('Hidratação 2L');
    expect(normalizeOrientacaoTema('')).toBe('Geral');
    expect(normalizeOrientacaoTema('  Intestino ')).toBe('Intestino');
  });

  it('agrupa por tema e ordena títulos', () => {
    const grouped = groupNutriOrientacaoTemplatesByTema([
      item({ id: 'b', titulo: 'Zinco', tema: 'Suplementos' }),
      item({ id: 'a', titulo: 'Água', tema: 'Hidratação' }),
      item({ id: 'c', titulo: 'Magnésio', tema: 'Suplementos' }),
      item({ id: 'd', titulo: 'Geral 1', tema: 'Geral' }),
    ]);
    expect(grouped.map((g) => g.tema)).toEqual(['Hidratação', 'Suplementos', 'Geral']);
    expect(grouped[1].items.map((i) => i.titulo)).toEqual(['Magnésio', 'Zinco']);
  });
});

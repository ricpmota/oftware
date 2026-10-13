import { describe, expect, it } from 'vitest';
import {
  TEMPLATES_REFEICAO_V1,
  listarTemplatesParaRefeicao,
  selecionarTemplatesValidos,
} from '@/lib/nutri/templatesRefeicao';

describe('templatesRefeicao', () => {
  it('possui templates de café, lanches, almoço e jantar', () => {
    expect(listarTemplatesParaRefeicao('cafe').length).toBeGreaterThanOrEqual(5);
    expect(listarTemplatesParaRefeicao('lanche1').length).toBeGreaterThanOrEqual(4);
    expect(listarTemplatesParaRefeicao('almoco').length).toBeGreaterThanOrEqual(3);
    expect(listarTemplatesParaRefeicao('jantar').length).toBeGreaterThanOrEqual(3);
  });

  it('café reduzido prioriza whey/iogurte', () => {
    const t = selecionarTemplatesValidos({ refeicao: 'cafe', cafeReduzido: true });
    expect(t[0].tags).toContain('reduzido');
  });

  it('digestiva prioriza jantar_digestivo', () => {
    const t = selecionarTemplatesValidos({ refeicao: 'jantar', estilo: 'digestiva' });
    expect(t[0].id).toBe('jantar_digestivo');
  });

  it('IDs de template são únicos', () => {
    const ids = TEMPLATES_REFEICAO_V1.map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

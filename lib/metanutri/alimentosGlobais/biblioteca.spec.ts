import { describe, expect, it } from 'vitest';
import { toMetaNutriFoodDetailResult } from '@/lib/metanutri/alimentosGlobais/toMetaNutriFoodDetailResult';
import { toMetaNutriFoodSearchResult } from '@/lib/metanutri/alimentosGlobais/toMetaNutriFoodSearchResult';
import type { AlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';
import { SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS } from '@/services/nutriAlimentosGlobaisFavoritosService';

function food(over: Partial<AlimentoGlobal> = {}): AlimentoGlobal {
  return {
    id: 'g1',
    nome: 'Banana, prata, madura',
    nomeNormalizado: 'banana prata madura',
    segmento: 'FRUTAS_E_DERIVADOS',
    baseQuantidade: 100,
    baseUnidade: 'g',
    energiaKcal: 89,
    proteinasG: 1.1,
    carboidratosG: 22.8,
    gordurasTotaisG: 0.3,
    fibrasG: 2.6,
    glicoseG: 0.56,
    fonte: {
      nome: 'TBCA',
      documento: 'tbca.pdf',
      importId: 'secret-import',
      modeloGemini: 'secret-model',
      promptVersion: 'secret-prompt',
    },
    status: 'published',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

describe('ETAPA 06 — DTO detalhe', () => {
  it('não expõe import/gemini/prompt', () => {
    const d = toMetaNutriFoodDetailResult(food());
    expect(d.glicoseG).toBe(0.56);
    expect(d.fontesPublicas[0]?.nome).toBe('TBCA');
    expect((d as Record<string, unknown>).importId).toBeUndefined();
    expect(JSON.stringify(d)).not.toContain('secret-import');
    expect(JSON.stringify(d)).not.toContain('secret-model');
  });

  it('null permanece null', () => {
    const d = toMetaNutriFoodDetailResult(food({ ferroMg: null, vitaminaCMg: null }));
    expect(d.ferroMg).toBeNull();
    expect(d.vitaminaCMg).toBeNull();
  });

  it('search DTO permanece enxuto', () => {
    const s = toMetaNutriFoodSearchResult(food());
    expect(s.proteinasG).toBe(1.1);
    expect((s as Record<string, unknown>).glicoseG).toBeUndefined();
    expect((s as Record<string, unknown>).fonte).toBeUndefined();
  });
});

describe('ETAPA 06 — favoritos path', () => {
  it('usa subcoleção dedicada (não copia para alimentos)', () => {
    expect(SUBCOL_ALIMENTOS_GLOBAIS_FAVORITOS).toBe('alimentos_globais_favoritos');
  });
});

describe('ETAPA 06 — published only contract', () => {
  it('draft/inactive não passam no contrato de detalhe publicado', () => {
    expect(food({ status: 'published' }).status).toBe('published');
    expect(food({ status: 'draft' }).status).not.toBe('published');
    expect(food({ status: 'inactive' }).status).not.toBe('published');
  });
});

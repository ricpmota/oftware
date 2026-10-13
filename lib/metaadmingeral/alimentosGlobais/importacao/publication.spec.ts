import { describe, expect, it } from 'vitest';
import { parseAlimentoGlobalDoc, resolveFontesAlimento, appendFonteHistorico } from '@/lib/metaadmingeral/alimentosGlobais';
import {
  computePublicationReadiness,
  isSafeForBatchCreate,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationReadiness';
import { buildImportPublicationSummary } from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationSummary';
import { mapImportedDraftToGlobalFood } from '@/lib/metaadmingeral/alimentosGlobais/importacao/mapImportedDraftToGlobalFood';
import {
  applyMergeResolutions,
  buildMergeSuggestions,
  hasUnresolvedConflicts,
  suggestionsToConflicts,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/mergeFoodFields';
import type { AlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';
import type {
  AlimentoImportacaoDoc,
  ImportedFoodDraft,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/types';

function baseDraft(over: Partial<ImportedFoodDraft> = {}): ImportedFoodDraft {
  return {
    id: 'item1',
    importId: 'imp1',
    loteId: 'lote1',
    nome: 'Pinhão, cozido',
    nomeNormalizado: 'pinhao cozido',
    segmento: 'CEREAIS_E_DERIVADOS',
    segmentoSugerido: 'CEREAIS_E_DERIVADOS',
    baseQuantidade: 100,
    baseUnidade: 'g',
    baseSeguraPara100g: true,
    energiaKcal: 174,
    proteinasG: 2.3,
    carboidratosG: 31.85,
    gordurasTotaisG: 1.1,
    fibrasG: 5,
    nutrientesExtras: [],
    valoresOriginais: { proteinasG: '2,3' },
    qualityFlags: [],
    reviewStatus: 'OK',
    duplicateCandidate: false,
    duplicateMatches: [],
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

function baseImport(): AlimentoImportacaoDoc {
  return {
    id: 'imp1',
    arquivoNome: 'tbca.pdf',
    arquivoStoragePath: 'x',
    fonteNome: 'TBCA',
    fonteVersao: '2023',
    fonteAno: 2023,
    licenca: 'CC',
    status: 'processed',
    totalPaginas: 10,
    paginasProcessadas: 10,
    totalItensExtraidos: 1,
    totalValidos: 1,
    totalComAtencao: 0,
    totalParaRevisao: 0,
    totalDuplicados: 0,
    geminiModel: 'gemini-2.5-flash',
    promptVersion: 'food-pdf-extract-v1',
    criadoPorUid: 'u1',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
  };
}

function baseFood(over: Partial<AlimentoGlobal> = {}): AlimentoGlobal {
  return {
    id: 'food1',
    nome: 'Pinhão cozido',
    nomeNormalizado: 'pinhao cozido',
    segmento: 'CEREAIS_E_DERIVADOS',
    baseQuantidade: 100,
    baseUnidade: 'g',
    proteinasG: 2.3,
    carboidratosG: null,
    glicoseG: null,
    fonte: { nome: 'Manual', documento: 'cadastro' },
    fontes: [{ nome: 'Manual', documento: 'cadastro' }],
    origemCadastro: 'manual',
    status: 'published',
    criadoEm: new Date(),
    atualizadoEm: new Date(),
    ...over,
  };
}

describe('ETAPA 04 — publication readiness', () => {
  it('READY quando OK sem flags bloqueantes', () => {
    expect(computePublicationReadiness(baseDraft())).toBe('READY');
  });

  it('BLOCKED sem nome ou segmento', () => {
    expect(computePublicationReadiness(baseDraft({ nome: 'Sem nome', qualityFlags: ['NOME_VAZIO'] }))).toBe(
      'BLOCKED'
    );
    expect(
      computePublicationReadiness(
        baseDraft({ segmento: null, segmentoSugerido: null, qualityFlags: ['SEGMENTO_AUSENTE'] })
      )
    ).toBe('BLOCKED');
  });

  it('null em nutriente não bloqueia', () => {
    expect(computePublicationReadiness(baseDraft({ proteinasG: null, fibrasG: null }))).toBe('READY');
  });

  it('IGNORED com SKIP', () => {
    expect(computePublicationReadiness(baseDraft({ publicationAction: 'SKIP' }))).toBe('IGNORED');
  });

  it('lote seguro só CREATE+READY sem dup', () => {
    expect(
      isSafeForBatchCreate({
        ...baseDraft({ publicationAction: 'CREATE', publicationReadiness: 'READY' }),
      })
    ).toBe(true);
    expect(
      isSafeForBatchCreate({
        ...baseDraft({
          publicationAction: 'CREATE',
          publicationReadiness: 'READY',
          duplicateCandidate: true,
        }),
      })
    ).toBe(false);
    expect(
      isSafeForBatchCreate({
        ...baseDraft({ publicationAction: 'MERGE', publicationReadiness: 'READY' }),
      })
    ).toBe(false);
  });
});

describe('ETAPA 04 — CREATE map', () => {
  it('mapeia draft → AlimentoGlobal com proveniência', () => {
    const payload = mapImportedDraftToGlobalFood(baseDraft({ sourcePage: 12, codigoOriginal: 'A01' }), {
      importacao: baseImport(),
      publishedByConfirm: true,
    });
    expect(payload.origemCadastro).toBe('pdf_import');
    expect(payload.status).toBe('published');
    expect(payload.fonte?.importId).toBe('imp1');
    expect(payload.fonte?.itemImportId).toBe('item1');
    expect(payload.fonte?.pagina).toBe(12);
    expect(payload.fonte?.modeloGemini).toBe('gemini-2.5-flash');
    expect(payload.fontes).toHaveLength(1);
    expect(payload.carboidratosG).toBe(31.85);
  });
});

describe('ETAPA 04 — MERGE rules', () => {
  it('null existente + valor importado → USE_IMPORTED', () => {
    const s = buildMergeSuggestions(baseFood(), baseDraft({ carboidratosG: 31.85 }));
    const carb = s.find((x) => x.field === 'carboidratosG');
    expect(carb?.suggestedResolution).toBe('USE_IMPORTED');
  });

  it('valor existente + null importado → KEEP_EXISTING', () => {
    const s = buildMergeSuggestions(baseFood({ proteinasG: 2.3 }), baseDraft({ proteinasG: null }));
    const p = s.find((x) => x.field === 'proteinasG');
    expect(p?.suggestedResolution).toBe('KEEP_EXISTING');
  });

  it('valores iguais → KEEP_EXISTING', () => {
    const s = buildMergeSuggestions(baseFood({ proteinasG: 2.3 }), baseDraft({ proteinasG: 2.3 }));
    expect(s.find((x) => x.field === 'proteinasG')?.suggestedResolution).toBe('KEEP_EXISTING');
  });

  it('conflito exige decisão humana', () => {
    const s = buildMergeSuggestions(baseFood({ nome: 'A' }), baseDraft({ nome: 'B' }));
    const nome = s.find((x) => x.field === 'nome');
    expect(nome?.suggestedResolution).toBe('UNRESOLVED');
    const conflicts = suggestionsToConflicts(s);
    expect(hasUnresolvedConflicts(conflicts)).toBe(true);
    expect(() => applyMergeResolutions(conflicts)).toThrow(/UNRESOLVED/);
  });

  it('após resolução aplica só USE_IMPORTED', () => {
    const s = buildMergeSuggestions(
      baseFood({ carboidratosG: null, nome: 'A' }),
      baseDraft({ carboidratosG: 10, nome: 'B' })
    );
    const conflicts = suggestionsToConflicts(s, {
      nome: 'KEEP_EXISTING',
      carboidratosG: 'USE_IMPORTED',
    });
    expect(hasUnresolvedConflicts(conflicts)).toBe(false);
    const patch = applyMergeResolutions(conflicts);
    expect(patch.carboidratosG).toBe(10);
    expect(patch.nome).toBeUndefined();
  });
});

describe('ETAPA 04 — múltiplas fontes + compat', () => {
  it('loader aceita só fonte antiga', () => {
    const parsed = parseAlimentoGlobalDoc('x', {
      nome: 'Arroz',
      segmento: 'CEREAIS_E_DERIVADOS',
      status: 'published',
      fonte: { nome: 'TACO', ano: 2011 },
    });
    expect(parsed?.fonte?.nome).toBe('TACO');
    expect(parsed?.fontes).toHaveLength(1);
  });

  it('appendFonteHistorico não apaga fonte anterior', () => {
    const { fontes } = resolveFontesAlimento({
      fonte: { nome: 'PDF1', importId: 'a', itemImportId: '1' },
    });
    const next = appendFonteHistorico(fontes, {
      nome: 'PDF2',
      importId: 'b',
      itemImportId: '2',
    });
    expect(next).toHaveLength(2);
    expect(next[0].nome).toBe('PDF1');
    expect(next[1].nome).toBe('PDF2');
  });
});

describe('ETAPA 04 — resumo + SKIP', () => {
  it('buildSummary conta CREATE/MERGE/SKIP', () => {
    const summary = buildImportPublicationSummary([
      baseDraft({ publicationStatus: 'published', publicationAction: 'CREATE' }),
      baseDraft({
        id: '2',
        publicationStatus: 'published',
        publicationAction: 'MERGE',
      }),
      baseDraft({ id: '3', publicationStatus: 'skipped', publicationAction: 'SKIP' }),
      baseDraft({ id: '4', publicationStatus: 'failed' }),
      baseDraft({
        id: '5',
        publicationStatus: 'pending',
        reviewStatus: 'ATTENTION',
        qualityFlags: ['BASE_NAO_100G'],
      }),
    ]);
    expect(summary.extraidos).toBe(5);
    expect(summary.criados).toBe(1);
    expect(summary.mesclados).toBe(1);
    expect(summary.ignorados).toBe(1);
    expect(summary.falharam).toBe(1);
    expect(summary.comRevisaoPendente).toBe(1);
  });
});

import { describe, expect, it } from 'vitest';
import {
  aggregateLearningImpact,
  buildAdaptiveLearningContext,
  buildLearningEffectivenessSummary,
  evaluateLearningInsightStability,
  prioritizeLearningInsights,
  type LearningInsightEffectiveness,
} from '@/lib/oftpay/learningEffectiveness';
import { buildLearningInsightPatternId } from '@/lib/oftpay/learningInsightPattern';
import type { LearningImpactRecord } from '@/lib/oftpay/laudoCaseArchive';
import type { LearningInsight } from '@/lib/oftpay/learningInsights';

const DAY_MS = 86_400_000;

function makeImpactRecord(params: {
  doctorAgreement: 'agree' | 'partial' | 'disagree';
  insightsUsed: LearningImpactRecord['insightsUsed'];
  createdAt?: number;
}): LearningImpactRecord {
  return {
    createdAt: params.createdAt ?? Date.now(),
    doctorAgreement: params.doctorAgreement,
    domainsActive: ['glaucoma'],
    examTypes: ['oct_disco'],
    insightsUsed: params.insightsUsed,
  };
}

/** Fixture completa para testes de priorização (campos de recência/estabilidade obrigatórios). */
function eff(
  x: Partial<LearningInsightEffectiveness> &
    Pick<LearningInsightEffectiveness, 'insightKey' | 'type' | 'relatedExamType' | 'relatedDomain'>
): LearningInsightEffectiveness {
  return {
    totalUses: 10,
    agreeCount: 7,
    partialCount: 2,
    disagreeCount: 1,
    agreeRate: 0.7,
    partialRate: 0.2,
    disagreeRate: 0.1,
    effectivenessStatus: 'promising',
    recentUses: 6,
    recentAgreeRate: 0.67,
    recentPartialRate: 0.17,
    recentDisagreeRate: 0.17,
    intermediateUses: 9,
    intermediateAgreeRate: 0.65,
    intermediatePartialRate: 0.2,
    intermediateDisagreeRate: 0.15,
    stabilityStatus: 'stable_positive',
    ...x,
  };
}

describe('learningEffectiveness', () => {
  it('agrega corretamente por insight e calcula contagens/rates', () => {
    const records: LearningImpactRecord[] = [
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
      makeImpactRecord({
        doctorAgreement: 'partial',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
      makeImpactRecord({
        doctorAgreement: 'disagree',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
    ];

    const out = aggregateLearningImpact(records, { minVolume: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.totalUses).toBe(4);
    expect(out[0]?.agreeCount).toBe(2);
    expect(out[0]?.partialCount).toBe(1);
    expect(out[0]?.disagreeCount).toBe(1);
    expect(out[0]?.agreeRate).toBe(0.5);
    expect(out[0]?.partialRate).toBe(0.25);
    expect(out[0]?.disagreeRate).toBe(0.25);
    expect(out[0]?.recentUses).toBe(4);
    expect(out[0]?.stabilityStatus).toBeDefined();
  });

  it('classifica status em promising, mixed, weak_signal e insufficient_data', () => {
    const promising = aggregateLearningImpact(
      [
        ...Array.from({ length: 7 }).map(() =>
          makeImpactRecord({
            doctorAgreement: 'agree',
            insightsUsed: [{ type: 'success_pattern', relatedDomain: 'retina' }],
          })
        ),
        makeImpactRecord({
          doctorAgreement: 'partial',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'retina' }],
        }),
      ],
      { minVolume: 5 }
    );

    const mixed = aggregateLearningImpact(
      [
        ...Array.from({ length: 3 }).map(() =>
          makeImpactRecord({
            doctorAgreement: 'agree',
            insightsUsed: [{ type: 'uncertainty_pattern', relatedDomain: 'cornea' }],
          })
        ),
        ...Array.from({ length: 3 }).map(() =>
          makeImpactRecord({
            doctorAgreement: 'partial',
            insightsUsed: [{ type: 'uncertainty_pattern', relatedDomain: 'cornea' }],
          })
        ),
      ],
      { minVolume: 5 }
    );

    const weak = aggregateLearningImpact(
      [
        ...Array.from({ length: 5 }).map(() =>
          makeImpactRecord({
            doctorAgreement: 'disagree',
            insightsUsed: [{ type: 'error_pattern', relatedExamType: 'campimetria' }],
          })
        ),
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'error_pattern', relatedExamType: 'campimetria' }],
        }),
      ],
      { minVolume: 5 }
    );

    const insufficient = aggregateLearningImpact(
      [
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
        }),
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
        }),
      ],
      { minVolume: 5 }
    );

    expect(promising[0]?.effectivenessStatus).toBe('promising');
    expect(mixed[0]?.effectivenessStatus).toBe('mixed');
    expect(weak[0]?.effectivenessStatus).toBe('weak_signal');
    expect(insufficient[0]?.effectivenessStatus).toBe('insufficient_data');
  });

  it('aplica filtros opcionais por domínio, tipo de exame e tipo de insight', () => {
    const records: LearningImpactRecord[] = [
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [
          { type: 'success_pattern', relatedDomain: 'glaucoma', relatedExamType: 'oct_disco' },
          { type: 'error_pattern', relatedDomain: 'retina', relatedExamType: 'retinografia' },
        ],
      }),
    ];

    const byDomain = aggregateLearningImpact(records, {
      filters: { relatedDomain: 'glaucoma' },
      minVolume: 1,
    });
    const byExamType = aggregateLearningImpact(records, {
      filters: { relatedExamType: 'retinografia' },
      minVolume: 1,
    });
    const byType = aggregateLearningImpact(records, {
      filters: { insightType: 'success_pattern' },
      minVolume: 1,
    });

    expect(byDomain).toHaveLength(1);
    expect(byDomain[0]?.relatedDomain).toBe('glaucoma');
    expect(byExamType).toHaveLength(1);
    expect(byExamType[0]?.relatedExamType).toBe('retinografia');
    expect(byType).toHaveLength(1);
    expect(byType[0]?.type).toBe('success_pattern');
  });

  it('mantém anonimização: saída não expõe campos livres do input', () => {
    const dirtyRecord = {
      ...makeImpactRecord({
        doctorAgreement: 'partial',
        insightsUsed: [{ type: 'uncertainty_pattern', relatedDomain: 'glaucoma' }],
      }),
      doctorComment: 'texto sensível',
      patientName: 'Paciente X',
    } as unknown as LearningImpactRecord;

    const out = aggregateLearningImpact([dirtyRecord], { minVolume: 1 });
    const row = out[0] as unknown as Record<string, unknown>;
    expect(row.doctorComment).toBeUndefined();
    expect(row.patientName).toBeUndefined();
  });

  it('gera resumo estruturado para revisão interna', () => {
    const records: LearningImpactRecord[] = [
      ...Array.from({ length: 6 }).map(() =>
        makeImpactRecord({
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'retina' }],
        })
      ),
      ...Array.from({ length: 6 }).map(() =>
        makeImpactRecord({
          doctorAgreement: 'disagree',
          insightsUsed: [{ type: 'error_pattern', relatedExamType: 'campimetria' }],
        })
      ),
    ];

    const effectiveness = aggregateLearningImpact(records, { minVolume: 5 });
    const summary = buildLearningEffectivenessSummary(effectiveness, 2);
    expect(summary.totalInsights).toBeGreaterThan(0);
    expect(summary.promisingCount).toBeGreaterThanOrEqual(1);
    expect(summary.weakSignalCount).toBeGreaterThanOrEqual(1);
    expect(summary.notes.length).toBeGreaterThan(0);
  });

  it('prioriza insight promising acima de weak_signal quando ambos são relevantes', () => {
    const insights: LearningInsight[] = [
      {
        type: 'error_pattern',
        relatedExamType: 'campimetria',
        condition: 'c1',
        recommendation: 'r1',
      },
      {
        type: 'success_pattern',
        relatedDomain: 'glaucoma',
        condition: 'c2',
        recommendation: 'r2',
      },
    ];
    const effectiveness = [
      eff({
        insightKey: 'error_pattern::campimetria::all_domains',
        type: 'error_pattern',
        relatedExamType: 'campimetria',
        relatedDomain: null,
        totalUses: 8,
        agreeCount: 1,
        partialCount: 1,
        disagreeCount: 6,
        agreeRate: 0.125,
        partialRate: 0.125,
        disagreeRate: 0.75,
        effectivenessStatus: 'weak_signal',
        recentUses: 8,
        recentAgreeRate: 0.125,
        recentPartialRate: 0.125,
        recentDisagreeRate: 0.75,
        intermediateUses: 8,
        intermediateAgreeRate: 0.125,
        intermediatePartialRate: 0.125,
        intermediateDisagreeRate: 0.75,
        stabilityStatus: 'volatile',
      }),
      eff({
        insightKey: 'success_pattern::all_exam_types::glaucoma',
        type: 'success_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        totalUses: 10,
        agreeCount: 7,
        partialCount: 2,
        disagreeCount: 1,
        agreeRate: 0.7,
        partialRate: 0.2,
        disagreeRate: 0.1,
        effectivenessStatus: 'promising',
      }),
    ];

    const ordered = prioritizeLearningInsights({
      insights,
      effectiveness,
      context: { currentExamTypes: ['campimetria'], currentDomains: ['glaucoma'], maxInsights: 5 },
    });
    expect(ordered[0]?.type).toBe('success_pattern');
  });

  it('insight insufficient_data não domina quando há sinais mais fortes', () => {
    const insights: LearningInsight[] = [
      {
        type: 'success_pattern',
        relatedDomain: 'retina',
        condition: 'prom',
        recommendation: 'prom',
      },
      {
        type: 'uncertainty_pattern',
        relatedDomain: 'retina',
        condition: 'ins',
        recommendation: 'ins',
      },
      {
        type: 'error_pattern',
        relatedDomain: 'retina',
        condition: 'mix',
        recommendation: 'mix',
      },
    ];

    const effectiveness = [
      eff({
        insightKey: 'success_pattern::all_exam_types::retina',
        type: 'success_pattern',
        relatedExamType: null,
        relatedDomain: 'retina',
        totalUses: 10,
        agreeCount: 8,
        partialCount: 1,
        disagreeCount: 1,
        agreeRate: 0.8,
        partialRate: 0.1,
        disagreeRate: 0.1,
        effectivenessStatus: 'promising',
      }),
      eff({
        insightKey: 'uncertainty_pattern::all_exam_types::retina',
        type: 'uncertainty_pattern',
        relatedExamType: null,
        relatedDomain: 'retina',
        totalUses: 2,
        agreeCount: 1,
        partialCount: 1,
        disagreeCount: 0,
        agreeRate: 0.5,
        partialRate: 0.5,
        disagreeRate: 0,
        effectivenessStatus: 'insufficient_data',
        recentUses: 2,
        recentAgreeRate: 0.5,
        recentPartialRate: 0.5,
        recentDisagreeRate: 0,
        intermediateUses: 2,
        intermediateAgreeRate: 0.5,
        intermediatePartialRate: 0.5,
        intermediateDisagreeRate: 0,
        stabilityStatus: 'insufficient_recent_data',
      }),
      eff({
        insightKey: 'error_pattern::all_exam_types::retina',
        type: 'error_pattern',
        relatedExamType: null,
        relatedDomain: 'retina',
        totalUses: 8,
        agreeCount: 3,
        partialCount: 3,
        disagreeCount: 2,
        agreeRate: 0.375,
        partialRate: 0.375,
        disagreeRate: 0.25,
        effectivenessStatus: 'mixed',
        stabilityStatus: 'volatile',
      }),
    ];

    const ordered = prioritizeLearningInsights({
      insights,
      effectiveness,
      context: { currentDomains: ['retina'], maxInsights: 2 },
    });
    expect(ordered).toHaveLength(2);
    expect(ordered.some((x) => x.type === 'success_pattern')).toBe(true);
    expect(ordered[0]?.type).not.toBe('uncertainty_pattern');
  });

  it('insight mixed segue elegível quando muito relevante ao caso', () => {
    const insights: LearningInsight[] = [
      {
        type: 'error_pattern',
        relatedExamType: 'oct_macula',
        condition: 'mixed',
        recommendation: 'mixed',
      },
    ];
    const effectiveness = [
      eff({
        insightKey: 'error_pattern::oct_macula::all_domains',
        type: 'error_pattern',
        relatedExamType: 'oct_macula',
        relatedDomain: null,
        totalUses: 9,
        agreeCount: 4,
        partialCount: 3,
        disagreeCount: 2,
        agreeRate: 0.444,
        partialRate: 0.333,
        disagreeRate: 0.222,
        effectivenessStatus: 'mixed',
        stabilityStatus: 'stable_positive',
      }),
    ];
    const ordered = prioritizeLearningInsights({
      insights,
      effectiveness,
      context: { currentExamTypes: ['oct_macula'], maxInsights: 5 },
    });
    expect(ordered).toHaveLength(1);
    expect(ordered[0]?.relatedExamType).toBe('oct_macula');
  });

  it('fallback funciona sem effectiveness (mantém ordem original com limite)', () => {
    const insights: LearningInsight[] = [
      { type: 'success_pattern', condition: '1', recommendation: '1' },
      { type: 'error_pattern', condition: '2', recommendation: '2' },
      { type: 'uncertainty_pattern', condition: '3', recommendation: '3' },
    ];
    const ordered = prioritizeLearningInsights({
      insights,
      effectiveness: [],
      context: { maxInsights: 2 },
    });
    expect(ordered).toHaveLength(2);
    expect(ordered[0]?.condition).toBe('1');
    expect(ordered[1]?.condition).toBe('2');
  });

  it('buildAdaptiveLearningContext respeita limite e ordem final', () => {
    const insights: LearningInsight[] = [
      { type: 'success_pattern', relatedDomain: 'glaucoma', condition: 'a', recommendation: 'A' },
      { type: 'error_pattern', relatedDomain: 'glaucoma', condition: 'b', recommendation: 'B' },
      { type: 'uncertainty_pattern', relatedDomain: 'glaucoma', condition: 'c', recommendation: 'C' },
    ];
    const effectiveness = [
      eff({
        insightKey: 'success_pattern::all_exam_types::glaucoma',
        type: 'success_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        totalUses: 10,
        agreeCount: 8,
        partialCount: 1,
        disagreeCount: 1,
        agreeRate: 0.8,
        partialRate: 0.1,
        disagreeRate: 0.1,
        effectivenessStatus: 'promising',
      }),
      eff({
        insightKey: 'error_pattern::all_exam_types::glaucoma',
        type: 'error_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        totalUses: 9,
        agreeCount: 1,
        partialCount: 2,
        disagreeCount: 6,
        agreeRate: 0.111,
        partialRate: 0.222,
        disagreeRate: 0.667,
        effectivenessStatus: 'weak_signal',
        stabilityStatus: 'volatile',
      }),
      eff({
        insightKey: 'uncertainty_pattern::all_exam_types::glaucoma',
        type: 'uncertainty_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        totalUses: 2,
        agreeCount: 1,
        partialCount: 1,
        disagreeCount: 0,
        agreeRate: 0.5,
        partialRate: 0.5,
        disagreeRate: 0,
        effectivenessStatus: 'insufficient_data',
        recentUses: 2,
        recentAgreeRate: 0.5,
        recentPartialRate: 0.5,
        recentDisagreeRate: 0,
        intermediateUses: 2,
        intermediateAgreeRate: 0.5,
        intermediatePartialRate: 0.5,
        intermediateDisagreeRate: 0,
        stabilityStatus: 'insufficient_recent_data',
      }),
    ];
    const out = buildAdaptiveLearningContext({
      insights,
      effectiveness,
      context: { currentDomains: ['glaucoma'], maxInsights: 2 },
    });
    expect(out.learningInsightsApplied).toHaveLength(2);
    expect(out.learningInsightsApplied[0]?.type).toBe('success_pattern');
    expect(out.learningInsightsApplied[0]?.stability?.status).toBe('stable_positive');
    expect(out.learningContext.split('\n').filter((l) => l.startsWith('- ')).length).toBeLessThanOrEqual(
      2
    );
  });

  it('evaluateLearningInsightStability: estável positivo com recência consistente', () => {
    const status = evaluateLearningInsightStability({
      allUses: 20,
      agreeRate: 0.65,
      partialRate: 0.2,
      disagreeRate: 0.15,
      recent: { uses: 8, agreeCount: 5, partialCount: 2, disagreeCount: 1 },
      intermediate: { uses: 15, agreeCount: 9, partialCount: 4, disagreeCount: 2 },
    });
    expect(status).toBe('stable_positive');
  });

  it('evaluateLearningInsightStability: enfraquecimento recente vs histórico', () => {
    const status = evaluateLearningInsightStability({
      allUses: 12,
      agreeRate: 0.67,
      partialRate: 0.17,
      disagreeRate: 0.17,
      recent: { uses: 5, agreeCount: 0, partialCount: 0, disagreeCount: 5 },
      intermediate: { uses: 10, agreeCount: 6, partialCount: 2, disagreeCount: 2 },
    });
    expect(status).toBe('recently_weakening');
  });

  it('evaluateLearningInsightStability: melhora recente em relação ao histórico', () => {
    const status = evaluateLearningInsightStability({
      allUses: 14,
      agreeRate: 0.5,
      partialRate: 0.35,
      disagreeRate: 0.15,
      recent: { uses: 6, agreeCount: 5, partialCount: 1, disagreeCount: 0 },
      intermediate: { uses: 6, agreeCount: 2, partialCount: 3, disagreeCount: 1 },
    });
    expect(status).toBe('recently_improving');
  });

  it('evaluateLearningInsightStability: volume recente insuficiente', () => {
    const status = evaluateLearningInsightStability({
      allUses: 20,
      agreeRate: 0.8,
      partialRate: 0.1,
      disagreeRate: 0.1,
      recent: { uses: 2, agreeCount: 2, partialCount: 0, disagreeCount: 0 },
      intermediate: { uses: 8, agreeCount: 6, partialCount: 1, disagreeCount: 1 },
    });
    expect(status).toBe('insufficient_recent_data');
  });

  it('evaluateLearningInsightStability: recentUses abaixo do mínimo forte cai em insufficient_recent_data', () => {
    const status = evaluateLearningInsightStability({
      allUses: 30,
      agreeRate: 0.7,
      partialRate: 0.15,
      disagreeRate: 0.15,
      recent: { uses: 4, agreeCount: 4, partialCount: 0, disagreeCount: 0 },
      intermediate: { uses: 20, agreeCount: 14, partialCount: 4, disagreeCount: 2 },
    });
    expect(status).toBe('insufficient_recent_data');
  });

  it('aggregateLearningImpact unifica registros com mesmo patternId e stableKeys distintos', () => {
    const pid = buildLearningInsightPatternId({
      type: 'error_pattern',
      relatedExamType: null,
      relatedDomain: null,
      condition: 'review e discordância em série.',
    });
    const records: LearningImpactRecord[] = [
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [
          {
            type: 'error_pattern',
            patternId: pid,
            stableKey: 'sk-diferente-1',
          },
        ],
      }),
      makeImpactRecord({
        doctorAgreement: 'disagree',
        insightsUsed: [
          {
            type: 'error_pattern',
            patternId: pid,
            stableKey: 'sk-diferente-2',
          },
        ],
      }),
    ];
    const out = aggregateLearningImpact(records, { minVolume: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.insightKey).toBe(pid);
    expect(out[0]?.totalUses).toBe(2);
  });

  it('aggregateLearningImpact agrupa registros legados sem stableKey pela chave legada', () => {
    const records: LearningImpactRecord[] = [
      makeImpactRecord({
        doctorAgreement: 'agree',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
      makeImpactRecord({
        doctorAgreement: 'partial',
        insightsUsed: [{ type: 'success_pattern', relatedDomain: 'glaucoma' }],
      }),
    ];
    const out = aggregateLearningImpact(records, { minVolume: 1 });
    expect(out).toHaveLength(1);
    expect(out[0]?.insightKey).toBe('success_pattern::all_exam_types::glaucoma');
  });

  it('aggregateLearningImpact incorpora janelas 30/90d e estabilidade', () => {
    const nowMs = 1_700_000_000_000;
    const records: LearningImpactRecord[] = [
      ...Array.from({ length: 8 }).map(() =>
        makeImpactRecord({
          createdAt: nowMs - 45 * DAY_MS,
          doctorAgreement: 'agree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'retina' }],
        })
      ),
      ...Array.from({ length: 5 }).map(() =>
        makeImpactRecord({
          createdAt: nowMs - 10 * DAY_MS,
          doctorAgreement: 'disagree',
          insightsUsed: [{ type: 'success_pattern', relatedDomain: 'retina' }],
        })
      ),
    ];
    const out = aggregateLearningImpact(records, { minVolume: 5, nowMs });
    expect(out[0]?.recentUses).toBe(5);
    expect(out[0]?.intermediateUses).toBe(13);
    expect(out[0]?.stabilityStatus).toBe('recently_weakening');
  });

  it('priorização favorece promising estável sobre promising com recência insuficiente', () => {
    const insights: LearningInsight[] = [
      {
        type: 'uncertainty_pattern',
        relatedDomain: 'glaucoma',
        condition: 'b',
        recommendation: 'B',
      },
      {
        type: 'success_pattern',
        relatedDomain: 'glaucoma',
        condition: 'a',
        recommendation: 'A',
      },
    ];
    const effectiveness = [
      eff({
        insightKey: 'success_pattern::all_exam_types::glaucoma',
        type: 'success_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        effectivenessStatus: 'promising',
        agreeRate: 0.72,
        disagreeRate: 0.1,
        stabilityStatus: 'stable_positive',
      }),
      eff({
        insightKey: 'uncertainty_pattern::all_exam_types::glaucoma',
        type: 'uncertainty_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
        effectivenessStatus: 'promising',
        agreeRate: 0.72,
        disagreeRate: 0.08,
        recentUses: 2,
        recentAgreeRate: 1,
        recentPartialRate: 0,
        recentDisagreeRate: 0,
        intermediateUses: 4,
        intermediateAgreeRate: 0.75,
        intermediatePartialRate: 0.25,
        intermediateDisagreeRate: 0,
        stabilityStatus: 'insufficient_recent_data',
      }),
    ];

    const ordered = prioritizeLearningInsights({
      insights,
      effectiveness,
      context: { currentDomains: ['glaucoma'], maxInsights: 2 },
    });
    expect(ordered[0]?.type).toBe('success_pattern');
    expect(ordered[1]?.type).toBe('uncertainty_pattern');
  });

  it('fallback: sem effectiveness mantém seleção simples', () => {
    const insights: LearningInsight[] = [
      { type: 'success_pattern', relatedDomain: 'cornea', condition: 'x', recommendation: 'X' },
    ];
    expect(
      prioritizeLearningInsights({ insights, effectiveness: [], context: { maxInsights: 3 } })
    ).toHaveLength(1);
  });
});

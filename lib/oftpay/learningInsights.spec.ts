import { describe, expect, it } from 'vitest';
import {
  analyzeLearningPatterns,
  assignStableKeysToInsights,
  buildLearningContext,
} from '@/lib/oftpay/learningInsights';
import type { LaudoLearningRecord } from '@/lib/oftpay/laudoCaseArchive';

function makeRecord(overrides: Partial<LaudoLearningRecord> = {}): LaudoLearningRecord {
  return {
    createdAt: Date.now(),
    examTypes: ['campimetria'],
    domainsActive: ['glaucoma'],
    primaryDomain: 'glaucoma',
    clinicalPriorityLevel: 'attention',
    doctorAgreement: 'agree',
    qualityFlags: [],
    reviewStatus: 'ok',
    checklistStatus: 'good',
    hasRefinement: false,
    hasDelta: false,
    hasAmbiguity: false,
    hasDomainConflict: false,
    longitudinalStatus: { glaucoma: null, retina: null, cornea: null },
    ...overrides,
  };
}

describe('learningInsights', () => {
  it('gera insights coerentes para baixa confiabilidade e ambiguidade multdomínio', () => {
    const records: LaudoLearningRecord[] = [
      ...Array.from({ length: 8 }).map(() =>
        makeRecord({
          doctorAgreement: 'disagree',
          reviewStatus: 'review',
          qualityFlags: ['possible_ocr_issue'],
          domainsActive: ['glaucoma', 'retina'],
          hasAmbiguity: true,
          hasDomainConflict: true,
        })
      ),
      ...Array.from({ length: 4 }).map(() =>
        makeRecord({
          doctorAgreement: 'partial',
          reviewStatus: 'attention',
          domainsActive: ['glaucoma', 'retina'],
          hasAmbiguity: true,
        })
      ),
    ];
    const insights = analyzeLearningPatterns(records);
    expect(insights.length).toBeGreaterThan(0);
    expect(
      insights.some((i) => /baixa confiabilidade|reviewStatus=review|múltiplos domínios/i.test(i.condition))
    ).toBe(true);
  });

  it('assignStableKeysToInsights preserva chave quando só recommendation muda', () => {
    const withKeys = assignStableKeysToInsights([
      {
        type: 'success_pattern',
        relatedDomain: 'retina',
        condition: 'Eixo retina estável.',
        recommendation: 'Versão A de texto',
      },
      {
        type: 'success_pattern',
        relatedDomain: 'retina',
        condition: 'Eixo retina estável.',
        recommendation: 'Versão B totalmente diferente',
      },
    ]);
    expect(withKeys[0]?.stableKey).toBe(withKeys[1]?.stableKey);
    expect(withKeys[0]?.stableKey).toMatch(/^sk1:success_pattern\|/);
    expect(withKeys[0]?.patternId).toBe(withKeys[1]?.patternId);
    expect(withKeys[0]?.patternId).toMatch(/^pid1:success_pattern\|/);
  });

  it('limita contexto ao máximo de insights definido', () => {
    const insights = Array.from({ length: 10 }).map((_, idx) => ({
      type: 'uncertainty_pattern' as const,
      condition: `c-${idx}`,
      recommendation: `r-${idx}`,
    }));
    const text = buildLearningContext(insights, 5);
    expect(text.split('\n').filter((l) => l.startsWith('- ')).length).toBe(5);
  });
});

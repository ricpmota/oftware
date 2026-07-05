import { describe, expect, it } from 'vitest';
import {
  buildLearningInsightPatternId,
  categorizeLearningInsightCondition,
} from '@/lib/oftpay/learningInsightPattern';

describe('learningInsightPattern', () => {
  it('formulações diferentes na mesma família clínica geram o mesmo patternId', () => {
    const a = buildLearningInsightPatternId({
      type: 'error_pattern',
      relatedExamType: null,
      relatedDomain: null,
      condition: 'Casos com reviewStatus=review mostram maior discordância médica.',
    });
    const b = buildLearningInsightPatternId({
      type: 'error_pattern',
      relatedExamType: null,
      relatedDomain: null,
      condition: 'Há review e discordância elevada nos casos analisados.',
    });
    expect(a).toBe(b);
    expect(a).toContain('review_status_disagree');
  });

  it('categoriza família de baixa confiabilidade de campo visual de formas distintas', () => {
    expect(
      categorizeLearningInsightCondition('Campimetria com baixa confiabilidade de fixação.')
    ).toBe('vf_low_reliability');
    expect(
      categorizeLearningInsightCondition('O campo visual perimetrico mostrou-se pouco confiável.')
    ).toBe('vf_low_reliability');
    expect(
      buildLearningInsightPatternId({
        type: 'uncertainty_pattern',
        relatedExamType: 'campimetria',
        relatedDomain: 'glaucoma',
        condition: 'Campimetria com baixa confiabilidade de fixação.',
      })
    ).toBe(
      buildLearningInsightPatternId({
        type: 'uncertainty_pattern',
        relatedExamType: 'campimetria',
        relatedDomain: 'glaucoma',
        condition: 'Perimetria limitada por confiabilidade.',
      })
    );
  });

  it('categoria unclassified ainda produz patternId estável por tipo/exame/domínio', () => {
    const id = buildLearningInsightPatternId({
      type: 'success_pattern',
      relatedExamType: 'oct_macula',
      relatedDomain: 'retina',
      condition: 'Texto totalmente novo sem regra específica.',
    });
    expect(id).toContain('|unclassified');
    expect(id).toMatch(/^pid1:success_pattern\|oct_macula\|retina\|/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildLegacyLearningInsightGroupingKey,
  buildStableLearningInsightKey,
  normalizeLearningInsightCondition,
} from '@/lib/oftpay/learningInsightKeys';

describe('learningInsightKeys', () => {
  it('mesma lógica clínica com recomendação diferente mantém a mesma chave estável', () => {
    const a = buildStableLearningInsightKey({
      type: 'error_pattern',
      relatedExamType: 'campimetria',
      relatedDomain: null,
      condition: '  Taxa ALTA de discordância!!!  ',
    });
    const b = buildStableLearningInsightKey({
      type: 'error_pattern',
      relatedExamType: 'campimetria',
      relatedDomain: null,
      condition: 'taxa alta de discordância',
    });
    expect(a).toBe(b);
    expect(a).toMatch(/^sk1:error_pattern\|campimetria\|/);
  });

  it('normalização de condition remove ruído superficial', () => {
    expect(normalizeLearningInsightCondition('A  &  B \n C')).toBe('a b c');
  });

  it('chave legada permanece estável para compatibilidade', () => {
    expect(
      buildLegacyLearningInsightGroupingKey({
        type: 'success_pattern',
        relatedExamType: null,
        relatedDomain: 'glaucoma',
      })
    ).toBe('success_pattern::all_exam_types::glaucoma');
  });
});

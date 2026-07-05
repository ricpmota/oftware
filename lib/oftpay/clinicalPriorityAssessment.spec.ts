import { describe, expect, it } from 'vitest';
import { buildClinicalPriorityAssessment } from '@/lib/oftpay/clinicalPriorityAssessment';

describe('buildClinicalPriorityAssessment', () => {
  it('classifica como routine', () => {
    const out = buildClinicalPriorityAssessment({
      qualityContext: 'status_revisao: ok | checklist_status: good',
      binocularContext: '',
      temporalContext: 'status: stable',
      followUpAnswers: [],
    });
    expect(out.level).toBe('routine');
  });

  it('classifica como attention', () => {
    const out = buildClinicalPriorityAssessment({
      qualityContext: 'status_revisao: attention | checklist_status: partial',
      binocularContext: 'status: mild_asymmetry',
      temporalContext: 'status: stable',
      followUpAnswers: [{ questionId: 'q1', answer: 'Sintoma leve unilateral.' }],
    });
    expect(out.level).toBe('attention');
  });

  it('classifica como priority', () => {
    const out = buildClinicalPriorityAssessment({
      qualityContext: 'status_revisao: attention | checklist_status: good',
      binocularContext: 'status: marked_asymmetry',
      temporalContext: 'status: possible_progression',
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual recente.' }],
    });
    expect(out.level).toBe('priority');
  });

  it('classifica como indeterminate quando qualidade é fraca', () => {
    const out = buildClinicalPriorityAssessment({
      qualityContext:
        'status_revisao: review | checklist_status: weak | flags: possible_ocr_issue, limited_interpretability',
      binocularContext: '',
      temporalContext: '',
      followUpAnswers: [],
    });
    expect(out.level).toBe('indeterminate');
  });
});

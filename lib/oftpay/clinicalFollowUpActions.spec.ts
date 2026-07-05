import { describe, expect, it } from 'vitest';
import { buildClinicalFollowUpActions } from '@/lib/oftpay/clinicalFollowUpActions';

describe('buildClinicalFollowUpActions', () => {
  it('gera ações coerentes para rotina', () => {
    const out = buildClinicalFollowUpActions({
      clinicalPriorityAssessment: {
        level: 'routine',
        label: 'Rotina',
        summary: 'Sugestão de rotina.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      temporalContext: 'status: stable',
      extractions: [{ examType: 'oct_disco' }],
    });
    const texts = out.actions.map((a) => a.text).join(' ');
    expect(out.actions.length).toBeGreaterThanOrEqual(3);
    expect(texts).toMatch(/acompanhamento|estabilidade|comparação/i);
  });

  it('gera ações coerentes para atenção', () => {
    const out = buildClinicalFollowUpActions({
      clinicalPriorityAssessment: {
        level: 'attention',
        label: 'Atenção',
        summary: 'Sugestão de atenção.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      binocularContext: 'status: mild_asymmetry',
      extractions: [{ examType: 'retinografia' }],
    });
    const texts = out.actions.map((a) => a.text).join(' ');
    expect(out.actions.length).toBeGreaterThanOrEqual(3);
    expect(texts).toMatch(/revisão clínica|correlacionar|retina/i);
  });

  it('gera ações coerentes para prioritário', () => {
    const out = buildClinicalFollowUpActions({
      clinicalPriorityAssessment: {
        level: 'priority',
        label: 'Prioritário',
        summary: 'Sugestão de prioridade.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      temporalContext: 'status: possible_progression',
      extractions: [{ examType: 'campimetria' }],
    });
    const texts = out.actions.map((a) => a.text).join(' ');
    expect(texts).toMatch(/curto prazo|PIO|progressão/i);
  });

  it('gera ações coerentes para indeterminado', () => {
    const out = buildClinicalFollowUpActions({
      clinicalPriorityAssessment: {
        level: 'indeterminate',
        label: 'Indeterminado',
        summary: 'Indeterminado.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      qualityContext: 'status_revisao: review | checklist_status: weak',
      extractions: [{ examType: 'topografia' }],
    });
    const texts = out.actions.map((a) => a.text).join(' ');
    expect(texts).toMatch(/repetição|qualidade|incerteza/i);
  });

  it('adapta por modalidade e limita em até 5 ações', () => {
    const out = buildClinicalFollowUpActions({
      clinicalPriorityAssessment: {
        level: 'attention',
        label: 'Atenção',
        summary: 'Sugestão de atenção.',
        mainReasons: [],
        recommendedAction: '',
        limitations: [],
      },
      qualityContext: 'status_revisao: review | checklist_status: weak | possible_ocr_issue',
      temporalContext: 'status: possible_progression',
      binocularContext: 'status: marked_asymmetry',
      followUpAnswers: [{ questionId: 'q1', answer: 'Sintoma visual progressivo.' }],
      extractions: [{ examType: 'microscopia' }],
    });
    const texts = out.actions.map((a) => a.text).join(' ');
    expect(out.actions.length).toBeLessThanOrEqual(5);
    expect(texts).toMatch(/quadro corneano|planejamento cirúrgico/i);
  });
});

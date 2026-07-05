import { describe, expect, it } from 'vitest';
import { buildClinicalPriorityExplainability } from '@/lib/oftpay/clinicalPriorityExplainability';

describe('buildClinicalPriorityExplainability', () => {
  it('destaca temporalidade e assimetria elevando prioridade', () => {
    const out = buildClinicalPriorityExplainability({
      qualityContext: 'status_revisao: attention | checklist_status: partial',
      temporalContext: 'status: possible_progression',
      binocularContext: 'status: marked_asymmetry',
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora clínica recente.' }],
    });
    expect(out.increasedPriorityFactors.join(' ')).toMatch(/progressão|assimetria/i);
    expect(out.topDrivers.length).toBeGreaterThan(0);
  });

  it('aponta estabilidade quando contexto reduz preocupação', () => {
    const out = buildClinicalPriorityExplainability({
      qualityContext: 'status_revisao: ok | checklist_status: good',
      temporalContext: 'status: stable',
      binocularContext: 'status: symmetric',
      followUpAnswers: [],
      clinicalPriorityAssessment: {
        level: 'routine',
        label: 'Rotina',
        summary: 'Sugestão de rotina.',
        mainReasons: [],
        recommendedAction: 'Acompanhamento.',
        limitations: [],
      },
    });
    expect(out.reducedPriorityFactors.length).toBeGreaterThan(0);
  });

  it('marca incerteza quando qualidade é limitada', () => {
    const out = buildClinicalPriorityExplainability({
      qualityContext: 'status_revisao: review | possible_ocr_issue | checklist_status: weak',
      temporalContext: 'status: insufficient_data',
      binocularContext: '',
      followUpAnswers: [],
    });
    expect(out.uncertaintyFactors.length).toBeGreaterThan(0);
  });
});

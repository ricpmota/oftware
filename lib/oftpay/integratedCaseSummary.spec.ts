import { describe, expect, it } from 'vitest';
import {
  buildIntegratedCaseSummary,
  hasMeaningfulIntegratedSummary,
} from '@/lib/oftpay/integratedCaseSummary';

describe('buildIntegratedCaseSummary', () => {
  it('gera síntese curta com fatores e incertezas', () => {
    const summary = buildIntegratedCaseSummary({
      analysisAnswer: `
- Achado compatível com dano glaucomatoso em OD.
- Correlacionar com pressão intraocular e histórico.
## Limitações e sinais de alerta
- Cobertura parcial dos campos.
      `,
      qualityContext: 'status_revisao: attention | checklist_status: partial',
      binocularContext: 'status: mild_asymmetry',
      temporalContext: 'status: possible_progression',
      followUpAnswers: [{ questionId: 'q1', question: 'Q1', answer: 'Tem histórico familiar.' }],
    });

    expect(summary.headline.length).toBeGreaterThan(0);
    expect(summary.mostRelevantFactors.length).toBeGreaterThan(0);
    expect(summary.recommendedNextSteps.length).toBeGreaterThan(0);
    expect(summary.basedOn.length).toBeGreaterThan(0);
    expect(hasMeaningfulIntegratedSummary(summary)).toBe(true);
  });
});

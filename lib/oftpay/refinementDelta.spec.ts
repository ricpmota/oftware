import { describe, expect, it } from 'vitest';
import {
  buildRefinementDelta,
  hasMeaningfulRefinementDelta,
} from '@/lib/oftpay/refinementDelta';

describe('buildRefinementDelta', () => {
  it('gera resumo com mudanças e limitações', () => {
    const delta = buildRefinementDelta({
      initialAnswer: `
- Suspeita de dano glaucomatoso inicial.
- Correlacionar com pressão intraocular.
## Limitações e sinais de alerta
- Exame com confiabilidade parcial.
      `,
      refinedAnswer: `
- Compatibilidade maior com dano glaucomatoso em OD.
- Assimetria binocular mais evidente em OD.
- Correlacionar com pressão intraocular.
## Limitações e sinais de alerta
- Persistem limitações por cobertura parcial.
      `,
      answersUsed: [{ questionId: 'q1', question: 'Q1', answer: 'Paciente com história familiar.' }],
    });

    expect(delta.summary).toMatch(/resposta\(s\) clínica\(s\)/i);
    expect(delta.keyChanges.length).toBeGreaterThan(0);
    expect(delta.remainingLimitations.length).toBeGreaterThan(0);
    expect(hasMeaningfulRefinementDelta(delta)).toBe(true);
  });

  it('retorna false para delta vazio', () => {
    expect(hasMeaningfulRefinementDelta(null)).toBe(false);
  });
});

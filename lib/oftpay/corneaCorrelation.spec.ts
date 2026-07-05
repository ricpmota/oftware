import { describe, expect, it } from 'vitest';
import { buildCorneaCorrelation } from '@/lib/oftpay/corneaCorrelation';

describe('buildCorneaCorrelation', () => {
  it('classifica topografia + galilei como coerentes', () => {
    const out = buildCorneaCorrelation({
      extractions: [
        {
          examType: 'topografia',
          eye: 'od',
          data: { camposEstruturados: { km: '48.2', k2: '49.1', astigmatismo: '2.8' } },
        },
        {
          examType: 'galilei',
          eye: 'od',
          data: { camposEstruturados: { elevacao_posterior: '27', indices_ectasia: 'alterado' } },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Piora visual recente e coça os olhos.' }],
    });
    expect(out.isApplicable).toBe(true);
    expect(out.cornealStructuralCorrelation).toBe('coherent');
  });

  it('usa paquimetria para reforçar suspeita estrutural', () => {
    const out = buildCorneaCorrelation({
      extractions: [
        {
          examType: 'paquimetria',
          eye: 'oe',
          data: { camposEstruturados: { espessura_central: '488', menor_espessura: '475' } },
        },
      ],
    });
    expect(out.mainCornealFinding).toMatch(/Paquimetria/i);
    expect(out.mainFindings.join(' ')).toMatch(/Paquimetria/i);
  });

  it('aproveita assimetria interocular relevante', () => {
    const out = buildCorneaCorrelation({
      extractions: [{ examType: 'topografia', eye: 'od', data: { camposEstruturados: { km: '48.5' } } }],
      binocularContext:
        '- Modalidade: Topografia | status: marked_asymmetry (Assimetria relevante) | resumo: ...',
    });
    expect(out.interEyeCornealAsymmetry).toMatch(/Assimetria interocular marcada/i);
  });

  it('integra temporalidade corneana quando disponível', () => {
    const out = buildCorneaCorrelation({
      extractions: [{ examType: 'galilei', eye: 'od', data: { camposEstruturados: {} } }],
      temporalContext:
        '- Modalidade: Galilei | Olho: OD | status: possible_progression (Possível progressão)',
    });
    expect(out.progressionSignals.length).toBeGreaterThan(0);
  });
});

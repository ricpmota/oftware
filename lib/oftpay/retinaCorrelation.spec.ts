import { describe, expect, it } from 'vitest';
import { buildRetinaCorrelation } from '@/lib/oftpay/retinaCorrelation';

describe('buildRetinaCorrelation', () => {
  it('correlaciona OCT Mácula com sintomas visuais de forma coerente', () => {
    const out = buildRetinaCorrelation({
      extractions: [
        {
          examType: 'oct_macula',
          eye: 'od',
          data: {
            camposEstruturados: {
              fluido_intrarretiniano: 'presente',
              cistos: 'sim',
              espessura_central: '352',
            },
          },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Baixa visual e metamorfopsia em OD.' }],
    });
    expect(out.isApplicable).toBe(true);
    expect(out.anatomicalClinicalCorrelation).toBe('coherent');
  });

  it('marca discordância quando há sintoma sem suporte imagético suficiente', () => {
    const out = buildRetinaCorrelation({
      extractions: [
        {
          examType: 'oct_macula',
          eye: 'oe',
          data: { camposEstruturados: { espessura_central: '268', fluido_intrarretiniano: 'nao' } },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Metamorfopsia importante no OE.' }],
    });
    expect(out.anatomicalClinicalCorrelation).toBe('discordant');
    expect(out.conflictsOrGaps.length).toBeGreaterThan(0);
  });

  it('usa retinografia para reforçar achado macular', () => {
    const out = buildRetinaCorrelation({
      extractions: [
        {
          examType: 'oct_macula',
          eye: 'od',
          data: { camposEstruturados: { ped: 'presente', espessura_central: '331' } },
        },
        {
          examType: 'retinografia',
          eye: 'od',
          data: { camposEstruturados: { macula: 'alterada com exsudatos', exsudatos: 'sim' } },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Baixa visual unilateral à direita.' }],
    });
    expect(out.mainFindings.join(' ')).toMatch(/Retinografia/i);
  });

  it('aproveita sinais temporais em retina/mácula', () => {
    const out = buildRetinaCorrelation({
      extractions: [{ examType: 'oct_macula', eye: 'od', data: { camposEstruturados: {} } }],
      temporalContext:
        '- Modalidade: OCT Mácula | Olho: OD | status: possible_progression (Possível progressão)',
    });
    expect(out.temporalSignals.length).toBeGreaterThan(0);
  });
});

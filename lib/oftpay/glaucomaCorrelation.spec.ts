import { describe, expect, it } from 'vitest';
import { buildGlaucomaCorrelation } from '@/lib/oftpay/glaucomaCorrelation';

describe('buildGlaucomaCorrelation', () => {
  it('correlaciona OCT Disco + Campimetria como coerente', () => {
    const out = buildGlaucomaCorrelation({
      extractions: [
        {
          examType: 'oct_disco',
          eye: 'od',
          data: { camposEstruturados: { rnfl_global: '78', escavacao: '0.68' } },
        },
        {
          examType: 'campimetria',
          eye: 'od',
          data: {
            camposEstruturados: { md: '-6.5', psd: '4.2', vfi: '82', confiabilidade: 'boa' },
          },
        },
      ],
      followUpAnswers: [{ questionId: 'q1', answer: 'Glaucoma prévio e uso de hipotensor.' }],
    });
    expect(out.isApplicable).toBe(true);
    expect(out.structureFunctionCorrelation).toBe('coherent');
  });

  it('marca discordância entre função alterada e estrutura sem suporte', () => {
    const out = buildGlaucomaCorrelation({
      extractions: [
        {
          examType: 'oct_disco',
          eye: 'oe',
          data: { camposEstruturados: { rnfl_global: '101', escavacao: '0.42' } },
        },
        {
          examType: 'campimetria',
          eye: 'oe',
          data: { camposEstruturados: { md: '-8.2', psd: '4.9', vfi: '79', confiabilidade: 'boa' } },
        },
      ],
    });
    expect(out.structureFunctionCorrelation).toBe('discordant');
    expect(out.conflictsOrGaps.length).toBeGreaterThan(0);
  });

  it('reduz força da correlação quando campimetria tem baixa confiabilidade', () => {
    const out = buildGlaucomaCorrelation({
      extractions: [
        {
          examType: 'oct_disco',
          eye: 'od',
          data: { camposEstruturados: { rnfl_global: '80', escavacao: '0.64' } },
        },
        {
          examType: 'campimetria',
          eye: 'od',
          data: {
            reviewStatus: 'review',
            qualityFlags: ['limited_interpretability'],
            camposEstruturados: {
              md: '-7',
              psd: '4.1',
              vfi: '80',
              confiabilidade: 'baixa confiabilidade',
            },
          },
        },
      ],
    });
    expect(out.structureFunctionCorrelation).toBe('partially_coherent');
    expect(out.conflictsOrGaps.join(' ')).toMatch(/confiabilidade/i);
  });

  it('aproveita temporalidade glaucomatosa quando disponível', () => {
    const out = buildGlaucomaCorrelation({
      extractions: [{ examType: 'oct_disco', eye: 'od', data: { camposEstruturados: {} } }],
      temporalContext:
        '- Modalidade: OCT Disco | Olho: OD | status: possible_progression (Possível progressão)',
    });
    expect(out.progressionSignals.length).toBeGreaterThan(0);
  });
});

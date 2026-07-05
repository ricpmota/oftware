import { describe, expect, it } from 'vitest';
import { buildDomainLongitudinalCorrelation } from '@/lib/oftpay/domainLongitudinalCorrelation';

describe('buildDomainLongitudinalCorrelation', () => {
  it('glaucoma longitudinal com estabilidade', () => {
    const out = buildDomainLongitudinalCorrelation({
      extractions: [
        {
          examType: 'oct_disco',
          eye: 'od',
          data: { dataExame: '2025-01-10', camposEstruturados: { rnfl_global: '95', escavacao: '0.45' } },
        },
        {
          examType: 'oct_disco',
          eye: 'od',
          data: { dataExame: '2026-01-10', camposEstruturados: { rnfl_global: '94', escavacao: '0.46' } },
        },
        {
          examType: 'campimetria',
          eye: 'od',
          data: { dataExame: '2025-01-10', camposEstruturados: { md: '-2.0', psd: '2.1', vfi: '95' } },
        },
        {
          examType: 'campimetria',
          eye: 'od',
          data: { dataExame: '2026-01-10', camposEstruturados: { md: '-2.1', psd: '2.0', vfi: '94' } },
        },
      ],
    });
    expect(out.glaucomaLongitudinal.isApplicable).toBe(true);
    expect(out.glaucomaLongitudinal.structuralTrend).toBe('stable');
  });

  it('glaucoma longitudinal com possível progressão', () => {
    const out = buildDomainLongitudinalCorrelation({
      extractions: [
        {
          examType: 'oct_disco',
          eye: 'oe',
          data: { dataExame: '2025-01-10', camposEstruturados: { rnfl_global: '96', escavacao: '0.40' } },
        },
        {
          examType: 'oct_disco',
          eye: 'oe',
          data: { dataExame: '2026-01-10', camposEstruturados: { rnfl_global: '82', escavacao: '0.58' } },
        },
        {
          examType: 'campimetria',
          eye: 'oe',
          data: { dataExame: '2025-01-10', camposEstruturados: { md: '-2.5', psd: '2.2', vfi: '96' } },
        },
        {
          examType: 'campimetria',
          eye: 'oe',
          data: { dataExame: '2026-01-10', camposEstruturados: { md: '-6.5', psd: '4.2', vfi: '83' } },
        },
      ],
    });
    expect(out.glaucomaLongitudinal.structuralTrend).toBe('possible_progression');
    expect(out.glaucomaLongitudinal.functionalTrend).toBe('possible_progression');
  });

  it('retina longitudinal com possível piora', () => {
    const out = buildDomainLongitudinalCorrelation({
      extractions: [
        {
          examType: 'oct_macula',
          eye: 'od',
          data: {
            dataExame: '2025-03-01',
            camposEstruturados: {
              fluido_intrarretiniano: 'ausente',
              fluido_subrretiniano: 'ausente',
              espessura_central: '220',
            },
          },
        },
        {
          examType: 'oct_macula',
          eye: 'od',
          data: {
            dataExame: '2026-03-01',
            camposEstruturados: {
              fluido_intrarretiniano: 'fluido',
              fluido_subrretiniano: 'fluido',
              espessura_central: '360',
            },
          },
        },
      ],
    });
    expect(out.retinaLongitudinal.retinaTrend).toBe('possible_progression');
  });

  it('córnea longitudinal com possível progressão estrutural', () => {
    const out = buildDomainLongitudinalCorrelation({
      extractions: [
        {
          examType: 'topografia',
          eye: 'od',
          data: {
            dataExame: '2025-04-01',
            camposEstruturados: { astigmatismo: '1.2', km: '40.0', k2: '40.0' },
          },
        },
        {
          examType: 'topografia',
          eye: 'od',
          data: {
            dataExame: '2026-04-01',
            camposEstruturados: { astigmatismo: '3.1', km: '54.0', k2: '56.0' },
          },
        },
      ],
    });
    expect(out.corneaLongitudinal.cornealTrend).toBe('possible_progression');
  });

  it('mantém tendência insuficiente quando não há série comparável', () => {
    const out = buildDomainLongitudinalCorrelation({
      extractions: [{ examType: 'topografia', eye: 'od', data: { camposEstruturados: { km: '45.1' } } }],
    });
    expect(out.corneaLongitudinal.isApplicable).toBe(true);
    expect(out.corneaLongitudinal.cornealTrend).toBe('insufficient_data');
  });
});

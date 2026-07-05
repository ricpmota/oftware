import { describe, expect, it } from 'vitest';
import {
  buildTemporalComparisons,
  getTemporalStatusLabel,
} from '@/lib/oftpay/laudoOftalmoTemporal';

describe('buildTemporalComparisons', () => {
  it('pareia por modalidade + olho e ordena por data', () => {
    const out = buildTemporalComparisons([
      {
        id: 'new',
        fileName: 'oct-od-2026.pdf',
        examType: 'oct_disco',
        eye: 'od',
        dataExame: '2026-04-21',
        camposEstruturados: { rnfl_global: '80', rnfl_superior: '82', rnfl_inferior: '78', escavacao: '0.55' },
      },
      {
        id: 'old',
        fileName: 'oct-od-2025.pdf',
        examType: 'oct_disco',
        eye: 'od',
        dataExame: '2025-04-21',
        camposEstruturados: { rnfl_global: '92', rnfl_superior: '95', rnfl_inferior: '90', escavacao: '0.40' },
      },
      {
        id: 'oe',
        fileName: 'oct-oe-2026.pdf',
        examType: 'oct_disco',
        eye: 'oe',
        dataExame: '2026-04-21',
        camposEstruturados: { rnfl_global: '90' },
      },
    ]);

    expect(out.length).toBe(1);
    expect(out[0].eye).toBe('od');
    expect(out[0].previousDate).toBe('2025-04-21');
    expect(out[0].currentDate).toBe('2026-04-21');
    expect(
      out[0].status === 'possible_progression' ||
        out[0].status === 'stable' ||
        out[0].status === 'possible_improvement'
    ).toBe(true);
    expect(getTemporalStatusLabel(out[0].status)).toBeTruthy();
  });

  it('retorna vazio quando não há par comparável', () => {
    const out = buildTemporalComparisons([
      {
        id: '1',
        fileName: 'topo-od.pdf',
        examType: 'topografia',
        eye: 'od',
        dataExame: '2026-01-01',
        camposEstruturados: { k1: '43.1' },
      },
    ]);
    expect(out).toEqual([]);
  });

  it('marca limitação quando campos comparáveis são insuficientes', () => {
    const out = buildTemporalComparisons([
      {
        id: '1',
        fileName: 'ret-2025.pdf',
        examType: 'retinografia',
        eye: 'od',
        dataExame: '2025-01-01',
        camposEstruturados: { disco_optico: null, macula: null, vasos: null },
      },
      {
        id: '2',
        fileName: 'ret-2026.pdf',
        examType: 'retinografia',
        eye: 'od',
        dataExame: '2026-01-01',
        camposEstruturados: { disco_optico: null, macula: null, vasos: null },
      },
    ]);

    expect(out.length).toBe(1);
    expect(out[0].status).toBe('insufficient_data');
    expect(out[0].temporalLimitations.length).toBeGreaterThan(0);
  });
});

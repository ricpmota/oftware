import { describe, expect, it } from 'vitest';
import {
  buildMetaHomeWeightSeries,
  comparisonWindowDays,
  computeWeightPeriodVariation,
  daysSinceFirstWeight,
  filterWeightSeriesByPeriod,
  findWeightComparisonPoint,
  resolvePesoMetaKgReal,
} from '@/utils/metaHomeWeightPeriod';
import type { PacienteCompleto } from '@/types/obesidade';

function d(ymd: string): Date {
  const [y, m, day] = ymd.split('-').map(Number);
  return new Date(y, m - 1, day, 10, 0, 0);
}

describe('metaHomeWeightPeriod', () => {
  it('não interpola e deduplica o dia com prioridade de seguimento', () => {
    const series = buildMetaHomeWeightSeries(
      [
        { dataRegistro: d('2026-08-04'), peso: 71.5 },
        { dataRegistro: new Date(2026, 7, 4, 18, 0, 0), peso: 71.2 },
      ],
      [{ dataRegistro: d('2026-08-04'), peso: 80 } as never]
    );
    expect(series).toHaveLength(1);
    expect(series[0].peso).toBe(71.2);
    expect(series[0].origem).toBe('seguimento');
  });

  it('não deixa bioimpedância sobrescrever seguimento no mesmo dia', () => {
    const series = buildMetaHomeWeightSeries(
      [{ dataRegistro: d('2026-08-04'), peso: 71.5 }],
      [{ dataRegistro: new Date(2026, 7, 4, 23, 0, 0), peso: 80 } as never]
    );
    expect(series).toHaveLength(1);
    expect(series[0].peso).toBe(71.5);
    expect(series[0].origem).toBe('seguimento');
  });

  it('janela 7 dias é 5–9 (não inventa ponto fora)', () => {
    expect(comparisonWindowDays(7)).toBe(2);
    const series = buildMetaHomeWeightSeries(
      [
        { dataRegistro: d('2026-07-20'), peso: 74 },
        { dataRegistro: d('2026-07-27'), peso: 73.1 },
        { dataRegistro: d('2026-08-04'), peso: 71.5 },
      ],
      []
    );
    const cmp = findWeightComparisonPoint(series, d('2026-08-04'), 7);
    expect(cmp?.dateKey).toBe('2026-07-27');
    expect(cmp?.peso).toBe(73.1);

    const tooOld = findWeightComparisonPoint(
      buildMetaHomeWeightSeries([{ dataRegistro: d('2026-07-10'), peso: 80 }], []),
      d('2026-08-04'),
      7
    );
    expect(tooOld).toBeNull();
  });

  it('variação e percentual usam registros reais', () => {
    const series = buildMetaHomeWeightSeries(
      [
        { dataRegistro: d('2026-07-28'), peso: 72.3 },
        { dataRegistro: d('2026-08-04'), peso: 71.5 },
      ],
      []
    );
    const cmp = findWeightComparisonPoint(series, d('2026-08-04'), 7);
    const v = computeWeightPeriodVariation(71.5, cmp, d('2026-08-04'), 7);
    expect(v).not.toBeNull();
    expect(v!.deltaKg).toBeCloseTo(-0.8, 5);
    expect(v!.isExactPeriod).toBe(true);
  });

  it('filtra o gráfico só com pontos reais do período', () => {
    const series = buildMetaHomeWeightSeries(
      [
        { dataRegistro: d('2026-06-01'), peso: 80 },
        { dataRegistro: d('2026-07-20'), peso: 74 },
        { dataRegistro: d('2026-08-01'), peso: 72 },
        { dataRegistro: d('2026-08-04'), peso: 71.5 },
      ],
      []
    );
    const filtered = filterWeightSeriesByPeriod(series, d('2026-08-04'), 7);
    expect(filtered.map((p) => p.dateKey)).toEqual(['2026-08-01', '2026-08-04']);
  });

  it('desde o início usa o primeiro registro real até a data de referência', () => {
    const series = buildMetaHomeWeightSeries(
      [
        { dataRegistro: d('2026-04-17'), peso: 80 },
        { dataRegistro: d('2026-06-01'), peso: 76 },
        { dataRegistro: d('2026-08-15'), peso: 71.5 },
      ],
      []
    );
    const ref = d('2026-08-15');
    expect(daysSinceFirstWeight(series, ref)).toBe(120);
    const filtered = filterWeightSeriesByPeriod(series, ref, 'inicio');
    expect(filtered).toHaveLength(3);
    const cmp = findWeightComparisonPoint(series, ref, 'inicio');
    expect(cmp?.dateKey).toBe('2026-04-17');
    expect(cmp?.peso).toBe(80);
  });

  it('não trata fallback 12% como meta real', () => {
    const paciente = {
      planoTerapeutico: {
        metas: { metaPerdaPesoAtiva: true },
      },
    } as PacienteCompleto;
    expect(resolvePesoMetaKgReal(paciente, 80)).toBeNull();
  });

  it('deriva peso-alvo de meta percentual explícita', () => {
    const paciente = {
      planoTerapeutico: {
        metas: {
          metaPerdaPesoAtiva: true,
          weightLossTargetType: 'PERCENTUAL',
          weightLossTargetValue: 10,
        },
      },
    } as PacienteCompleto;
    expect(resolvePesoMetaKgReal(paciente, 80)).toBe(72);
  });
});

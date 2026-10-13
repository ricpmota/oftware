import { describe, expect, it } from 'vitest';
import { buildHba1cChartData, weekIndexFromDataColeta } from '@/utils/buildHba1cChartData';

describe('buildHba1cChartData', () => {
  it('mapeia Hemoglobina Glicada dos exames para a semana do tratamento', () => {
    const inicio = new Date(2026, 0, 1);
    const data = buildHba1cChartData({
      exames: [
        { dataColeta: new Date(2026, 0, 1), hemoglobinaGlicada: 6.8 },
        { dataColeta: new Date(2026, 0, 29), hemoglobinaGlicada: 6.2 },
      ],
      evolucao: [{ weekIndex: 3, hba1c: 6.5 }],
      planoTerapeutico: { startDate: inicio },
      expectedWeekIndexes: [1, 2, 3, 4, 5],
      faixaIdealMin: 4,
      faixaIdealMax: 5.6,
    });

    expect(data.find((d) => d.semana === 1)?.hba1c).toBe(6.8);
    expect(data.find((d) => d.semana === 1)?.fonte).toBe('exame');
    expect(data.find((d) => d.semana === 3)?.hba1c).toBe(6.5);
    expect(data.find((d) => d.semana === 3)?.fonte).toBe('seguimento');
    expect(data.find((d) => d.semana === 5)?.hba1c).toBe(6.2);
    expect(data.find((d) => d.semana === 5)?.fonte).toBe('exame');
  });

  it('prioriza exame sobre seguimento na mesma semana', () => {
    const inicio = new Date(2026, 0, 1);
    const data = buildHba1cChartData({
      exames: [{ dataColeta: new Date(2026, 0, 1), hemoglobinaGlicada: 7.1 }],
      evolucao: [{ weekIndex: 1, hba1c: 9.9 }],
      planoTerapeutico: { startDate: inicio },
      expectedWeekIndexes: [1],
      faixaIdealMin: 4,
      faixaIdealMax: 5.6,
    });
    expect(data[0].hba1c).toBe(7.1);
    expect(data[0].fonte).toBe('exame');
  });
});

describe('weekIndexFromDataColeta', () => {
  it('coloca exame anterior ao início na semana 1', () => {
    const inicio = new Date(2026, 0, 10);
    expect(weekIndexFromDataColeta(new Date(2026, 0, 1), inicio, 18)).toBe(1);
  });
});

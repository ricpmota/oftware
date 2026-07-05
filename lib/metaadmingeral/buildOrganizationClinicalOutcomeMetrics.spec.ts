import { describe, expect, it } from 'vitest';
import { buildOrganizationClinicalOutcomeMetrics } from './buildOrganizationClinicalOutcomeMetrics';

describe('buildOrganizationClinicalOutcomeMetrics', () => {
  it('agrega peso, aplicações, abdominal e kcal', () => {
    const metrics = buildOrganizationClinicalOutcomeMetrics([
      {
        evolucaoSeguimento: [
          {
            weekIndex: 1,
            peso: 100,
            circunferenciaAbdominal: 110,
            doseAplicada: { quantidade: 2.5 },
            adherence: 'OK',
          },
          {
            weekIndex: 4,
            peso: 92,
            circunferenciaAbdominal: 102,
            doseAplicada: { quantidade: 5 },
            adherence: 'OK',
          },
        ],
        dadosClinicos: { medidasIniciais: { peso: 100, circunferenciaAbdominal: 110 } },
        planoTerapeutico: {},
      },
    ]);

    expect(metrics.kgPerdidoTotal).toBe(8);
    expect(metrics.totalAplicacoesQuantidade).toBe(2);
    expect(metrics.totalAplicacoesMg).toBe(7.5);
    expect(metrics.circunferenciaAbdominalReduzidaTotalCm).toBe(8);
    expect(metrics.totalCaloriasPerdidas).toBe(Math.round(8 * 7700));
  });
});

import { describe, expect, it } from 'vitest';
import {
  buildPatientGrowthCustom,
  buildPatientGrowthMetrics,
  buildPatientGrowthPreset,
} from './patientGrowthMetrics';

const DAY_MS = 24 * 60 * 60 * 1000;

describe('crescimento de pacientes', () => {
  const now = Date.UTC(2026, 9, 7, 15, 0, 0);
  const stamps = [now - 2 * DAY_MS, now - 10 * DAY_MS, now - 40 * DAY_MS, now - 100 * DAY_MS];

  it('mantém 7d, 30d e 60d como novos cadastros da janela, sem acumular', () => {
    const sete = buildPatientGrowthMetrics(stamps, 7, now);
    expect(sete.novosAtual).toBe(1);
    expect(sete.novosAnterior).toBe(1);
    expect(sete.kind).toBe('flat');
    expect(sete.sparkline.length).toBe(8);
    expect(sete.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(1);

    const trinta = buildPatientGrowthMetrics(stamps, 30, now);
    expect(trinta.novosAtual).toBe(2);
    expect(trinta.novosAnterior).toBe(1);
    expect(trinta.percentual).toBeCloseTo(100);
    expect(trinta.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(2);

    const sessenta = buildPatientGrowthMetrics(stamps, 60, now);
    expect(sessenta.novosAtual).toBe(3);
    expect(sessenta.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(3);
    expect(buildPatientGrowthPreset(stamps, '60d', now).sparkline).toEqual(sessenta.sparkline);
  });

  it('90d compara com os 90 dias anteriores e agrupa por semana', () => {
    const noventa = buildPatientGrowthPreset(stamps, '90d', now);
    expect(noventa.novosAtual).toBe(3);
    expect(noventa.novosAnterior).toBe(1);
    expect(noventa.comparaAnterior).toBe(true);
    expect(noventa.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(3);
    expect(noventa.buckets.length).toBeLessThan(20);
  });

  it('12m usa meses de calendário e o Total não inventa período anterior', () => {
    const agora = new Date(2026, 9, 8, 15, 0, 0).getTime();
    const recente = new Date(2026, 7, 15, 12, 0, 0).getTime();
    const antigo = new Date(2025, 7, 15, 12, 0, 0).getTime();
    const doze = buildPatientGrowthPreset([recente, antigo], '12m', agora);
    expect(doze.novosAtual).toBe(1);
    expect(doze.novosAnterior).toBe(1);
    expect(doze.buckets.length).toBeGreaterThanOrEqual(12);
    expect(doze.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(1);

    const total = buildPatientGrowthPreset([recente, antigo], 'total', agora);
    expect(total.comparaAnterior).toBe(false);
    expect(total.percentual).toBeNull();
    expect(total.novosAtual).toBe(2);
    expect(total.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(2);
  });

  it('período personalizado conta só os cadastros dentro das datas', () => {
    const dentro = new Date(2026, 9, 3, 10, 0, 0).getTime();
    const fora = new Date(2026, 8, 1, 10, 0, 0).getTime();
    const custom = buildPatientGrowthCustom([dentro, fora], new Date(2026, 9, 1), new Date(2026, 9, 8));
    expect(custom.novosAtual).toBe(1);
    expect(custom.comparaAnterior).toBe(true);
    expect(custom.sparkline.reduce((soma, valor) => soma + valor, 0)).toBe(1);
  });
});

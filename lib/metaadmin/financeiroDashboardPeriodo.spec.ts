import { describe, expect, it } from 'vitest';
import {
  intervaloAnterior,
  intervaloDoPeriodo,
  intervaloTotal,
  serieFinanceira,
  somarIntervalo,
  variacaoDe,
} from './financeiroDashboardPeriodo';

describe('períodos do dashboard financeiro', () => {
  it('30 dias inclui hoje e os 29 dias anteriores, e compara com a janela imediatamente anterior', () => {
    const hoje = new Date(2026, 8, 30);
    const atual = intervaloDoPeriodo('30d', hoje);
    expect(atual.inicio).toEqual(new Date(2026, 8, 1));
    expect(atual.fim).toEqual(new Date(2026, 8, 30));

    const anterior = intervaloAnterior('30d', atual);
    expect(anterior.inicio).toEqual(new Date(2026, 7, 2));
    expect(anterior.fim).toEqual(new Date(2026, 7, 31));
  });

  it('12 meses vai do dia 1 de onze meses atrás até hoje, contra os 12 meses anteriores', () => {
    const hoje = new Date(2026, 9, 5);
    const atual = intervaloDoPeriodo('12m', hoje);
    expect(atual.inicio).toEqual(new Date(2025, 10, 1));
    expect(atual.fim).toEqual(new Date(2026, 9, 5));

    const anterior = intervaloAnterior('12m', atual);
    expect(anterior.inicio).toEqual(new Date(2024, 10, 1));
    expect(anterior.fim).toEqual(new Date(2025, 9, 31));
  });

  it('conta vendas pelos itens do dia e mantém zero nos dias sem movimento', () => {
    const mapa = new Map([
      ['2026-09-01', { vendido: 100, recebido: 10, aberto: 0 }],
      ['2026-09-03', { vendido: 50, recebido: 0, aberto: 20 }],
    ]);
    const detalhes = new Map([
      ['2026-09-01', { vendido: [{ valor: 40 }, { valor: 60 }] }],
      ['2026-09-03', { vendido: [{ valor: 50 }] }],
    ]);
    const totais = somarIntervalo(mapa, detalhes, new Date(2026, 8, 1), new Date(2026, 8, 3));
    expect(totais.vendido).toBe(150);
    expect(totais.recebido).toBe(10);
    expect(totais.aberto).toBe(20);
    expect(totais.vendas).toBe(3);

    const serie = serieFinanceira('dia', mapa, new Date(2026, 8, 1), new Date(2026, 8, 3));
    expect(serie.map((ponto) => ponto.vendido)).toEqual([100, 0, 50]);
    expect(serie.map((ponto) => ponto.aberto)).toEqual([0, 0, 20]);
  });

  it('Total inclui vencimentos fora da janela recente, passados e futuros', () => {
    const mapa = new Map([
      ['2024-03-01', { vendido: 0, recebido: 0, aberto: 80 }],
      ['2026-12-15', { vendido: 200, recebido: 0, aberto: 120 }],
    ]);
    const intervalo = intervaloTotal(mapa, new Date(2026, 9, 5));
    const totais = somarIntervalo(mapa, new Map(), intervalo.inicio, intervalo.fim);
    expect(intervalo.inicio).toEqual(new Date(2024, 2, 1));
    expect(intervalo.fim).toEqual(new Date(2026, 11, 15));
    expect(totais.aberto).toBe(200);
    expect(totais.vendido).toBe(200);
  });

  it('não produz percentual infinito quando o período anterior é zero', () => {
    expect(variacaoDe(100, 0)).toEqual({ kind: 'sem-base', percentual: null, delta: 100 });
    expect(variacaoDe(0, 0).percentual).toBe(0);
    expect(variacaoDe(110, 100).percentual).toBeCloseTo(10);
  });
});

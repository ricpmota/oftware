import { describe, expect, it } from 'vitest';
import {
  apresentacaoPerdaPeso,
  apresentacaoGordura,
  resolveProximaAplicacaoFromLista,
} from '@/utils/metaHomeSecondaryMetrics';

describe('apresentacaoPerdaPeso', () => {
  it('mostra perda sem sinal negativo no valor', () => {
    const r = apresentacaoPerdaPeso(-5.2);
    expect(r.value).toBe('5,2');
    expect(r.unit).toBe('kg');
    expect(r.hint).toMatch(/perdidos/i);
    expect(r.title).toBe('Perda de peso');
  });

  it('não chama ganho de perda', () => {
    const r = apresentacaoPerdaPeso(1.2);
    expect(r.value).toBe('+1,2');
    expect(r.title).toBe('Variação de peso');
    expect(r.hint).toMatch(/variação/i);
  });
});

describe('apresentacaoGordura', () => {
  it('compara em pontos percentuais', () => {
    const r = apresentacaoGordura(24.8, 26.1);
    expect(r.deltaLabel).toBe('↓ 1,3 p.p.');
  });

  it('empty sem inventar valor', () => {
    const r = apresentacaoGordura(null, null);
    expect(r.value).toBe('—');
    expect(r.hint).toMatch(/bioimpedância/i);
  });
});

describe('resolveProximaAplicacaoFromLista', () => {
  it('ignora tomada/perdida/cancelada e pega hoje ou futura', () => {
    const d = new Date(2026, 7, 18);
    const r = resolveProximaAplicacaoFromLista([
      { data: new Date(2026, 7, 4), semana: 6, status: 'tomada' },
      { data: new Date(2026, 7, 11), semana: 7, status: 'perdida' },
      { data: d, semana: 8, status: 'futura' },
    ]);
    expect(r?.semana).toBe(8);
    expect(r?.isHoje).toBe(false);
  });

  it('prioriza hoje', () => {
    const r = resolveProximaAplicacaoFromLista([
      { data: new Date(), semana: 3, status: 'hoje' },
      { data: new Date(2026, 8, 1), semana: 4, status: 'futura' },
    ]);
    expect(r?.isHoje).toBe(true);
    expect(r?.semana).toBe(3);
  });
});

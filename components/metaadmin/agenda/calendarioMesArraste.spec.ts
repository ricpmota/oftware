import { describe, expect, it } from 'vitest';
import {
  direcaoSnapMes,
  expandirFatiasCalendario,
  fatiasIniciaisCalendario,
  intervaloDaJanelaCalendario,
} from './calendarioMesArraste';

describe('direcaoSnapMes', () => {
  const altura = 400;

  it('fica onde parou abaixo de 90%', () => {
    expect(direcaoSnapMes(0, altura, altura)).toBe(0);
    expect(direcaoSnapMes(altura * 0.5, altura, altura)).toBe(0);
    expect(direcaoSnapMes(altura * 0.89, altura, altura)).toBe(0);
    expect(direcaoSnapMes(-altura * 0.5, altura, altura)).toBe(0);
  });

  it('completa o mês a partir de 90%', () => {
    expect(direcaoSnapMes(altura * 0.9, altura, altura)).toBe(1);
    expect(direcaoSnapMes(altura, altura, altura)).toBe(1);
    expect(direcaoSnapMes(-altura * 0.9, altura, altura)).toBe(-1);
  });

  it('usa a altura do mês que está sendo deixado', () => {
    expect(direcaoSnapMes(-180, 500, 200)).toBe(-1);
    expect(direcaoSnapMes(-179, 500, 200)).toBe(0);
  });
});

describe('fatias do calendário mobile', () => {
  const outubro = new Date(2026, 9, 1);

  it('abre o mês atual com 15 dias de cada lado', () => {
    expect(fatiasIniciaisCalendario(outubro)).toEqual([
      { ano: 2026, mes: 8, diaInicio: 16, diaFim: 30 },
      { ano: 2026, mes: 9, diaInicio: 1, diaFim: 31 },
      { ano: 2026, mes: 10, diaInicio: 1, diaFim: 15 },
    ]);
  });

  it('completa o mês da ponta antes de puxar o seguinte', () => {
    const iniciais = fatiasIniciaisCalendario(outubro);
    const completouNovembro = expandirFatiasCalendario(iniciais, 'baixo');
    expect(completouNovembro[2]).toEqual({ ano: 2026, mes: 10, diaInicio: 1, diaFim: 30 });
    expect(completouNovembro).toHaveLength(3);

    const entrouDezembro = expandirFatiasCalendario(completouNovembro, 'baixo');
    expect(entrouDezembro[3]).toEqual({ ano: 2026, mes: 11, diaInicio: 1, diaFim: 15 });

    const completouSetembro = expandirFatiasCalendario(iniciais, 'cima');
    expect(completouSetembro[0]).toEqual({ ano: 2026, mes: 8, diaInicio: 1, diaFim: 30 });
    expect(completouSetembro).toHaveLength(3);
  });

  it('no celular a janela inicial não passa dos 15 dias', () => {
    const { inicio, fim } = intervaloDaJanelaCalendario(outubro, true, null);
    expect(inicio.getMonth()).toBe(8);
    expect(inicio.getDate()).toBe(16);
    expect(fim.getMonth()).toBe(10);
    expect(fim.getDate()).toBe(15);
  });
});

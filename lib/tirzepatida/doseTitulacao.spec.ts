import { describe, expect, it } from 'vitest';
import {
  ajustarDoseMgTirzepatidaCustom,
  calcularDoseTitulacaoMg,
  clampDoseMgTirzepatidaCustom,
  formatarDoseMgNumero,
  listarDosesMgTirzepatidaPasso,
  snapDoseMgTirzepatida,
} from '@/lib/tirzepatida/doseTitulacao';

describe('doseTitulacao', () => {
  it('aumenta 2,5 mg a cada 4 semanas até o teto de 15 mg', () => {
    expect(calcularDoseTitulacaoMg(2.5, 0)).toBe(2.5);
    expect(calcularDoseTitulacaoMg(2.5, 4)).toBe(5);
    expect(calcularDoseTitulacaoMg(2.5, 8)).toBe(7.5);
    expect(calcularDoseTitulacaoMg(2.5, 20)).toBe(15);
    expect(calcularDoseTitulacaoMg(12.5, 4)).toBe(15);
  });

  it('inclui 1,25 mg e arredonda para opção válida', () => {
    expect(snapDoseMgTirzepatida(1.25)).toBe(1.25);
    expect(calcularDoseTitulacaoMg(1.25, 4)).toBe(5);
  });

  it('stepper manual sobe e desce de 1,25 em 1,25 sem alterar a titulação', () => {
    expect(clampDoseMgTirzepatidaCustom(3.75)).toBe(3.75);
    expect(clampDoseMgTirzepatidaCustom(3.7)).toBe(3.75);
    expect(clampDoseMgTirzepatidaCustom(0)).toBe(1.25);
    expect(clampDoseMgTirzepatidaCustom(20)).toBe(15);
    expect(ajustarDoseMgTirzepatidaCustom(2.5, 1)).toBe(3.75);
    expect(ajustarDoseMgTirzepatidaCustom(5, -1)).toBe(3.75);
    expect(ajustarDoseMgTirzepatidaCustom(1.25, -1)).toBe(1.25);
    expect(ajustarDoseMgTirzepatidaCustom(15, 1)).toBe(15);
    expect(listarDosesMgTirzepatidaPasso()).toEqual([
      1.25, 2.5, 3.75, 5, 6.25, 7.5, 8.75, 10, 11.25, 12.5, 13.75, 15,
    ]);
    expect(formatarDoseMgNumero(3.75)).toBe('3,75');
    expect(calcularDoseTitulacaoMg(1.25, 4)).toBe(5);
  });
});

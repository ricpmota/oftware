import { describe, expect, it } from 'vitest';
import { calcularDoseTitulacaoMg, snapDoseMgTirzepatida } from '@/lib/tirzepatida/doseTitulacao';

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
});

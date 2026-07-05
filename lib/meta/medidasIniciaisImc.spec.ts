import { describe, expect, it } from 'vitest';
import {
  calcularImcFromPesoAlturaCm,
  ensureImcOnMedidasIniciais,
} from '@/lib/meta/medidasIniciaisImc';

describe('medidasIniciaisImc', () => {
  it('calcula IMC com peso e altura válidos', () => {
    expect(calcularImcFromPesoAlturaCm(80, 170)).toBe(27.68);
  });

  it('retorna null sem peso ou altura', () => {
    expect(calcularImcFromPesoAlturaCm(0, 170)).toBeNull();
    expect(calcularImcFromPesoAlturaCm(80, 0)).toBeNull();
  });

  it('ensureImcOnMedidasIniciais preenche imc no objeto', () => {
    const out = ensureImcOnMedidasIniciais({ peso: 90, altura: 180, imc: 0 });
    expect(out.imc).toBe(27.78);
  });
});

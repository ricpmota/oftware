import { describe, expect, it } from 'vitest';
import {
  calcularPosicaoMarcadorImcHome,
  faixaVisualImcHome,
} from '@/utils/metaHomeImcRange';

describe('calcularPosicaoMarcadorImcHome', () => {
  it('preserva as divisões 18.5 / 25 / 30', () => {
    expect(calcularPosicaoMarcadorImcHome(18.5)).toBe(25);
    expect(calcularPosicaoMarcadorImcHome(25)).toBe(50);
    expect(calcularPosicaoMarcadorImcHome(30)).toBe(75);
  });

  it('escala obesidade até ~50 e clampa em 100%', () => {
    expect(calcularPosicaoMarcadorImcHome(50)).toBe(100);
    expect(calcularPosicaoMarcadorImcHome(80)).toBe(100);
  });

  it('IMC 24,9 permanece na faixa saudável (antes de 25)', () => {
    const pos = calcularPosicaoMarcadorImcHome(24.9);
    expect(pos).toBeGreaterThan(25);
    expect(pos).toBeLessThan(50);
    expect(faixaVisualImcHome(24.9)).toBe('Saudável');
    expect(faixaVisualImcHome(25)).toBe('Sobrepeso');
  });

  it('não inventa posição sem IMC', () => {
    expect(calcularPosicaoMarcadorImcHome(null)).toBe(0);
    expect(calcularPosicaoMarcadorImcHome(0)).toBe(0);
  });
});

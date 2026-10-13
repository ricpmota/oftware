/**
 * Posição do marcador na barra de IMC da Home /meta.
 * Mesma matemática já usada na Home: 4 faixas iguais (25% cada),
 * IMC ≥ 30 escala até ~50. Não altera fórmula clínica do IMC.
 */
export function calcularPosicaoMarcadorImcHome(imc: number | null | undefined): number {
  if (!imc || imc === 0) return 0;

  let pos: number;
  if (imc < 18.5) {
    pos = (imc / 18.5) * 25;
  } else if (imc < 25) {
    pos = 25 + ((imc - 18.5) / (25 - 18.5)) * 25;
  } else if (imc < 30) {
    pos = 50 + ((imc - 25) / (30 - 25)) * 25;
  } else {
    pos = 75 + Math.min(((imc - 30) / 20) * 25, 25);
  }

  return Math.max(0, Math.min(100, pos));
}

export type FaixaVisualImcHome = 'Baixo' | 'Saudável' | 'Sobrepeso' | 'Obesidade';

/** Rótulos visuais da barra (mesmos cortes clínicos da Home: 18.5 / 25 / 30). */
export function faixaVisualImcHome(imc: number | null | undefined): FaixaVisualImcHome | null {
  if (!imc || imc === 0) return null;
  if (imc < 18.5) return 'Baixo';
  if (imc < 25) return 'Saudável';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidade';
}

export function formatImcPtBr(value: number): string {
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

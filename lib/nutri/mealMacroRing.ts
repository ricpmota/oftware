/**
 * Percentuais real vs previsto da refeição (bola ao lado da foto no mobile).
 */

export const CARDAPIO_RESUMO_TOTAL_DIA_ID = 'cardapio-resumo-total-dia';

export function percentOfPredicted(atual: number, previsto: number): number {
  if (!Number.isFinite(atual) || !Number.isFinite(previsto) || previsto <= 0) return 0;
  return Math.round((atual / previsto) * 100);
}

/** Média simples: calorias 100% + proteínas 80% → 90% do previsto. */
export function combinedPredictedPercent(caloriasPct: number, proteinasPct: number): number {
  const cal = Number.isFinite(caloriasPct) ? caloriasPct : 0;
  const prot = Number.isFinite(proteinasPct) ? proteinasPct : 0;
  return Math.round((cal + prot) / 2);
}

export function ringFillPercent(pct: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  return Math.min(100, pct);
}

export function scrollToCardapioResumoTotalDia(): void {
  if (typeof document === 'undefined') return;
  document.getElementById(CARDAPIO_RESUMO_TOTAL_DIA_ID)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

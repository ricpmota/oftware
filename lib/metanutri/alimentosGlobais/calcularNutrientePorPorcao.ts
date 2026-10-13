/**
 * valorPorcao = valorBase × quantidadeG / baseQuantidade
 * (default baseQuantidade = 100)
 * null permanece null. Nunca promove null → 0.
 */
export function calcularNutrientePorPorcao(
  valorBase: number | null | undefined,
  quantidadeG: number,
  baseQuantidade = 100
): number | null {
  if (valorBase == null) return null;
  if (!Number.isFinite(valorBase)) return null;
  const q = Number(quantidadeG);
  const base = Number(baseQuantidade);
  if (!Number.isFinite(q) || q <= 0) return null;
  if (!Number.isFinite(base) || base <= 0) return null;
  return (valorBase * q) / base;
}

export function roundNutriente(valor: number | null, casas = 2): number | null {
  if (valor == null) return null;
  const f = 10 ** casas;
  return Math.round(valor * f) / f;
}

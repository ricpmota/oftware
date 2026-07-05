export function formatarVariacaoMedida(
  valor: number | null | undefined,
  unidade: 'kg' | 'cm'
): string | undefined {
  if (valor == null || Number.isNaN(valor)) return undefined;
  const sinal = valor > 0 ? '+' : '';
  return `${sinal}${valor.toFixed(1)} ${unidade}`;
}

/** Delta acumulado (final − inicial): negativo = perda/redução, igual ao Δ do check-in semanal. */
export function calcularDeltaAcumuladoMedida(
  inicial: number | null | undefined,
  final: number | null | undefined
): number | null {
  if (inicial == null || final == null || Number.isNaN(inicial) || Number.isNaN(final)) return null;
  return Number((final - inicial).toFixed(1));
}

export function toneVariacaoMedida(valor: number | null | undefined): 'positivo' | 'neutro' | 'atencao' {
  if (valor == null || Number.isNaN(valor)) return 'neutro';
  if (valor < 0) return 'positivo';
  if (valor > 0) return 'atencao';
  return 'neutro';
}

/**
 * Diferença de peso exibida acima da coluna do histograma.
 * Perda fica negativa (verde no gráfico); ganho fica positivo.
 */
export function formatDeltaPesoLabel(pesoReferencia: number, pesoSeguinte: number): string {
  const delta = pesoReferencia - pesoSeguinte;
  if (Math.abs(delta) < 0.05) return '0';
  return `${delta >= 0 ? '-' : '+'}${Math.abs(delta).toFixed(1)}`;
}

/**
 * O rótulo da semana seguinte fica na coluna da semana anterior:
 * S1 mostra a diferença até S2, S2 mostra a diferença até S3,
 * e a conclusão (último ponto) não leva rótulo — o valor dela fica na coluna anterior.
 */
export function deltaLabelsNaSemanaAnterior(
  pontos: Array<{ peso: number | null }>
): string[] {
  return pontos.map((ponto, index) => {
    const seguinte = pontos[index + 1];
    if (!seguinte || ponto.peso == null || seguinte.peso == null) return '';
    return formatDeltaPesoLabel(ponto.peso, seguinte.peso);
  });
}

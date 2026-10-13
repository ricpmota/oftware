/**
 * Textos estáticos de RPE para o paciente (sem IA).
 */

export function describeRpeRange(min: number, max: number): string {
  const mid = (min + max) / 2;
  if (mid <= 4) {
    return 'Esforço leve: termine a série sentindo que ainda conseguiria realizar várias repetições.';
  }
  if (mid <= 6.5) {
    return 'Esforço moderado: termine a série sentindo que ainda conseguiria realizar aproximadamente 3 a 5 repetições.';
  }
  if (mid <= 8) {
    return 'Esforço intenso: termine a série perto do limite, ainda com 1 a 2 repetições possíveis.';
  }
  return 'Esforço muito intenso: termine a série perto da falha, com pouca ou nenhuma repetição restante.';
}

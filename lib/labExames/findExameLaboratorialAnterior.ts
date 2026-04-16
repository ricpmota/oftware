/**
 * Entre os exames com data de coleta válida e estritamente anterior à data selecionada (YYYY-MM-DD),
 * retorna o mais recente (útil para seta de tendência vs. laudo anterior).
 */
export function findExameLaboratorialAnteriorPorData<T extends { dataColeta?: unknown }>(
  todosExames: T[],
  dataSelecionadaISO: string,
  safeDateToString: (d: unknown) => string
): T | null {
  if (!dataSelecionadaISO) return null;
  let melhor: T | null = null;
  let melhorData = '';
  for (const e of todosExames) {
    const d = safeDateToString(e.dataColeta);
    if (!d || d >= dataSelecionadaISO) continue;
    if (!melhor || d > melhorData) {
      melhor = e;
      melhorData = d;
    }
  }
  return melhor;
}

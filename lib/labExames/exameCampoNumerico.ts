/** Lê valor numérico de um campo de exame laboratorial (incl. hemograma em `hemogramaCompleto`). */
export function getExameCampoNumerico(exame: Record<string, unknown>, field: string): number | null {
  if (['hemoglobina', 'leucocitos', 'plaquetas'].includes(field)) {
    const hc = exame.hemogramaCompleto as Record<string, unknown> | undefined;
    const v = hc?.[field] ?? exame[field];
    if (v == null || v === '') return null;
    const n = Number(v);
    return !isNaN(n) ? n : null;
  }
  const v = exame[field];
  if (v == null || v === '') return null;
  const n = Number(v);
  return !isNaN(n) ? n : null;
}

/** Indica se o exame tem valor numérico preenchido para o campo (na data selecionada). */
export function exameTemCampoPreenchido(exame: Record<string, unknown>, field: string): boolean {
  return getExameCampoNumerico(exame, field) !== null;
}

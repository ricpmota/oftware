/** Inclui a observação da semana na mensagem de injetável, se houver. */
export function anexarObservacaoInjetavelNaMensagem(
  message: string,
  observacao?: string | null
): string {
  const obs = (observacao || '').trim();
  const base = (message || '').trimEnd();
  if (!obs) return base;
  if (base.includes(obs)) return base;
  return `${base}\n\nObservação: ${obs}`;
}

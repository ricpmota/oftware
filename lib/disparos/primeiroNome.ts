/** Primeiro token do nome, com capitalização pt-BR, sem remover acentos. */
export function toPrimeiroNome(fullName: string): string {
  const compact = fullName.trim().replace(/\s+/g, ' ');
  if (!compact) return '';
  const first = compact.split(' ')[0] ?? '';
  const chars = Array.from(first);
  if (chars.length === 0) return '';
  const [head, ...rest] = chars;
  return (head ?? '').toLocaleUpperCase('pt-BR') + rest.join('').toLocaleLowerCase('pt-BR');
}

/**
 * Normalização determinística de nomes para busca / comparação / dedupe futuro.
 * Não remove conteúdo semanticamente importante (apenas forma).
 */

export function normalizeNomeAlimento(nome: string): string {
  return String(nome || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[,.;:/\\|]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

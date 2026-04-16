/**
 * Termos e padrões que indicam resposta operacional fraca quando havia fluxo prioritário.
 * Mantidos alinhados ao comportamento desejado do ChatNutri.
 */
export const OPERATIONAL_WEAK_ANSWER_PATTERNS: RegExp[] = [
  /\bprocure\s+por\b/i,
  /\balgo\s+similar\b/i,
  /\bou\s+similar\b/i,
  /\bpode\s+variar\b/i,
  /\bgeralmente\b/i,
  /\bnormalmente\b/i,
  /\bse[cç][aã]o\s+chamad/i,
  /\bmenu\s+chamad/i,
  /\bplataforma\s+pode\s+ter\b/i,
];

/**
 * @param hasOperationalBlock se true, aplica checagem estrita de linguagem genérica.
 * @returns true se a resposta é aceitável; false se deve usar fallback/regeneração.
 */
export function validateOperationalAnswer(answer: string, hasOperationalBlock: boolean): boolean {
  const t = answer.trim();
  if (!hasOperationalBlock) return true;
  if (!t) return false;
  if (/Não encontrei no conhecimento carregado/i.test(t)) return true;
  return !OPERATIONAL_WEAK_ANSWER_PATTERNS.some((re) => re.test(t));
}

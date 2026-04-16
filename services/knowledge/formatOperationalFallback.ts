import type { OperationalFlowMatch } from './operationalFlowTypes';

/**
 * Resposta determinística quando o modelo falha nas regras operacionais.
 */
export function formatOperationalFallback(match: OperationalFlowMatch): string {
  if (!match.matched || !match.steps.length) return '';

  const lead =
    match.fallbackLeadIn?.trim() ||
    match.objective?.trim() ||
    match.title.trim() ||
    'seguir o fluxo oficial';

  const body = match.steps.map((s, i) => `${i + 1}. ${s}`).join('\n');

  return [`Para ${lead}:`, '', body].join('\n').trim();
}

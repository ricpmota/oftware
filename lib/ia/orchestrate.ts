/**
 * Orquestrador v1 (stub evolutivo).
 * Futuro: memória, servidor de fatos, behavioral/growth/experiments.
 */

export type IARole = 'paciente' | 'medico' | 'nutricionista' | 'personal' | 'lead' | 'desconhecido';

export type IAMode = 'suporte' | 'risco' | 'crescimento' | 'eficiencia';

export interface OrchestratorStrategy {
  role: IARole;
  mode: IAMode;
  tone: 'acolhedor' | 'neutro' | 'objetivo';
  length: 'curto' | 'medio' | 'longo';
}

const CRISIS_HINTS =
  /\b(falta de ar|desmaio|dor no peito|peito aperta|suicídio|suicidio|auto[- ]?mutil|sangramento intenso)\b/i;

/** v1: heurística mínima no texto + hint opcional do cliente. */
export function orchestrate(
  message: string,
  hints?: { roleHint?: IARole }
): OrchestratorStrategy {
  const lower = message.toLowerCase();
  if (CRISIS_HINTS.test(message)) {
    return {
      role: hints?.roleHint ?? 'paciente',
      mode: 'risco',
      tone: 'objetivo',
      length: 'curto',
    };
  }
  if (
    /\b(crm|meus pacientes|painel|metaadmin|solicitação aceita|lead)\b/i.test(message) ||
    hints?.roleHint === 'medico'
  ) {
    return {
      role: hints?.roleHint ?? 'medico',
      mode: 'eficiencia',
      tone: 'objetivo',
      length: 'curto',
    };
  }
  if (/\b(como funciona|primeira vez|não tenho médico|cadastro)\b/i.test(lower)) {
    return {
      role: 'lead',
      mode: 'suporte',
      tone: 'acolhedor',
      length: 'medio',
    };
  }
  return {
    role: hints?.roleHint ?? 'paciente',
    mode: 'suporte',
    tone: 'acolhedor',
    length: 'medio',
  };
}

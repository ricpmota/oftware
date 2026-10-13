import type { PacienteCompleto } from '@/types/obesidade';
import {
  countPerfilMetabolicoV3WizardSteps,
  isPerfilMetabolicoChatStep,
  resolveEffectiveChatStep,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  META_CHAT_STEP_CIRURGIAS,
  META_CHAT_STEP_DEPRESSAO,
  META_CHAT_STEP_IDEACAO_SUICIDA,
  META_CHAT_STEP_LOCALIZACAO,
  META_CHAT_STEP_MEDICAMENTOS_DIABETES,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_PERFIL_COMPLETO,
  META_CHAT_STEP_SOLICITACAO_ENVIADA,
} from './constants';
import { getFirstIncompleteStep, isMetaChatInicialCompleto } from './resume';
import { temDiabetesSelecionado } from './medicamentosDiabetes';

export type MetaChatAnamneseProgress = {
  /** Passo atual (1-based), o mesmo número que o paciente vê no wizard. */
  current: number;
  total: number;
  percent: number;
  complete: boolean;
};

export function normalizeMetaChatWizardStep(raw: number): number {
  if (raw === META_CHAT_STEP_MEDICO_LISTA) return META_CHAT_STEP_MEDICO_UF;
  return raw;
}

/**
 * Índice 0-based da barra do wizard (intro + anamnese + localização + V3 + médico).
 * Avaliação completa: 27 passos (19 + 7 V3 + 1). As duas perguntas de humor somam 2.
 */
export function getMetaChatWizardProgressIndex(
  step: number,
  p: PacienteCompleto
): { current: number; total: number } {
  const v3Count = countPerfilMetabolicoV3WizardSteps(p);
  const extraDiabetes = temDiabetesSelecionado(p) ? 1 : 0;
  const total = 19 + extraDiabetes + v3Count + 1;

  const normalizedStep = normalizeMetaChatWizardStep(step);
  let current = normalizedStep;
  if (normalizedStep === META_CHAT_STEP_LOCALIZACAO) {
    current = 2;
  } else if (normalizedStep <= 1) {
    current = normalizedStep;
  } else if (normalizedStep <= 9) {
    current = normalizedStep + 1;
  } else if (normalizedStep === META_CHAT_STEP_MEDICAMENTOS_DIABETES) {
    current = 11;
  } else if (normalizedStep <= 10) {
    current = normalizedStep + 1 + extraDiabetes;
  } else if (normalizedStep === META_CHAT_STEP_CIRURGIAS) {
    current = 12 + extraDiabetes;
  } else if (normalizedStep <= 13) {
    current = normalizedStep + 2 + extraDiabetes;
  } else if (normalizedStep === META_CHAT_STEP_DEPRESSAO) {
    current = 16 + extraDiabetes;
  } else if (normalizedStep === META_CHAT_STEP_IDEACAO_SUICIDA) {
    current = 17 + extraDiabetes;
  } else if (normalizedStep === 14) {
    current = 18 + extraDiabetes;
  } else if (isPerfilMetabolicoChatStep(normalizedStep)) {
    current = 19 + extraDiabetes + (normalizedStep - 19);
  } else if (normalizedStep === META_CHAT_STEP_MEDICO_UF) {
    current = 19 + extraDiabetes + v3Count;
  } else if (
    normalizedStep === META_CHAT_STEP_PERFIL_COMPLETO ||
    normalizedStep === META_CHAT_STEP_SOLICITACAO_ENVIADA
  ) {
    current = total - 1;
  }

  return { current: Math.min(Math.max(current, 0), total - 1), total };
}

/** Progresso derivado do cadastro do paciente — para o card de solicitação do médico. */
export function getMetaChatAnamneseProgress(p: PacienteCompleto): MetaChatAnamneseProgress {
  const v2Step = getFirstIncompleteStep(p);
  const effective = resolveEffectiveChatStep(p, v2Step);
  const { current, total } = getMetaChatWizardProgressIndex(effective, p);
  const complete = isMetaChatInicialCompleto(p);
  const displayCurrent = complete ? total : current + 1;
  return {
    current: displayCurrent,
    total,
    percent: Math.round((displayCurrent / Math.max(1, total)) * 100),
    complete,
  };
}

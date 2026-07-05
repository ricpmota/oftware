import type { PacienteCompleto } from '@/types/obesidade';
import {
  deveExibirPerfilMetabolicoV3,
  getFirstIncompletePerfilMetabolicoStep,
  isPerfilMetabolicoChatStep,
  PERFIL_METABOLICO_V3_BOT_TEXTS,
  resolveEffectiveChatStep,
  STEP_PERFIL_METABOLICO_SONO,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_PERFIL_COMPLETO,
} from './constants';
import { getFirstIncompleteStep } from './resume';

const V2_STEP_LABELS: Record<number, string> = {
  [META_CHAT_STEP_INTRO]: 'Introdução do cadastro',
  1: 'Telefone de contato',
  2: 'Data de nascimento',
  3: 'Gênero / identificação',
  4: 'CPF',
  5: 'Peso atual',
  6: 'Altura',
  7: 'Circunferência abdominal',
  8: 'Motivação para o tratamento',
  9: 'Diagnóstico principal',
  10: 'Comorbidades',
  11: 'Perguntas de saúde (riscos)',
  12: 'História tireoidiana',
  13: 'Sintomas digestivos',
  [META_CHAT_STEP_METAS]: 'Metas de tratamento',
  [META_CHAT_STEP_MEDICO_UF]: 'Estado para busca de médico',
  [META_CHAT_STEP_MEDICO_LISTA]: 'Seleção do médico',
};

function labelPerfilMetabolicoV3(step: number): string {
  const index = step - STEP_PERFIL_METABOLICO_SONO;
  const texto = PERFIL_METABOLICO_V3_BOT_TEXTS[index];
  if (texto) {
    const firstLine = texto.split('\n')[0]?.trim();
    if (firstLine) return firstLine;
  }
  return `Perfil metabólico (etapa ${step})`;
}

function labelV2Step(step: number): string {
  return V2_STEP_LABELS[step] || `Etapa ${step} da anamnese`;
}

/**
 * Próxima etapa que o paciente precisa responder no chat (uma de cada vez).
 * Alinhado à retomada do `/meta`: anamnese V2 primeiro; perfil metabólico V3 só depois do passo 14.
 */
export function getMetaChatInicialProximaPendencia(p: PacienteCompleto): string | null {
  const firstV2 = getFirstIncompleteStep(p);

  if (firstV2 <= META_CHAT_STEP_METAS) {
    return labelV2Step(firstV2);
  }

  if (firstV2 === META_CHAT_STEP_MEDICO_UF || firstV2 === META_CHAT_STEP_MEDICO_LISTA) {
    const effective = resolveEffectiveChatStep(p, firstV2);
    if (isPerfilMetabolicoChatStep(effective)) {
      return labelPerfilMetabolicoV3(effective);
    }
    return labelV2Step(firstV2);
  }

  if (firstV2 === META_CHAT_STEP_PERFIL_COMPLETO && deveExibirPerfilMetabolicoV3(p)) {
    const perfilStep = getFirstIncompletePerfilMetabolicoStep(p);
    if (perfilStep != null) {
      return labelPerfilMetabolicoV3(perfilStep);
    }
  }

  return null;
}

/** Lista legível do que falta no cadastro inicial (apenas a próxima etapa). */
export function getMetaChatInicialPendencias(p: PacienteCompleto): string[] {
  const proxima = getMetaChatInicialProximaPendencia(p);
  return proxima ? [proxima] : [];
}

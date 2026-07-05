import type { PacienteCompleto } from '@/types/obesidade';
import {
  deveExibirPerfilMetabolicoV3,
  getFirstIncompletePerfilMetabolicoStep,
  getLastPerfilMetabolicoStepBeforeMedico,
  isPerfilMetabolicoChatStep,
  PERFIL_METABOLICO_V3_STEP_FIRST,
  PERFIL_METABOLICO_V3_STEP_LAST,
  resolveEffectiveChatStep,
  shouldSkipExpectativaPerdaPesoStep,
  STEP_PERFIL_METABOLICO_BARREIRAS,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import {
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_RISCOS,
} from './constants';
import { filterRiskQuestionsForSexo, getFirstUnansweredRiskIndex } from './helpers';
import {
  getFirstIncompleteStep,
  metasTratamentoPasso14Ok,
  motivacaoPreenchida,
} from './resume';

export type MetaChatMedicoUiState = {
  selectedEstado?: string;
  selectedCidade?: string;
  selectedMedicoId?: string | null;
};

export type ValidateMetaChatStepOptions = {
  riskQuestionIndex?: number;
  medicoUi?: MetaChatMedicoUiState;
};

/** Validação por passo para o wizard (mesmas regras do chat atual). Retorna mensagem de erro ou null. */
export function validateMetaChatStep(
  step: number,
  p: PacienteCompleto,
  options: ValidateMetaChatStepOptions = {}
): string | null {
  if (step === META_CHAT_STEP_INTRO) return null;

  if (step === 1) {
    const tel = (p.dadosIdentificacao?.telefone || '').replace(/\D/g, '');
    if (tel.length < 10) return 'Informe um telefone válido com DDD.';
    return null;
  }

  if (step === 2) {
    if (!p.dadosIdentificacao?.dataNascimento) return 'Informe sua data de nascimento.';
    const d = new Date(p.dadosIdentificacao.dataNascimento);
    if (Number.isNaN(d.getTime())) return 'Data de nascimento inválida.';
    return null;
  }

  if (step === 3) {
    if (!p.dadosIdentificacao?.sexoBiologico) return 'Selecione como prefere se identificar.';
    return null;
  }

  if (step === 4) {
    const cpf = (p.dadosIdentificacao?.cpf || '').replace(/\D/g, '');
    if (cpf.length !== 11) return 'Informe um CPF válido com 11 dígitos.';
    return null;
  }

  if (step === 5) {
    const peso = p.dadosClinicos?.medidasIniciais?.peso;
    if (!peso || peso <= 0) return 'Informe seu peso atual.';
    return null;
  }

  if (step === 6) {
    const altura = p.dadosClinicos?.medidasIniciais?.altura;
    if (!altura || altura <= 0) return 'Informe sua altura.';
    return null;
  }

  if (step === 7) {
    const mi = p.dadosClinicos?.medidasIniciais;
    const naoSabe = (mi as { circunferenciaNaoInformada?: boolean })?.circunferenciaNaoInformada;
    const circ = mi?.circunferenciaAbdominal;
    if (!naoSabe && (!circ || circ <= 0)) {
      return 'Informe a circunferência abdominal ou selecione "Não sei".';
    }
    return null;
  }

  if (step === 8) {
    if (!motivacaoPreenchida(p)) return 'Selecione ao menos uma opção.';
    const m = p.dadosClinicos?.motivacao;
    if (m?.outro && !(p.dadosClinicos?.motivacaoOutro || '').trim()) {
      return 'Descreva a opção "Outro".';
    }
    return null;
  }

  if (step === 9) {
    const tipos = (p.dadosClinicos as { diagnosticoPrincipalTipos?: string[] })?.diagnosticoPrincipalTipos;
    const tipo = p.dadosClinicos?.diagnosticoPrincipal?.tipo;
    if (!((tipos && tipos.length > 0) || tipo)) return 'Selecione ao menos uma opção.';
    const selected = tipos?.length ? tipos : tipo ? [tipo] : [];
    if (selected.includes('outro') && !(p.dadosClinicos?.diagnosticoPrincipal?.outro || '').trim()) {
      return 'Especifique a opção "Outro".';
    }
    return null;
  }

  if (step === 10) {
    const comb = p.dadosClinicos?.comorbidades as Record<string, unknown> | undefined;
    const marcada = comb && Object.keys(comb).some((k) => k !== 'outraDescricao' && comb[k]);
    if (!marcada) return 'Selecione ao menos uma opção.';
    if (comb?.outra && !(comb.outraDescricao as string)?.trim()) {
      return 'Descreva a opção "Outra".';
    }
    return null;
  }

  if (step === META_CHAT_STEP_RISCOS) {
    const sexo = p.dadosIdentificacao?.sexoBiologico;
    const riskList = filterRiskQuestionsForSexo(sexo);
    const idx = options.riskQuestionIndex ?? getFirstUnansweredRiskIndex(p);
    const current = riskList[idx];
    if (!current) return null;
    const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
    const v = riscos?.[current.key];
    if (v == null || String(v).trim() === '') return 'Selecione uma opção.';
    return null;
  }

  if (step === 12) {
    const historia = p.dadosClinicos?.historiaTireoidiana;
    const outro = (p.dadosClinicos?.historiaTireoidianaOutro || '').trim();
    if (!historia && !outro) return 'Selecione uma opção.';
    if (historia === 'outro' && !outro) return 'Descreva a opção "Outro".';
    return null;
  }

  if (step === 13) {
    const sintomas = p.dadosClinicos?.sintomasGI as Record<string, boolean> | undefined;
    const ok = sintomas && Object.keys(sintomas).some((k) => sintomas[k]);
    if (!ok) return 'Selecione ao menos uma opção.';
    return null;
  }

  if (step === META_CHAT_STEP_METAS) {
    if (!metasTratamentoPasso14Ok(p)) return 'Defina suas metas de tratamento antes de continuar.';
    return null;
  }

  if (isPerfilMetabolicoChatStep(step)) {
    const pendente = getFirstIncompletePerfilMetabolicoStep(p);
    if (pendente === step) return 'Complete esta etapa antes de continuar.';
    return null;
  }

  if (step === META_CHAT_STEP_MEDICO_UF) {
    if (!options.medicoUi?.selectedEstado?.trim()) return 'Selecione o estado.';
    if (!options.medicoUi?.selectedCidade?.trim()) return 'Selecione a cidade.';
    return null;
  }

  if (step === META_CHAT_STEP_MEDICO_LISTA) {
    if (!options.medicoUi?.selectedMedicoId) return 'Selecione um médico.';
    return null;
  }

  return null;
}

export function resolveInitialChatStep(p: PacienteCompleto, introSessionKey: string): number {
  const first = getFirstIncompleteStep(p, introSessionKey);
  return resolveEffectiveChatStep(p, first);
}

export function resolveEffectiveStep(p: PacienteCompleto, introSessionKey: string): number {
  const v2 = getFirstIncompleteStep(p, introSessionKey);
  return resolveEffectiveChatStep(p, v2);
}

/** Próximo passo após concluir o passo atual (lógica de navegação do fluxo). */
export function getNextStepAfter(currentStep: number, p: PacienteCompleto): number {
  if (currentStep === META_CHAT_STEP_METAS) {
    if (deveExibirPerfilMetabolicoV3(p) && getFirstIncompletePerfilMetabolicoStep(p) != null) {
      return getFirstIncompletePerfilMetabolicoStep(p) ?? PERFIL_METABOLICO_V3_STEP_FIRST;
    }
    const afterMetas = getFirstIncompleteStep(p);
    return afterMetas >= 15 ? afterMetas : 15;
  }

  if (isPerfilMetabolicoChatStep(currentStep)) {
    if (currentStep === STEP_PERFIL_METABOLICO_BARREIRAS && shouldSkipExpectativaPerdaPesoStep(p)) {
      return getFirstIncompleteStep(p) >= 15 ? getFirstIncompleteStep(p) : 15;
    }
    if (currentStep === PERFIL_METABOLICO_V3_STEP_LAST) {
      return getFirstIncompleteStep(p) >= 15 ? getFirstIncompleteStep(p) : 15;
    }
    return currentStep + 1;
  }

  if (currentStep === META_CHAT_STEP_RISCOS) {
    const sexo = p.dadosIdentificacao?.sexoBiologico;
    const riskList = filterRiskQuestionsForSexo(sexo);
    const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
    const allOk = riskList.every((r) => riscos && riscos[r.key]);
    if (!allOk) return META_CHAT_STEP_RISCOS;
    return 12;
  }

  return currentStep + 1;
}

/** Passo anterior navegável (wizard). */
export function getPreviousStep(currentStep: number, p: PacienteCompleto, riskQuestionIndex = 0): number | null {
  if (currentStep === META_CHAT_STEP_RISCOS && riskQuestionIndex > 0) {
    return META_CHAT_STEP_RISCOS;
  }

  if (isPerfilMetabolicoChatStep(currentStep)) {
    if (currentStep > PERFIL_METABOLICO_V3_STEP_FIRST) return currentStep - 1;
    return META_CHAT_STEP_METAS;
  }

  if (currentStep === META_CHAT_STEP_MEDICO_UF) {
    if (deveExibirPerfilMetabolicoV3(p)) return getLastPerfilMetabolicoStepBeforeMedico(p);
    return META_CHAT_STEP_METAS;
  }
  if (currentStep === META_CHAT_STEP_MEDICO_LISTA) return META_CHAT_STEP_MEDICO_UF;
  if (currentStep <= 1) return currentStep === 1 ? META_CHAT_STEP_INTRO : null;

  if (currentStep === 12) {
    const sexo = p.dadosIdentificacao?.sexoBiologico;
    const riskList = filterRiskQuestionsForSexo(sexo);
    return riskList.length > 0 ? META_CHAT_STEP_RISCOS : 10;
  }

  return currentStep - 1;
}

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
import { PATIENT_LOCATION_MESSAGES } from '@/lib/localizacao/patientLocationField';
import {
  META_CHAT_STEP_CIRURGIAS,
  META_CHAT_STEP_DATA_NASCIMENTO,
  META_CHAT_STEP_DEPRESSAO,
  META_CHAT_STEP_DIAGNOSTICO,
  META_CHAT_STEP_IDEACAO_SUICIDA,
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_LOCALIZACAO,
  META_CHAT_STEP_MEDICAMENTOS_DIABETES,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_RISCOS,
  META_CHAT_STEP_SINTOMAS_GI,
  META_CHAT_STEP_TELEFONE,
} from './constants';
import { localizacaoResidencialOficial } from './localizacaoResidencial';
import { temDiabetesSelecionado } from './medicamentosDiabetes';
import { respostaDepressao, respostaIdeacao } from './triagemHumor';

function isPassoHumor(step: number): boolean {
  return step === META_CHAT_STEP_DEPRESSAO || step === META_CHAT_STEP_IDEACAO_SUICIDA;
}
import { filterRiskQuestionsForSexo, getFirstUnansweredRiskIndex } from './helpers';
import {
  getFirstIncompleteStep,
  metasTratamentoPasso14Ok,
  motivacaoPreenchida,
} from './resume';
import {
  IDENTIFICACAO_PHONE_ERROR,
  isValidIdentificacaoPhone,
} from '@/lib/phone/internationalPhoneValue';

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
    if (!isValidIdentificacaoPhone(p.dadosIdentificacao)) return IDENTIFICACAO_PHONE_ERROR;
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

  if (step === META_CHAT_STEP_MEDICAMENTOS_DIABETES) {
    const meds = p.dadosClinicos?.medicamentosDiabetes as Record<string, unknown> | undefined;
    const marcada = meds && Object.keys(meds).some((k) => k !== 'outrosDescricao' && meds[k]);
    if (!marcada) return 'Selecione ao menos uma opção.';
    if (meds?.outros && !(typeof meds.outrosDescricao === 'string' && meds.outrosDescricao.trim())) {
      return 'Descreva a opção "Outros".';
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

  if (step === META_CHAT_STEP_CIRURGIAS) {
    const cirurgias = p.dadosClinicos?.cirurgiasRealizadas as Record<string, unknown> | undefined;
    const marcada = cirurgias && Object.keys(cirurgias).some((k) => cirurgias[k]);
    if (!marcada) return 'Selecione ao menos uma opção.';
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

  if (step === META_CHAT_STEP_DEPRESSAO) {
    if (!respostaDepressao(p.dadosClinicos)) return 'Selecione Sim ou Não.';
    return null;
  }

  if (step === META_CHAT_STEP_IDEACAO_SUICIDA) {
    if (!respostaIdeacao(p.dadosClinicos)) return 'Selecione Sim ou Não.';
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

  if (step === META_CHAT_STEP_LOCALIZACAO) {
    if (!localizacaoResidencialOficial(p)) return PATIENT_LOCATION_MESSAGES.required;
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

  if (currentStep === META_CHAT_STEP_SINTOMAS_GI) return META_CHAT_STEP_DEPRESSAO;
  if (currentStep === META_CHAT_STEP_DEPRESSAO) return META_CHAT_STEP_IDEACAO_SUICIDA;
  if (currentStep === META_CHAT_STEP_IDEACAO_SUICIDA) return META_CHAT_STEP_METAS;

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
    return riskList.length > 0 ? META_CHAT_STEP_RISCOS : META_CHAT_STEP_CIRURGIAS;
  }

  if (currentStep === META_CHAT_STEP_DEPRESSAO) return META_CHAT_STEP_SINTOMAS_GI;
  if (currentStep === META_CHAT_STEP_IDEACAO_SUICIDA) return META_CHAT_STEP_DEPRESSAO;
  if (currentStep === META_CHAT_STEP_METAS) return META_CHAT_STEP_IDEACAO_SUICIDA;

  return currentStep - 1;
}

/** Navegação do wizard /meta: localização do paciente entre telefone e nascimento. */
export function getNextMetaPacienteWizardStep(currentStep: number, p: PacienteCompleto): number {
  if (currentStep === META_CHAT_STEP_TELEFONE) return META_CHAT_STEP_LOCALIZACAO;
  if (currentStep === META_CHAT_STEP_LOCALIZACAO) return META_CHAT_STEP_DATA_NASCIMENTO;
  if (currentStep === META_CHAT_STEP_DIAGNOSTICO) {
    return temDiabetesSelecionado(p) ? META_CHAT_STEP_MEDICAMENTOS_DIABETES : 10;
  }
  if (currentStep === META_CHAT_STEP_MEDICAMENTOS_DIABETES) {
    const next = getFirstIncompleteStep(p);
    if (
      next === META_CHAT_STEP_MEDICAMENTOS_DIABETES ||
      next === META_CHAT_STEP_LOCALIZACAO ||
      next <= META_CHAT_STEP_DIAGNOSTICO
    ) {
      return 10;
    }
    if (next >= 15 && !isPassoHumor(next)) return getNextStepAfter(META_CHAT_STEP_METAS, p);
    return next;
  }
  if (currentStep === 10) return META_CHAT_STEP_CIRURGIAS;
  if (currentStep === META_CHAT_STEP_CIRURGIAS) {
    const next = getFirstIncompleteStep(p);
    if (
      next === META_CHAT_STEP_CIRURGIAS ||
      next === META_CHAT_STEP_LOCALIZACAO ||
      next === META_CHAT_STEP_MEDICAMENTOS_DIABETES ||
      next <= 10
    ) {
      return META_CHAT_STEP_RISCOS;
    }
    if (next >= 15 && !isPassoHumor(next)) return getNextStepAfter(META_CHAT_STEP_METAS, p);
    return next;
  }
  return getNextStepAfter(currentStep, p);
}

/** Volta do wizard /meta. Do nascimento retorna à localização, não ao telefone. */
export function getPreviousMetaPacienteWizardStep(
  currentStep: number,
  p: PacienteCompleto,
  riskQuestionIndex = 0
): number | null {
  if (currentStep === META_CHAT_STEP_LOCALIZACAO) return META_CHAT_STEP_TELEFONE;
  if (currentStep === META_CHAT_STEP_DATA_NASCIMENTO) return META_CHAT_STEP_LOCALIZACAO;
  if (currentStep === META_CHAT_STEP_MEDICAMENTOS_DIABETES) return META_CHAT_STEP_DIAGNOSTICO;
  if (currentStep === 10 && temDiabetesSelecionado(p)) return META_CHAT_STEP_MEDICAMENTOS_DIABETES;
  if (currentStep === META_CHAT_STEP_CIRURGIAS) return 10;
  if (currentStep === META_CHAT_STEP_RISCOS && riskQuestionIndex === 0) return META_CHAT_STEP_CIRURGIAS;
  return getPreviousStep(currentStep, p, riskQuestionIndex);
}

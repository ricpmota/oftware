export {
  META_CHAT_INTRO_SESSION_KEY,
  META_CHAT_INTRO_SANDBOX_SESSION_KEY,
  META_CHAT_STEP_INTRO,
  META_CHAT_STEP_TELEFONE,
  META_CHAT_STEP_DATA_NASCIMENTO,
  META_CHAT_STEP_SEXO,
  META_CHAT_STEP_CPF,
  META_CHAT_STEP_PESO,
  META_CHAT_STEP_ALTURA,
  META_CHAT_STEP_CIRCUNFERENCIA,
  META_CHAT_STEP_MOTIVACAO,
  META_CHAT_STEP_DIAGNOSTICO,
  META_CHAT_STEP_COMORBIDADES,
  META_CHAT_STEP_RISCOS,
  META_CHAT_STEP_TIREOIDE,
  META_CHAT_STEP_SINTOMAS_GI,
  META_CHAT_STEP_METAS,
  META_CHAT_STEP_MEDICO_UF,
  META_CHAT_STEP_MEDICO_LISTA,
  META_CHAT_STEP_PERFIL_COMPLETO,
  META_CHAT_STEP_SOLICITACAO_ENVIADA,
  META_CHAT_LAST_ANAMNESE_STEP,
  CHAT_BOT_TEXTS,
  TEXTO_INTRO_TITULO,
  TEXTO_INTRO_HINT,
  TEXTO_AGUARDANDO_ACEITE_MEDICO,
  TEXTO_PESQUISA_MEDICO,
  TEXTO_FECHAMENTO_PERFIL,
  TEXTO_POS_METAS_SEM_BUSCA_MEDICO,
  TEXTO_CHAT_PERFIL_COMPLETO_SEM_BUSCA,
  TEXTO_SOLICITACAO_PENDENTE,
  ESTADOS_BR,
  MESES,
  DIAGNOSTICO_LABELS,
  DIAGNOSTICO_TIPOS,
  RISK_QUESTIONS,
  MOTIVACAO_OPTIONS,
  COMORBIDADES_OPTIONS,
  TIREOIDE_OPTIONS,
  SINTOMAS_GI_OPTIONS,
  SEXO_OPTIONS,
} from './constants';

export type { RiskOption, RiskQuestion } from './constants';

export {
  isIntroSessionDone,
  formatTelefone,
  formatCpf,
  parseAlturaToCm,
  parseCircToCm,
  patchMedidasIniciais,
  filterRiskQuestionsForSexo,
  riskOptionLabel,
  getFirstUnansweredRiskIndex,
  splitStepText,
  getInitialBotTextForStep,
  getStepTitleAndHint,
  medicoElegivelListaPaciente,
  getMedicoChatDisplayName,
  isMetaChatAnamneseStep,
  isMetaChatMedicoStep,
  isMetaChatTerminalStep,
  isPerfilMetabolicoStep,
} from './helpers';

export {
  motivacaoPreenchida,
  temCircunferenciaInicialParaMetas,
  metasTratamentoPasso14Ok,
  devePularSelecaoMedicoNoChat,
  getFirstIncompleteStep,
  isMetaChatInicialCompleto,
} from './resume';

export { getMetaChatInicialPendencias, getMetaChatInicialProximaPendencia } from './pendencias';

export {
  validateMetaChatStep,
  resolveInitialChatStep,
  resolveEffectiveStep,
  getNextStepAfter,
  getPreviousStep,
} from './validation';

export type { MetaChatMedicoUiState, ValidateMetaChatStepOptions } from './validation';

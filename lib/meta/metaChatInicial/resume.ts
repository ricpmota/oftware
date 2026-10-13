import type { PacienteCompleto } from '@/types/obesidade';
import {
  resolveMetaPerdaPesoAtiva,
  resolveMetaReducaoCinturaAtiva,
  resolveMetasTratamentoModuloResumo,
} from '@/utils/metasTratamentoSwitches';
import { pacienteMetaTemDataNascimentoCadastro } from '@/utils/pacienteMetaChatResume';
import {
  deveExibirPerfilMetabolicoV3,
  isPerfilMetabolicoChatStep,
  perfilMetabolicoV3Completo,
  resolveEffectiveChatStep,
} from '@/lib/meta/perfilMetabolicoV3Chat';
import { cirurgiasInformadas } from './cirurgias';
import { medicamentosDiabetesInformados, temDiabetesSelecionado } from './medicamentosDiabetes';
import { respostaDepressao, respostaIdeacao } from './triagemHumor';
import { META_CHAT_INTRO_SESSION_KEY, META_CHAT_STEP_CIRURGIAS, META_CHAT_STEP_DEPRESSAO, META_CHAT_STEP_IDEACAO_SUICIDA, META_CHAT_STEP_LOCALIZACAO, META_CHAT_STEP_MEDICAMENTOS_DIABETES, META_CHAT_STEP_METAS } from './constants';
import { filterRiskQuestionsForSexo, isIntroSessionDone } from './helpers';
import { localizacaoResidencialOficial } from './localizacaoResidencial';
import { isValidIdentificacaoPhone } from '@/lib/phone/internationalPhoneValue';

export function motivacaoPreenchida(p: PacienteCompleto): boolean {
  const m = p.dadosClinicos?.motivacao;
  if (!m || typeof m !== 'object') return false;
  const keys = ['estetica', 'cansaco_falta_energia', 'saude_exames_alterados', 'autoestima', 'dificuldade_emagrecer'] as const;
  if (keys.some((k) => m[k])) return true;
  if (m.outro && (p.dadosClinicos?.motivacaoOutro || '').trim()) return true;
  if (m.outro) return true;
  return false;
}

export function temCircunferenciaInicialParaMetas(
  mi: PacienteCompleto['dadosClinicos']['medidasIniciais'] | undefined
): boolean {
  if (!mi) return false;
  if ((mi as { circunferenciaNaoInformada?: boolean }).circunferenciaNaoInformada) return false;
  return mi.circunferenciaAbdominal != null && mi.circunferenciaAbdominal > 0;
}

/** Metas definidas pelo novo fluxo (barras); compatível com respostas antigas em objetivosTratamento. */
export function metasTratamentoPasso14Ok(p: PacienteCompleto): boolean {
  const temCint = temCircunferenciaInicialParaMetas(p.dadosClinicos?.medidasIniciais);
  const metas = p.planoTerapeutico?.metas;
  if (!metas) return false;
  const modulo =
    metas.metasTratamentoModuloAtivo === true ||
    resolveMetasTratamentoModuloResumo(metas, temCint);
  if (!modulo) return false;

  const pesoOn = resolveMetaPerdaPesoAtiva(metas);
  const cintOn = resolveMetaReducaoCinturaAtiva(metas, temCint);
  if (!pesoOn && !cintOn) return false;

  if (pesoOn) {
    if (
      metas.weightLossTargetType !== 'PERCENTUAL' ||
      metas.weightLossTargetValue == null ||
      metas.weightLossTargetValue <= 0
    ) {
      return false;
    }
  }
  if (cintOn) {
    if (typeof metas.waistReductionTargetCm !== 'number' || Number.isNaN(metas.waistReductionTargetCm)) {
      return false;
    }
  }
  return true;
}

/** Só pula UF/cidade/lista quando há médico vinculado ou indicado por link (/dr). */
export function devePularSelecaoMedicoNoChat(p: PacienteCompleto): boolean {
  if (p?.medicoResponsavelId && String(p.medicoResponsavelId).trim()) return true;
  if (p?.medicoRecomendadoId && String(p.medicoRecomendadoId).trim()) return true;
  return false;
}

/**
 * Primeiro passo incompleto do fluxo V2 (0–18).
 * Fonte de verdade para retomada — não alterar sem revisar CHAT_INICIAL_PACIENTE_FIREBASE.md.
 */
export function getFirstIncompleteStep(
  p: PacienteCompleto,
  introSessionKey: string = META_CHAT_INTRO_SESSION_KEY
): number {
  if (!isValidIdentificacaoPhone(p.dadosIdentificacao)) {
    return isIntroSessionDone(introSessionKey) ? 1 : 0;
  }
  if (!pacienteMetaTemDataNascimentoCadastro(p)) {
    if (!localizacaoResidencialOficial(p)) return META_CHAT_STEP_LOCALIZACAO;
    return 2;
  }
  if (!p.dadosIdentificacao?.sexoBiologico) return 3;
  if (!p.dadosIdentificacao?.cpf || (p.dadosIdentificacao.cpf || '').replace(/\D/g, '').length !== 11) return 4;
  const mi = p.dadosClinicos?.medidasIniciais;
  if (!mi?.peso) return 5;
  if (!mi?.altura) return 6;
  const circOk =
    (mi as { circunferenciaNaoInformada?: boolean }).circunferenciaNaoInformada ||
    (mi.circunferenciaAbdominal != null && mi.circunferenciaAbdominal > 0);
  if (!circOk) return 7;
  if (!motivacaoPreenchida(p)) return 8;
  const tipos = (p.dadosClinicos as { diagnosticoPrincipalTipos?: string[] })?.diagnosticoPrincipalTipos;
  const tipo = p.dadosClinicos?.diagnosticoPrincipal?.tipo;
  if (!((tipos && tipos.length > 0) || tipo)) return 9;
  if (temDiabetesSelecionado(p) && !medicamentosDiabetesInformados(p.dadosClinicos)) {
    return META_CHAT_STEP_MEDICAMENTOS_DIABETES;
  }
  const comb = p.dadosClinicos?.comorbidades as Record<string, unknown> | undefined;
  const comorbMarcada = comb && Object.keys(comb).some((k) => k !== 'outraDescricao' && comb[k]);
  const riscos = p.dadosClinicos?.riscos as Record<string, string> | undefined;
  const dc = p.dadosClinicos as { chatComorbidadesEnviado?: boolean } | undefined;
  const jaPassouComorbOuLegado =
    comorbMarcada ||
    dc?.chatComorbidadesEnviado ||
    !!(riscos && riscos.pancreatitePrevia);
  if (!jaPassouComorbOuLegado) return 10;
  if (!cirurgiasInformadas(p.dadosClinicos)) return META_CHAT_STEP_CIRURGIAS;
  const sexo = p.dadosIdentificacao?.sexoBiologico;
  const riskList = filterRiskQuestionsForSexo(sexo);
  const riscosOk = riskList.every((r) => riscos && (riscos as Record<string, string>)[r.key]);
  if (!riscosOk) return 11;
  const historiaTireoide = p.dadosClinicos?.historiaTireoidiana;
  const tireoideOutro = (p.dadosClinicos?.historiaTireoidianaOutro || '').trim();
  if (!(historiaTireoide || tireoideOutro)) return 12;
  const sintomas = p.dadosClinicos?.sintomasGI as Record<string, boolean> | undefined;
  const sintomasOk = sintomas && Object.keys(sintomas).some((k) => sintomas[k]);
  if (!sintomasOk) return 13;
  if (!respostaDepressao(p.dadosClinicos)) return META_CHAT_STEP_DEPRESSAO;
  if (!respostaIdeacao(p.dadosClinicos)) return META_CHAT_STEP_IDEACAO_SUICIDA;
  const obj = p.dadosClinicos?.objetivosTratamento as Record<string, unknown> | undefined;
  const objOk =
    !!obj &&
    (Object.keys(obj).some((k) => !['outroDescricao', 'outro'].includes(k) && obj[k]) ||
      (!!obj.outro && !!(obj.outroDescricao as string)?.trim()));
  if (!metasTratamentoPasso14Ok(p) && !objOk) return 14;
  if (devePularSelecaoMedicoNoChat(p)) return 17;
  return 15;
}

/** Anamnese + perfil metabólico V3 (quando aplicável) preenchidos — pronto para escolher médico/solicitar. */
export function isMetaChatInicialCompleto(
  p: PacienteCompleto,
  introSessionKey: string = META_CHAT_INTRO_SESSION_KEY
): boolean {
  const v2Step = getFirstIncompleteStep(p, introSessionKey);
  if (
    v2Step === META_CHAT_STEP_LOCALIZACAO ||
    v2Step === META_CHAT_STEP_CIRURGIAS ||
    v2Step === META_CHAT_STEP_MEDICAMENTOS_DIABETES ||
    v2Step === META_CHAT_STEP_DEPRESSAO ||
    v2Step === META_CHAT_STEP_IDEACAO_SUICIDA ||
    v2Step <= META_CHAT_STEP_METAS
  ) {
    return false;
  }
  if (deveExibirPerfilMetabolicoV3(p) && !perfilMetabolicoV3Completo(p)) return false;
  const effective = resolveEffectiveChatStep(p, v2Step);
  if (isPerfilMetabolicoChatStep(effective)) return false;
  return true;
}

import type { PacienteCompleto, PerfilMetabolicoV3 } from '@/types/obesidade';
import { metasTratamentoPasso14Ok } from '@/lib/meta/metaChatInicial/resume';

/** Blocos extras V3 — após step 14 (metas), antes de step 15 (busca médico). */
export const STEP_PERFIL_METABOLICO_SONO = 19;
export const STEP_PERFIL_METABOLICO_ATIVIDADE = 20;
export const STEP_PERFIL_METABOLICO_ALIMENTACAO = 21;
export const STEP_PERFIL_METABOLICO_ENERGIA = 22;
export const STEP_PERFIL_METABOLICO_HISTORICO = 23;
export const STEP_PERFIL_METABOLICO_MEDICAMENTOS = 24;
export const STEP_PERFIL_METABOLICO_BARREIRAS = 25;
export const STEP_PERFIL_METABOLICO_EXPECTATIVA = 26;

export const PERFIL_METABOLICO_V3_STEP_FIRST = STEP_PERFIL_METABOLICO_SONO;
export const PERFIL_METABOLICO_V3_STEP_LAST = STEP_PERFIL_METABOLICO_EXPECTATIVA;

export const PERFIL_METABOLICO_V3_BOT_TEXTS: readonly string[] = [
  'Vamos falar do seu sono — isso ajuda a entender energia e recuperação no dia a dia.',
  'Como está sua rotina de movimento e atividade física?',
  'Sobre alimentação: marque o que mais combina com você hoje.',
  'Como está sua energia e o que mais atrapalha uma rotina saudável?',
  'Você já passou por tentativas de emagrecimento antes?',
  'Já usou algum medicamento para emagrecer? Pode marcar mais de uma opção, se for o caso.',
  'O que mais dificulta manter o tratamento no dia a dia?',
  'Qual é sua expectativa de perda de peso com o tratamento?',
];

export function deveExibirPerfilMetabolicoV3(p: PacienteCompleto): boolean {
  return p.dadosClinicos?.tipoAvaliacaoInicial === 'completa';
}

function perfil(p: PacienteCompleto): PerfilMetabolicoV3 | undefined {
  return p.dadosClinicos?.perfilMetabolicoV3;
}

export function blocoSonoCompleto(pm?: PerfilMetabolicoV3): boolean {
  const s = pm?.sono;
  return !!(s?.qualidadeSono && s?.horasSonoMedias);
}

export function blocoAtividadeCompleto(pm?: PerfilMetabolicoV3): boolean {
  return !!pm?.atividadeFisica?.rotinaMovimento;
}

export function blocoAlimentacaoCompleto(pm?: PerfilMetabolicoV3): boolean {
  const a = pm?.alimentacao;
  if (!a) return false;
  return !!(
    a.momentoMaisDificil ||
    a.vontadeDoces ||
    a.beliscaEntreRefeicoes ||
    a.comeAnsiedadeEstresse ||
    a.perdaControleAlimentar
  );
}

export function blocoEnergiaCompleto(pm?: PerfilMetabolicoV3): boolean {
  const e = pm?.energia;
  if (!e?.nivelEnergiaDiaria) return false;
  const b = e.barreirasRotina;
  if (!b || typeof b !== 'object') return false;
  return Object.keys(b).some((k) => k !== 'outroDescricao' && (b as Record<string, boolean>)[k]);
}

export function blocoHistoricoCompleto(pm?: PerfilMetabolicoV3): boolean {
  return !!pm?.historicoEmagrecimento?.jaTentouEmagrecer;
}

export function blocoMedicamentosCompleto(pm?: PerfilMetabolicoV3): boolean {
  const m = pm?.medicamentosPrevios;
  if (!m?.usouMedicacaoParaEmagrecer) return false;
  if (m.usouMedicacaoParaEmagrecer === 'nao') return true;
  if (!m.teveEfeitosColaterais) return false;
  const meds = m.medicacoes;
  if (!meds || typeof meds !== 'object') return false;
  return Object.keys(meds).some((k) => k !== 'outroDescricao' && (meds as Record<string, boolean>)[k]);
}

function medicoResponsavelVinculado(p: PacienteCompleto): boolean {
  return !!(p?.medicoResponsavelId && String(p.medicoResponsavelId).trim());
}

/** Gate V3 na UI: antes da busca (15) ou completar V3 com médico já vinculado (17). */
export function deveRedirecionarParaPerfilMetabolicoV3(p: PacienteCompleto, v2Step: number): boolean {
  if (getFirstIncompletePerfilMetabolicoStep(p) == null) return false;
  if (v2Step === 15) return true;
  if (v2Step === 17 && deveExibirPerfilMetabolicoV3(p) && medicoResponsavelVinculado(p)) return true;
  return false;
}

export function blocoBarreirasCompleto(pm?: PerfilMetabolicoV3): boolean {
  const b = pm?.barreirasAdesao;
  if (!b || typeof b !== 'object') return false;
  return Object.keys(b).some((k) => k !== 'outroDescricao' && (b as Record<string, boolean>)[k]);
}

export function shouldSkipExpectativaPerdaPesoStep(p: PacienteCompleto): boolean {
  return metasTratamentoPasso14Ok(p);
}

/** Deriva faixa de expectativa a partir das metas já definidas no passo 14. */
export function deriveExpectativaPerdaPesoFromMetas(p: PacienteCompleto): NonNullable<PerfilMetabolicoV3['expectativa']>['expectativaPerdaPeso'] {
  const peso0 = p.dadosClinicos?.medidasIniciais?.peso;
  const metas = p.planoTerapeutico?.metas;
  if (!peso0 || !metas) return 'nao_sei';

  let kgLoss = 0;
  if (metas.weightLossTargetType === 'PERCENTUAL' && metas.weightLossTargetValue != null && metas.weightLossTargetValue > 0) {
    kgLoss = (peso0 * metas.weightLossTargetValue) / 100;
  } else if (metas.weightLossTargetType === 'PESO_ABSOLUTO' && metas.weightLossTargetValue != null && metas.weightLossTargetValue > 0) {
    kgLoss = metas.weightLossTargetValue;
  } else {
    return 'nao_sei';
  }

  if (kgLoss <= 5) return 'ate_5kg';
  if (kgLoss <= 10) return '5_10kg';
  if (kgLoss <= 15) return '10_15kg';
  return 'mais_15kg';
}

export function applyExpectativaFromMetas(p: PacienteCompleto): PacienteCompleto {
  if (!shouldSkipExpectativaPerdaPesoStep(p)) return p;
  const expectativaPerdaPeso = deriveExpectativaPerdaPesoFromMetas(p);
  return mergePerfilMetabolicoV3(p, { expectativa: { expectativaPerdaPeso } });
}

export function blocoExpectativaCompleto(pm?: PerfilMetabolicoV3, p?: PacienteCompleto): boolean {
  if (p && shouldSkipExpectativaPerdaPesoStep(p)) return true;
  return !!pm?.expectativa?.expectativaPerdaPeso;
}

export function getLastPerfilMetabolicoStepBeforeMedico(p: PacienteCompleto): number {
  if (shouldSkipExpectativaPerdaPesoStep(p)) return STEP_PERFIL_METABOLICO_BARREIRAS;
  return PERFIL_METABOLICO_V3_STEP_LAST;
}

export function countPerfilMetabolicoV3WizardSteps(p: PacienteCompleto): number {
  if (!deveExibirPerfilMetabolicoV3(p)) return 0;
  // Wizard não exibe expectativa de kg (já definida nas metas) — sempre 7 telas V3.
  return 7;
}

const BLOCO_CHECKS: { step: number; ok: (pm?: PerfilMetabolicoV3, p?: PacienteCompleto) => boolean }[] = [
  { step: STEP_PERFIL_METABOLICO_SONO, ok: blocoSonoCompleto },
  { step: STEP_PERFIL_METABOLICO_ATIVIDADE, ok: blocoAtividadeCompleto },
  { step: STEP_PERFIL_METABOLICO_ALIMENTACAO, ok: blocoAlimentacaoCompleto },
  { step: STEP_PERFIL_METABOLICO_ENERGIA, ok: blocoEnergiaCompleto },
  { step: STEP_PERFIL_METABOLICO_HISTORICO, ok: blocoHistoricoCompleto },
  { step: STEP_PERFIL_METABOLICO_MEDICAMENTOS, ok: blocoMedicamentosCompleto },
  { step: STEP_PERFIL_METABOLICO_BARREIRAS, ok: blocoBarreirasCompleto },
  { step: STEP_PERFIL_METABOLICO_EXPECTATIVA, ok: (pm, p) => blocoExpectativaCompleto(pm, p) },
];

export function perfilMetabolicoV3Completo(p: PacienteCompleto): boolean {
  if (!deveExibirPerfilMetabolicoV3(p)) return true;
  const pm = perfil(p);
  return BLOCO_CHECKS.every((b) => b.ok(pm, p));
}

/** Primeiro bloco V3 incompleto (19–26), ou null se todos ok / modo essencial. */
export function getFirstIncompletePerfilMetabolicoStep(p: PacienteCompleto): number | null {
  if (!deveExibirPerfilMetabolicoV3(p)) return null;
  const pm = perfil(p);
  for (const { step, ok } of BLOCO_CHECKS) {
    if (!ok(pm, p)) return step;
  }
  return null;
}

/**
 * Step efetivo no chat: V2 (`getFirstIncompleteStep`) + gate V3 (UI apenas).
 * - v2Step 15 + V3 pendente → blocos 19–26 (não abre busca ainda)
 * - v2Step 17 + completa + médico vinculado + V3 pendente → 19–26 (step 17 V2 inalterado)
 * - v2Step 16 → nunca redireciona para V3 (evita sair da lista de médicos no reload)
 * Não altera `getFirstIncompleteStep`.
 */
export function resolveEffectiveChatStep(
  p: PacienteCompleto,
  v2Step: number
): number {
  if (!deveRedirecionarParaPerfilMetabolicoV3(p, v2Step)) return v2Step;
  return getFirstIncompletePerfilMetabolicoStep(p) ?? v2Step;
}

export function getPerfilMetabolicoBotText(step: number): string | null {
  if (step < PERFIL_METABOLICO_V3_STEP_FIRST || step > PERFIL_METABOLICO_V3_STEP_LAST) return null;
  return PERFIL_METABOLICO_V3_BOT_TEXTS[step - PERFIL_METABOLICO_V3_STEP_FIRST] ?? null;
}

export function isPerfilMetabolicoChatStep(step: number): boolean {
  return step >= PERFIL_METABOLICO_V3_STEP_FIRST && step <= PERFIL_METABOLICO_V3_STEP_LAST;
}

export function mergePerfilMetabolicoV3(
  p: PacienteCompleto,
  patch: Partial<PerfilMetabolicoV3>
): PacienteCompleto {
  return {
    ...p,
    dadosClinicos: {
      ...p.dadosClinicos,
      perfilMetabolicoV3: {
        ...(p.dadosClinicos?.perfilMetabolicoV3 || {}),
        ...patch,
      },
    },
  };
}

/**
 * Snapshot persistido da anamnese nutricional (wizard Nutri).
 * Fonte clínica estruturada — não altera cardápio/macros nesta etapa.
 */

export type AnamneseObjetivoPrincipal =
  | 'perda_peso'
  | 'recomposicao'
  | 'controle_glicemia'
  | 'melhora_disposicao'
  | 'manutencao';

export type AnamneseIntensidadeDesejada = 'leve' | 'moderada' | 'intensiva';

export type AnamneseHorarioTrabalho = 'diurno' | 'noturno' | 'turnos';
export type AnamneseHorasSentado = '<4h' | '4-8h' | '>8h';
export type AnamneseSimNao = 'sim' | 'nao';
export type AnamneseAtividadeFisica = 'nunca' | '1-2x' | '3-4x' | '5-7x';
export type AnamneseSonoHoras = '<6h' | '6-8h' | '>8h';
export type AnamneseHorarioDormir = '22-00' | '00-02' | 'depois_02h';
export type AnamneseAcordaDescansado = 'sim' | 'nao' | 'as_vezes';
export type AnamneseNumeroRefeicoesDia = '2-3' | '4-5' | '>5';
export type AnamneseDosesAlcoolSemana = '0' | '1-3' | '4-7' | '>7';
export type AnamneseFinalSemanaSaiDieta = 'quase_nunca' | 'as_vezes' | 'sempre';
export type AnamneseSintomasGI = 'nenhum' | 'leve' | 'moderado' | 'grave';

/** Entrada do snapshot — espelha WizardData do NutriContent (sem acoplar ao componente). */
export interface AnamneseWizardInput {
  objetivoPrincipal: AnamneseObjetivoPrincipal;
  intensidadeDesejada: AnamneseIntensidadeDesejada;
  horarioTrabalho: AnamneseHorarioTrabalho;
  horasSentado: AnamneseHorasSentado;
  dietaUltimos12Meses: AnamneseSimNao;
  tipoDieta?: string;
  efeitoSanfona: AnamneseSimNao;
  kgSanfona?: number;
  pesoMaximo2Anos?: number;
  pesoMinimo2Anos?: number;
  fomeMatinal: number;
  fomeNoturna: number;
  vontadeDoce: number;
  pulaCafeManha: boolean;
  chegaComMuitaFomeJantar: boolean;
  atividadeFisica: AnamneseAtividadeFisica;
  sonoHoras: AnamneseSonoHoras;
  horarioDormir: AnamneseHorarioDormir;
  acordaDescansado: AnamneseAcordaDescansado;
  numeroRefeicoesDia: AnamneseNumeroRefeicoesDia;
  comportamentosAlimentares: string[];
  fomeEmocional: boolean;
  compulsaoNoturna: boolean;
  dosesAlcoolSemana: AnamneseDosesAlcoolSemana;
  finalSemanaSaiDieta: AnamneseFinalSemanaSaiDieta;
  restricoes: string[];
  preferenciasProteina: string[];
  sintomasGI: AnamneseSintomasGI;
}

/** Campos comuns a todas as versões do snapshot (sem intensidade). */
interface AnamneseNutricionalSnapshotCamposBase {
  preenchidaEm: string;
  objetivoPrincipal: AnamneseObjetivoPrincipal;
  horarioTrabalho: AnamneseHorarioTrabalho;
  horasSentado: AnamneseHorasSentado;
  dietaUltimos12Meses: AnamneseSimNao;
  tipoDieta: string;
  efeitoSanfona: AnamneseSimNao;
  kgSanfona: number | null;
  pesoMaximo2Anos: number | null;
  pesoMinimo2Anos: number | null;
  fomeMatinal: number;
  fomeNoturna: number;
  vontadeDoce: number;
  pulaCafeManha: boolean;
  chegaComMuitaFomeJantar: boolean;
  atividadeFisica: AnamneseAtividadeFisica;
  sonoHoras: AnamneseSonoHoras;
  horarioDormir: AnamneseHorarioDormir;
  acordaDescansado: AnamneseAcordaDescansado;
  numeroRefeicoesDia: AnamneseNumeroRefeicoesDia;
  comportamentosAlimentares: string[];
  fomeEmocional: boolean;
  compulsaoNoturna: boolean;
  dosesAlcoolSemana: AnamneseDosesAlcoolSemana;
  finalSemanaSaiDieta: AnamneseFinalSemanaSaiDieta;
  restricoes: string[];
  preferenciasProteina: string[];
  sintomasGI: AnamneseSintomasGI;
}

/** Snapshot ETAPA 1 — sem intensidade desejada. */
export interface AnamneseNutricionalSnapshotV1 extends AnamneseNutricionalSnapshotCamposBase {
  versao: 1;
}

/** Snapshot ETAPA 2 — inclui intensidade desejada pelo paciente. */
export interface AnamneseNutricionalSnapshotV2 extends AnamneseNutricionalSnapshotCamposBase {
  versao: 2;
  intensidadeDesejada: AnamneseIntensidadeDesejada;
}

export type AnamneseNutricionalSnapshot =
  | AnamneseNutricionalSnapshotV1
  | AnamneseNutricionalSnapshotV2;

/** Versão gravada por `criarSnapshotAnamneseNutricional` (atual = 2). */
export const ANAMNESE_SNAPSHOT_VERSAO = 2 as const;

export const INTENSIDADE_DESEJADA_PADRAO: AnamneseIntensidadeDesejada = 'moderada';

function clampEscala0a10(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Math.min(10, Math.max(0, valor));
}

/** Números opcionais: NaN / undefined / string vazia → null. */
function normalizarNumeroOpcional(valor: unknown): number | null {
  if (valor === undefined || valor === null || valor === '') return null;
  if (typeof valor === 'number') {
    return Number.isFinite(valor) ? valor : null;
  }
  if (typeof valor === 'string') {
    const trimmed = valor.trim();
    if (!trimmed) return null;
    const n = Number(trimmed);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function montarCamposBase(wizard: AnamneseWizardInput): AnamneseNutricionalSnapshotCamposBase {
  return {
    preenchidaEm: new Date().toISOString(),
    objetivoPrincipal: wizard.objetivoPrincipal,
    horarioTrabalho: wizard.horarioTrabalho,
    horasSentado: wizard.horasSentado,
    dietaUltimos12Meses: wizard.dietaUltimos12Meses,
    tipoDieta: typeof wizard.tipoDieta === 'string' ? wizard.tipoDieta : '',
    efeitoSanfona: wizard.efeitoSanfona,
    kgSanfona: normalizarNumeroOpcional(wizard.kgSanfona),
    pesoMaximo2Anos: normalizarNumeroOpcional(wizard.pesoMaximo2Anos),
    pesoMinimo2Anos: normalizarNumeroOpcional(wizard.pesoMinimo2Anos),
    fomeMatinal: clampEscala0a10(wizard.fomeMatinal),
    fomeNoturna: clampEscala0a10(wizard.fomeNoturna),
    vontadeDoce: clampEscala0a10(wizard.vontadeDoce),
    pulaCafeManha: Boolean(wizard.pulaCafeManha),
    chegaComMuitaFomeJantar: Boolean(wizard.chegaComMuitaFomeJantar),
    atividadeFisica: wizard.atividadeFisica,
    sonoHoras: wizard.sonoHoras,
    horarioDormir: wizard.horarioDormir,
    acordaDescansado: wizard.acordaDescansado,
    numeroRefeicoesDia: wizard.numeroRefeicoesDia,
    comportamentosAlimentares: [...(wizard.comportamentosAlimentares || [])],
    fomeEmocional: Boolean(wizard.fomeEmocional),
    compulsaoNoturna: Boolean(wizard.compulsaoNoturna),
    dosesAlcoolSemana: wizard.dosesAlcoolSemana,
    finalSemanaSaiDieta: wizard.finalSemanaSaiDieta,
    restricoes: [...(wizard.restricoes || [])],
    preferenciasProteina: [...(wizard.preferenciasProteina || [])],
    sintomasGI: wizard.sintomasGI,
  };
}

/**
 * Cópia estruturada e determinística das respostas do wizard (versão atual = 2).
 * Não escreve Firestore, não gera plano, não calcula macros.
 */
export function criarSnapshotAnamneseNutricional(
  wizard: AnamneseWizardInput
): AnamneseNutricionalSnapshotV2 {
  return {
    versao: ANAMNESE_SNAPSHOT_VERSAO,
    ...montarCamposBase(wizard),
    intensidadeDesejada: wizard.intensidadeDesejada,
  };
}

/** Compatibilidade: planos antigos sem snapshot não inventam respostas. */
export function planoTemAnamneseNutricional(plano: object): boolean {
  const snap = (plano as { anamneseNutricional?: AnamneseNutricionalSnapshot | null })
    .anamneseNutricional;
  return snap !== undefined && snap !== null && typeof snap === 'object';
}

/** Plano com estilo e proteína — cálculos alimentares já gerados (além do questionário). */
export function planoTemCalculosNutricionais(plano: object): boolean {
  const data = plano as { estilo?: unknown; protDia_g?: unknown };
  return (
    typeof data.estilo === 'string' &&
    data.estilo.trim().length > 0 &&
    typeof data.protDia_g === 'number' &&
    Number.isFinite(data.protDia_g) &&
    data.protDia_g > 0
  );
}

/** Prefill do wizard a partir do snapshot (link público ou plano incompleto). */
export function wizardFromAnamneseSnapshot(
  snap: AnamneseNutricionalSnapshot
): AnamneseWizardInput {
  return {
    objetivoPrincipal: snap.objetivoPrincipal,
    intensidadeDesejada: obterIntensidadeDesejadaDoSnapshot(snap) ?? INTENSIDADE_DESEJADA_PADRAO,
    horarioTrabalho: snap.horarioTrabalho,
    horasSentado: snap.horasSentado,
    dietaUltimos12Meses: snap.dietaUltimos12Meses,
    tipoDieta: snap.tipoDieta || '',
    efeitoSanfona: snap.efeitoSanfona,
    kgSanfona: snap.kgSanfona ?? undefined,
    pesoMaximo2Anos: snap.pesoMaximo2Anos ?? undefined,
    pesoMinimo2Anos: snap.pesoMinimo2Anos ?? undefined,
    fomeMatinal: snap.fomeMatinal,
    fomeNoturna: snap.fomeNoturna,
    vontadeDoce: snap.vontadeDoce,
    pulaCafeManha: snap.pulaCafeManha,
    chegaComMuitaFomeJantar: snap.chegaComMuitaFomeJantar,
    atividadeFisica: snap.atividadeFisica,
    sonoHoras: snap.sonoHoras,
    horarioDormir: snap.horarioDormir,
    acordaDescansado: snap.acordaDescansado,
    numeroRefeicoesDia: snap.numeroRefeicoesDia,
    comportamentosAlimentares: snap.comportamentosAlimentares || [],
    fomeEmocional: snap.fomeEmocional,
    compulsaoNoturna: snap.compulsaoNoturna,
    dosesAlcoolSemana: snap.dosesAlcoolSemana,
    finalSemanaSaiDieta: snap.finalSemanaSaiDieta,
    restricoes: snap.restricoes || [],
    preferenciasProteina: snap.preferenciasProteina || [],
    sintomasGI: snap.sintomasGI,
  };
}

export function isAnamneseSnapshotV2(
  snap: AnamneseNutricionalSnapshot | null | undefined
): snap is AnamneseNutricionalSnapshotV2 {
  return snap != null && snap.versao === 2 && 'intensidadeDesejada' in snap;
}

/**
 * Retorna a intensidade declarada apenas se o snapshot for v2.
 * Não inventa `moderada` para v1 ou planos sem snapshot.
 */
export function obterIntensidadeDesejadaDoSnapshot(
  snap: AnamneseNutricionalSnapshot | null | undefined
): AnamneseIntensidadeDesejada | undefined {
  if (!isAnamneseSnapshotV2(snap)) return undefined;
  return snap.intensidadeDesejada;
}

export function rotuloIntensidadeDesejada(
  valor: AnamneseIntensidadeDesejada
): string {
  if (valor === 'leve') return 'Leve';
  if (valor === 'intensiva') return 'Intensiva';
  return 'Moderada';
}

import type {
  CheckInSemanalNutriAlimentacaoForaPlano,
  CheckInSemanalNutriAnswers,
  CheckInSemanalNutriConquistaTipo,
  CheckInSemanalNutriDificuldadeTipo,
  CheckInSemanalNutriMediaSono,
  CheckInSemanalNutriQuestionnaireVersion,
  CheckInSemanalNutriSeveridadeGI,
  CheckInSemanalNutriSuplementosAplicaveis,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import {
  CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
  SUPLEMENTOS_APLICAVEIS_TODOS,
  isWeeklyNutritionQuestionnaireV3,
} from '@/lib/nutri/checkInSemanalNutriTypes';
import { HYDRATION_QUALITY_OPTIONS } from '@/lib/nutri/checkInSemanalNutriV3';

export type CheckInSemanalNutriQuestionType =
  | 'slider'
  | 'days'
  | 'days_plus'
  | 'single_choice'
  | 'multi_choice'
  | 'scale'
  | 'textarea'
  | 'daily_rating'
  | 'meal_adherence'
  | 'energy_bar'
  | 'exercise_days';

export type CheckInSemanalNutriStepId =
  | 'semana'
  | 'cardapio'
  | 'alimentacao'
  | 'hidratacao'
  | 'corpo'
  | 'rotina'
  | 'nutricionista';

export type CheckInSemanalNutriChoiceOption<T extends string = string> = {
  value: T;
  label: string;
};

export type CheckInSemanalNutriQuestionContext = {
  answers: Record<string, string>;
  suplementosAplicaveis?: CheckInSemanalNutriSuplementosAplicaveis;
  metaAguaMl?: number;
  hasMenu?: boolean;
};

export type CheckInSemanalNutriQuestion = {
  id: string;
  step: CheckInSemanalNutriStepId;
  type: CheckInSemanalNutriQuestionType;
  title: string;
  required: boolean;
  helperText?: string;
  placeholder?: string;
  min?: number;
  max?: number;
  stepValue?: number;
  unit?: string;
  options?: CheckInSemanalNutriChoiceOption[];
  showIf?: (ctx: CheckInSemanalNutriQuestionContext) => boolean;
  hintFromContext?: (ctx: CheckInSemanalNutriQuestionContext) => string | undefined;
};

export const CHECK_IN_SEMANAL_NUTRI_STEP_LABEL: Record<CheckInSemanalNutriStepId, string> = {
  semana: 'Como foi sua semana',
  cardapio: 'Como foi seu cardápio',
  alimentacao: 'Sua alimentação',
  hidratacao: 'Hidratação',
  corpo: 'Como seu corpo respondeu',
  rotina: 'Rotina e desafios',
  nutricionista: 'Para o seu nutricionista',
};

export const ALIMENTACAO_FORA_PLANO_OPCOES: CheckInSemanalNutriChoiceOption<CheckInSemanalNutriAlimentacaoForaPlano>[] =
  [
    { value: 'nenhuma', label: 'Não aconteceu' },
    { value: 'pouca', label: 'Poucas vezes' },
    { value: 'moderada', label: 'Algumas vezes' },
    { value: 'frequente', label: 'Com frequência' },
  ];

export const SEVERIDADE_GI_OPCOES: CheckInSemanalNutriChoiceOption<CheckInSemanalNutriSeveridadeGI>[] = [
  { value: 'nenhum', label: 'Nenhuma' },
  { value: 'leve', label: 'Leve' },
  { value: 'moderado', label: 'Moderada' },
  { value: 'grave', label: 'Grave' },
];

/** Apenas para leitura de registros V1. */
export const MEDIA_SONO_OPCOES: CheckInSemanalNutriChoiceOption<CheckInSemanalNutriMediaSono>[] = [
  { value: 'menos_6h', label: 'Menos de 6 horas por noite' },
  { value: '6_8h', label: 'Entre 6 e 8 horas' },
  { value: 'mais_8h', label: 'Mais de 8 horas' },
];

export const ENERGIA_SEMANA_OPCOES: CheckInSemanalNutriChoiceOption[] = [
  { value: '1', label: '1 · Muito baixa' },
  { value: '2', label: '2 · Baixa' },
  { value: '3', label: '3 · Regular' },
  { value: '4', label: '4 · Boa' },
  { value: '5', label: '5 · Muito boa' },
];

export const PRINCIPAL_DIFICULDADE_OPCOES: CheckInSemanalNutriChoiceOption<CheckInSemanalNutriDificuldadeTipo>[] =
  [
    { value: 'falta_tempo', label: 'Falta de tempo para preparar as refeições' },
    { value: 'comer_fora', label: 'Comi fora de casa muitas vezes' },
    { value: 'eventos_sociais', label: 'Eventos sociais / festas / finais de semana' },
    { value: 'vontade_doces', label: 'Vontade de comer doces' },
    { value: 'fome_aumentada', label: 'Fome acima do habitual' },
    { value: 'ansiedade', label: 'Ansiedade / vontade de comer sem fome' },
    { value: 'horarios', label: 'Dificuldade em organizar os horários' },
    { value: 'falta_alimentos', label: 'Não consegui manter os alimentos planejados disponíveis' },
    { value: 'sem_dificuldade', label: 'Não tive dificuldade relevante' },
    { value: 'outra', label: 'Outra' },
  ];

export const PRINCIPAL_CONQUISTA_OPCOES: CheckInSemanalNutriChoiceOption<CheckInSemanalNutriConquistaTipo>[] =
  [
    { value: 'aderencia', label: 'Consegui seguir melhor o planejamento' },
    { value: 'organizacao', label: 'Organizei minhas refeições com antecedência' },
    { value: 'proteina', label: 'Atingi minha meta de proteína com mais frequência' },
    { value: 'hidratacao', label: 'Bebi mais água' },
    { value: 'frutas_vegetais', label: 'Comi mais frutas e vegetais' },
    { value: 'reduziu_extras', label: 'Reduzi doces / alimentos fora do planejamento' },
    { value: 'boas_escolhas_fora', label: 'Consegui fazer melhores escolhas fora de casa' },
    { value: 'controle_fome', label: 'Controlei melhor a fome / vontade de comer' },
    { value: 'atividade', label: 'Mantive atividade física com regularidade' },
    { value: 'sem_conquista', label: 'Não percebi uma conquista específica' },
    { value: 'outra', label: 'Outra' },
  ];

const DAYS_0_7: CheckInSemanalNutriChoiceOption[] = Array.from({ length: 8 }, (_, i) => ({
  value: String(i),
  label: String(i),
}));

const DAYS_0_7_PLUS: CheckInSemanalNutriChoiceOption[] = [
  ...DAYS_0_7.slice(0, 7),
  { value: '7', label: '7' },
  { value: '8', label: '7+' },
];

export const CHECK_IN_SEMANAL_NUTRI_QUESTIONS: CheckInSemanalNutriQuestion[] = [
  {
    id: 'aderenciaPlano',
    step: 'alimentacao',
    type: 'slider',
    title: 'Quanto você conseguiu seguir seu planejamento alimentar nesta semana?',
    required: true,
    min: 0,
    max: 100,
    stepValue: 5,
    unit: '%',
  },
  {
    id: 'diasProteinaMeta',
    step: 'alimentacao',
    type: 'days',
    title: 'Em quantos dias desta semana você conseguiu atingir sua meta de proteína?',
    required: true,
    min: 0,
    max: 7,
    options: DAYS_0_7,
  },
  {
    id: 'diasFrutasVegetais',
    step: 'alimentacao',
    type: 'days',
    title: 'Em quantos dias você conseguiu consumir frutas e vegetais conforme seu planejamento?',
    required: true,
    min: 0,
    max: 7,
    options: DAYS_0_7,
  },
  {
    id: 'alimentacaoForaPlano',
    step: 'alimentacao',
    type: 'single_choice',
    title: 'Como foi sua alimentação fora do planejado nesta semana?',
    required: true,
    options: ALIMENTACAO_FORA_PLANO_OPCOES,
  },
  {
    id: 'diasMetaAgua',
    step: 'hidratacao',
    type: 'days',
    title: 'Em quantos dias desta semana você conseguiu atingir sua meta de água?',
    required: true,
    min: 0,
    max: 7,
    options: DAYS_0_7,
    hintFromContext: (ctx) =>
      ctx.metaAguaMl != null && ctx.metaAguaMl > 0
        ? `Sua meta atual: ${ctx.metaAguaMl.toLocaleString('pt-BR')} mL/dia`
        : undefined,
  },
  {
    id: 'nauseas',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou náuseas?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'constipacao',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou constipação intestinal?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'diarreia',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou diarreia?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'energiaSemana',
    step: 'corpo',
    type: 'scale',
    title: 'Como você avalia sua energia e disposição nesta semana?',
    helperText: '1 = Muito baixa · 2 = Baixa · 3 = Regular · 4 = Boa · 5 = Muito boa',
    required: true,
    min: 1,
    max: 5,
    stepValue: 1,
    options: ENERGIA_SEMANA_OPCOES,
  },
  {
    id: 'sessoesAtividadeFisica',
    step: 'rotina',
    type: 'days_plus',
    title: 'Quantas vezes você praticou atividade física nesta semana?',
    required: true,
    min: 0,
    max: 8,
    options: DAYS_0_7_PLUS,
  },
  {
    id: 'principalDificuldadeTipo',
    step: 'rotina',
    type: 'single_choice',
    title: 'Qual foi sua principal dificuldade para seguir o planejamento alimentar nesta semana?',
    required: true,
    options: PRINCIPAL_DIFICULDADE_OPCOES,
  },
  {
    id: 'principalDificuldadeOutra',
    step: 'rotina',
    type: 'textarea',
    title: 'Conte qual foi a principal dificuldade.',
    required: true,
    placeholder: 'Descreva em poucas palavras...',
    showIf: (ctx) => ctx.answers.principalDificuldadeTipo === 'outra',
  },
  {
    id: 'principalConquistaTipo',
    step: 'rotina',
    type: 'single_choice',
    title: 'Qual foi sua principal conquista nesta semana?',
    required: true,
    options: PRINCIPAL_CONQUISTA_OPCOES,
  },
  {
    id: 'principalConquistaOutra',
    step: 'rotina',
    type: 'textarea',
    title: 'Conte qual foi sua conquista.',
    required: true,
    placeholder: 'Descreva em poucas palavras...',
    showIf: (ctx) => ctx.answers.principalConquistaTipo === 'outra',
  },
  {
    id: 'observacoes',
    step: 'nutricionista',
    type: 'textarea',
    title:
      'Tem algo que você gostaria que seu nutricionista soubesse antes de planejar ou ajustar sua próxima semana?',
    required: false,
    placeholder: 'Opcional — recados, dúvidas ou pedidos de ajuste...',
  },
];

export const CHECK_IN_SEMANAL_NUTRI_QUESTIONS_V3: CheckInSemanalNutriQuestion[] = [
  {
    id: 'dailyAdherence',
    step: 'semana',
    type: 'daily_rating',
    title: 'Como foi sua alimentação em cada dia?',
    helperText: 'Boa · Regular · Ruim',
    required: true,
  },
  {
    id: 'mealAdherence',
    step: 'cardapio',
    type: 'meal_adherence',
    title: 'Como foi cada refeição do seu cardápio?',
    required: true,
    showIf: (ctx) => Boolean(ctx.hasMenu),
  },
  {
    id: 'hydrationQuality',
    step: 'hidratacao',
    type: 'single_choice',
    title: 'Como foi sua hidratação na maior parte da semana?',
    required: true,
    options: HYDRATION_QUALITY_OPTIONS,
    hintFromContext: (ctx) =>
      ctx.metaAguaMl != null && ctx.metaAguaMl > 0
        ? `Sua meta: ${ctx.metaAguaMl.toLocaleString('pt-BR')} mL/dia`
        : undefined,
  },
  {
    id: 'nauseas',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou náuseas?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'constipacao',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou constipação intestinal?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'diarreia',
    step: 'corpo',
    type: 'single_choice',
    title: 'Durante esta semana, você apresentou diarreia?',
    required: true,
    options: SEVERIDADE_GI_OPCOES,
  },
  {
    id: 'energiaSemana',
    step: 'corpo',
    type: 'energy_bar',
    title: 'Como está sua energia e disposição nesta semana?',
    helperText: 'Deslize o marcador com o dedo: quanto mais à direita, mais energia você sentiu.',
    required: true,
    min: 0,
    max: 100,
  },
  {
    id: 'sessoesAtividadeFisica',
    step: 'rotina',
    type: 'exercise_days',
    title: 'Em quais dias você praticou atividade física?',
    required: true,
  },
  {
    id: 'principalDificuldadeTipo',
    step: 'rotina',
    type: 'multi_choice',
    title: 'Pensando principalmente nos dias que você marcou como Regular ou Ruim, quais foram suas maiores dificuldades?',
    required: true,
    options: PRINCIPAL_DIFICULDADE_OPCOES,
  },
  {
    id: 'principalDificuldadeOutra',
    step: 'rotina',
    type: 'textarea',
    title: 'Conte qual foi a principal dificuldade.',
    required: true,
    placeholder: 'Descreva em poucas palavras...',
    showIf: (ctx) => {
      try {
        const parsed = JSON.parse(ctx.answers.principalDificuldadeTipo || '[]') as unknown;
        return Array.isArray(parsed) && parsed.includes('outra');
      } catch {
        return ctx.answers.principalDificuldadeTipo === 'outra';
      }
    },
  },
  {
    id: 'principalConquistaTipo',
    step: 'rotina',
    type: 'multi_choice',
    title: 'Quais foram suas principais conquistas nesta semana?',
    required: true,
    options: PRINCIPAL_CONQUISTA_OPCOES,
  },
  {
    id: 'principalConquistaOutra',
    step: 'rotina',
    type: 'textarea',
    title: 'Conte qual foi sua conquista.',
    required: true,
    placeholder: 'Descreva em poucas palavras...',
    showIf: (ctx) => {
      try {
        const parsed = JSON.parse(ctx.answers.principalConquistaTipo || '[]') as unknown;
        return Array.isArray(parsed) && parsed.includes('outra');
      } catch {
        return ctx.answers.principalConquistaTipo === 'outra';
      }
    },
  },
  {
    id: 'observacoes',
    step: 'nutricionista',
    type: 'textarea',
    title:
      'Tem algo que você gostaria que seu nutricionista soubesse antes de planejar ou ajustar sua próxima semana?',
    required: false,
    placeholder: 'Opcional — recados, dúvidas ou pedidos de ajuste...',
  },
];

export function getCheckInSemanalNutriQuestions(
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
): CheckInSemanalNutriQuestion[] {
  return isWeeklyNutritionQuestionnaireV3(version)
    ? CHECK_IN_SEMANAL_NUTRI_QUESTIONS_V3
    : CHECK_IN_SEMANAL_NUTRI_QUESTIONS;
}

export function visibleCheckInSemanalNutriQuestions(
  ctx: CheckInSemanalNutriQuestionContext,
  version?: CheckInSemanalNutriQuestionnaireVersion | string | null
): CheckInSemanalNutriQuestion[] {
  return getCheckInSemanalNutriQuestions(version).filter((q) => (q.showIf ? q.showIf(ctx) : true));
}

export function checkInSemanalNutriQuestionnaireMeta() {
  return {
    questionnaireVersion: CHECK_IN_SEMANAL_NUTRI_QUESTIONNAIRE_VERSION,
    questionCount: CHECK_IN_SEMANAL_NUTRI_QUESTIONS_V3.length,
  };
}

export function rotuloOpcao<T extends string>(
  options: CheckInSemanalNutriChoiceOption<T>[],
  value: T | undefined
): string {
  if (!value) return '—';
  return options.find((o) => o.value === value)?.label ?? value;
}

export function textoDificuldadeCheckIn(answers: Partial<CheckInSemanalNutriAnswers>): string {
  const tipos =
    answers.principalDificuldadeTipos?.length
      ? answers.principalDificuldadeTipos
      : answers.principalDificuldadeTipo
        ? [answers.principalDificuldadeTipo]
        : [];
  if (tipos.length === 0) return answers.principalDificuldade?.trim() || '';
  return tipos
    .map((tipo) =>
      tipo === 'outra'
        ? answers.principalDificuldadeOutra?.trim() || 'Outra'
        : rotuloOpcao(PRINCIPAL_DIFICULDADE_OPCOES, tipo)
    )
    .join(' · ');
}

export function textoConquistaCheckIn(answers: Partial<CheckInSemanalNutriAnswers>): string {
  const tipos =
    answers.principalConquistaTipos?.length
      ? answers.principalConquistaTipos
      : answers.principalConquistaTipo
        ? [answers.principalConquistaTipo]
        : [];
  if (tipos.length === 0) return answers.principalConquista?.trim() || '';
  return tipos
    .map((tipo) =>
      tipo === 'outra'
        ? answers.principalConquistaOutra?.trim() || 'Outra'
        : rotuloOpcao(PRINCIPAL_CONQUISTA_OPCOES, tipo)
    )
    .join(' · ');
}

/** @deprecated V2 não pergunta suplementos. Mantido só para leitura de código antigo. */
export function resolverSuplementosAplicaveisDoPlano(
  _suplementos?: { probiotico?: string; whey?: string; creatina?: string } | null
): CheckInSemanalNutriSuplementosAplicaveis {
  return SUPLEMENTOS_APLICAVEIS_TODOS;
}

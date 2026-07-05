import type { AlternativaLetra } from '@/types/oftpayQuestoes';

export const OFTPAY_QUESTOES_COURSE_ID = 'oftreview' as const;

export const QUESTAO_ALTERNATIVA_MIN = 4;
export const QUESTAO_ALTERNATIVA_MAX = 5;

export const QUESTAO_ALTERNATIVA_LETRAS: readonly AlternativaLetra[] = [
  'A',
  'B',
  'C',
  'D',
  'E',
] as const;

export const QUESTAO_DIFICULDADES = ['facil', 'medio', 'dificil'] as const;

export const QUESTAO_STATUS_VALUES = ['rascunho', 'revisao', 'publicado'] as const;

/** Padrão glob oficial das apostilas Oftreview (geração futura de questões). */
export const OFTREVIEW_APOSTILAS_GCS_GLOB =
  'gs://oftware/OFTREVIEW 2023/APOSTILAS/*.pdf';

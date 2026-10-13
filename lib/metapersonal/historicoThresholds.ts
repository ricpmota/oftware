/**
 * Thresholds da página Histórico & Estatísticas (MetaPersonal).
 * Centralizados para ajuste sem espalhar ifs nos componentes.
 */

export const HISTORY_PERIOD_OPTIONS = [7, 30, 90, 180, 365] as const;
export type HistoryPeriodDays = (typeof HISTORY_PERIOD_OPTIONS)[number];
export const HISTORY_DEFAULT_PERIOD_DAYS: HistoryPeriodDays = 30;

/** Lookback extra para sequência e último treino, além do período + período anterior. */
export const HISTORY_STREAK_LOOKBACK_DAYS = 180;

export const HISTORY_LAST_7_DAYS = 7;

export const HISTORY_PERFORMANCE_THRESHOLDS = {
  excelenteMin: 85,
  boaMin: 70,
  atencaoMin: 40,
} as const;

export const HISTORY_ATTENTION_THRESHOLDS = {
  criticalAdherence: 40,
  warningAdherence: 70,
  consecutiveMissesHigh: 2,
  daysWithoutTrainingHigh: 7,
  dropSignificantPoints: 15,
} as const;

/** Diferença em pontos percentuais para ↗ / → / ↓. */
export const HISTORY_EVOLUTION_SIGNIFICANT_POINTS = 5;

export const HISTORY_CONSISTENCY_STATUSES = ['excelente', 'boa'] as const;

export const HISTORY_PERIOD_LABELS: Record<HistoryPeriodDays, string> = {
  7: 'Últimos 7 dias',
  30: 'Últimos 30 dias',
  90: 'Últimos 90 dias',
  180: 'Últimos 6 meses',
  365: 'Últimos 12 meses',
};

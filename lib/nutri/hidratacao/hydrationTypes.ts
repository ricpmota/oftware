/**
 * Controle diário de hidratação (ETAPA 01).
 *
 * A meta oficial continua em `pacientes_completos/{id}/nutricao/plano.aguaDia_ml`.
 * Cada dia persiste o próprio `goalMl` para o histórico não mudar se a meta futura mudar.
 *
 * Coleção:
 * pacientes_completos/{pacienteId}/nutricao/dados/hidratacao/{YYYY-MM-DD}
 */

export const HYDRATION_COLLECTION = 'hidratacao';

export type HydrationSource = 'patient_portal' | 'whatsapp_checkin' | 'professional';

export type HydrationAdherenceStatus =
  | 'meta_atingida'
  | 'proximo_da_meta'
  | 'abaixo_da_meta'
  | 'baixa_adesao'
  | 'nao_informado';

export type HydrationRecord = {
  date: string;
  goalMl: number;
  consumedMl: number;
  percentage: number;
  goalReached: boolean;
  source: HydrationSource;
  patientId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
  /** Preenchido na primeira vez em que o consumo atinge a meta daquele dia. */
  goalReachedAt?: Date;
  /** Última origem que alterou o consumo (prepara Canal Chat / profissional). */
  lastSource?: HydrationSource;
};

export type HydrationDayView = {
  date: string;
  record: HydrationRecord | null;
};

export type HydrationWeeklySummary = {
  daysInPeriod: number;
  daysRegistered: number;
  daysWithoutRecord: number;
  daysGoalReached: number;
  /** Média em ml apenas dos dias com registro. Null se nenhum dia registrado. */
  averageConsumedMl: number | null;
  /** Média de adesão (consumed/goal) apenas dos dias com registro. */
  averageAdherencePct: number | null;
};

export const HYDRATION_QUICK_ADD_ML = [200, 300, 500] as const;

/** Teto por lançamento — evita toques acidentais absurdos, não a meta. */
export const HYDRATION_MAX_ADD_ML = 5000;

/** Teto do total do dia — acima da meta é permitido; 15 L bloqueia erro grosseiro. */
export const HYDRATION_MAX_DAILY_ML = 15000;

export function hydrationDocSegments(
  pacienteId: string,
  date: string
): [string, string, string, string, string, string] {
  return ['pacientes_completos', pacienteId, 'nutricao', 'dados', HYDRATION_COLLECTION, date];
}

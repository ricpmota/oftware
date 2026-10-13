import type { PacienteCompleto } from '@/types/obesidade';
import { buildSemanasEsquemaDoses } from '@/utils/esquemaDosesSemana';
import { listarInjetaveisPlanejadosNoPeriodo } from '@/utils/injetaveisCalendario';
import {
  dataGradeSemanal,
  primeiraDoseDoPlano,
  semanaInicioCicloDoPlano,
  ymdLocal,
} from '@/utils/datasAplicacaoSemanaPlano';

export const NUTRI_CHECKIN_ACTIVE_TREATMENT_STATUS = 'em_tratamento' as const;

export type NutritionTreatmentWindow = {
  start: string;
  end: string;
  sources: Array<'plano' | 'tirzepatida' | 'injetaveis'>;
};

export type NutritionTreatmentPatientSlice = Pick<
  PacienteCompleto,
  'statusTratamento' | 'planoTerapeutico' | 'evolucaoSeguimento'
>;

export type PlanoTerapeuticoTreatmentWeek = {
  semana: number;
  start: string;
  end: string;
};

export function isNutritionCheckInPatientActive(statusTratamento?: string | null): boolean {
  return statusTratamento === NUTRI_CHECKIN_ACTIVE_TREATMENT_STATUS;
}

function minYmd(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => (a < b ? a : b));
}

function maxYmd(values: string[]): string | null {
  if (values.length === 0) return null;
  return values.reduce((a, b) => (a > b ? a : b));
}

function addLocalDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days, 0, 0, 0, 0);
}

/**
 * Semanas 1..N do plano terapêutico: cada uma tem 7 dias a partir da data de início.
 * Não inclui a semana de conclusão.
 */
export function getPlanoTerapeuticoTreatmentWeeks(
  patient: NutritionTreatmentPatientSlice
): PlanoTerapeuticoTreatmentWeek[] {
  const plano = patient.planoTerapeutico;
  if (!plano) return [];
  const primeira = primeiraDoseDoPlano(plano);
  const n = Number(plano.numeroSemanasTratamento);
  if (!primeira || !Number.isFinite(n) || n < 1) return [];
  const count = Math.min(200, Math.floor(n));
  const inicio = semanaInicioCicloDoPlano(plano);
  const weeks: PlanoTerapeuticoTreatmentWeek[] = [];
  for (let i = 0; i < count; i += 1) {
    const semana = inicio + i;
    const start = dataGradeSemanal(primeira, semana, inicio);
    const end = addLocalDays(start, 6);
    weeks.push({
      semana,
      start: ymdLocal(start),
      end: ymdLocal(end),
    });
  }
  return weeks;
}

function tirzepatidaDateKeys(patient: NutritionTreatmentPatientSlice): string[] {
  const built = buildSemanasEsquemaDoses(patient as PacienteCompleto);
  if (!built) return [];
  return built.semanas
    .filter((semana) => !semana.isConclusao && !semana.isCancelada)
    .map((semana) => ymdLocal(semana.dataExibicao));
}

function injetaveisDateKeys(patient: NutritionTreatmentPatientSlice): string[] {
  const inicio = new Date(2000, 0, 1);
  const fim = new Date(2100, 11, 31);
  return listarInjetaveisPlanejadosNoPeriodo(patient as PacienteCompleto, inicio, fim).map((item) =>
    ymdLocal(item.data)
  );
}

/**
 * Vigência operacional do Check-in Semanal Nutri.
 *
 * Prioridade:
 * 1. Semanas do plano terapêutico (startDate + numeroSemanasTratamento)
 * 2. Datas planejadas de Tirzepatida / injetáveis (fallback)
 */
export function getNutritionTreatmentWindow(
  patient: NutritionTreatmentPatientSlice
): NutritionTreatmentWindow | null {
  const planoWeeks = getPlanoTerapeuticoTreatmentWeeks(patient);
  if (planoWeeks.length > 0) {
    return {
      start: planoWeeks[0]!.start,
      end: planoWeeks[planoWeeks.length - 1]!.end,
      sources: ['plano'],
    };
  }

  const tirzepatida = tirzepatidaDateKeys(patient);
  const injetaveis = injetaveisDateKeys(patient);
  const sources: NutritionTreatmentWindow['sources'] = [];
  const starts: string[] = [];
  const ends: string[] = [];

  if (tirzepatida.length > 0) {
    sources.push('tirzepatida');
    const start = minYmd(tirzepatida);
    const end = maxYmd(tirzepatida);
    if (start) starts.push(start);
    if (end) ends.push(end);
  }
  if (injetaveis.length > 0) {
    sources.push('injetaveis');
    const start = minYmd(injetaveis);
    const end = maxYmd(injetaveis);
    if (start) starts.push(start);
    if (end) ends.push(end);
  }

  const start = minYmd(starts);
  const end = maxYmd(ends);
  if (!start || !end) return null;
  return { start, end, sources };
}

export function isYmdWithinInclusive(ymd: string, start: string, end: string): boolean {
  return ymd >= start && ymd <= end;
}

/**
 * Novo slot operacional: paciente em tratamento + scheduledDate dentro da vigência.
 * Histórico concluído (hasRecord) permanece mesmo fora da vigência/status.
 */
export function isNutritionCheckInScheduledDateEligible(input: {
  statusTratamento?: string | null;
  window: NutritionTreatmentWindow | null;
  scheduledDate: string;
  hasRecord?: boolean;
}): boolean {
  if (input.hasRecord) return true;
  if (!isNutritionCheckInPatientActive(input.statusTratamento)) return false;
  if (!input.window) return false;
  return isYmdWithinInclusive(input.scheduledDate, input.window.start, input.window.end);
}

export function isWeeklyNutritionCheckInEligible(input: {
  patient: NutritionTreatmentPatientSlice;
  scheduledDate: string;
  hasRecord?: boolean;
}): boolean {
  return isNutritionCheckInScheduledDateEligible({
    statusTratamento: input.patient.statusTratamento,
    window: getNutritionTreatmentWindow(input.patient),
    scheduledDate: input.scheduledDate,
    hasRecord: input.hasRecord,
  });
}

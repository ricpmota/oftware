/**
 * Classificação visual de adesão para o painel profissional (ETAPA 03).
 * Não gera alerta. Dias sem registro NÃO entram como 0 ml.
 */

import {
  calcHydrationPercentage,
  formatHydrationHistoryDate,
  formatHydrationLiters,
  formatHydrationMl,
  hydrationYmdInTimeZone,
} from '@/lib/nutri/hidratacao/hydrationMath';
import {
  hydrationAdherenceReasonCopy,
  hydrationAdherenceStatusLabel,
  type HydrationAdherenceEvaluation,
  type HydrationAdherenceStatus as HydrationPatternStatus,
} from '@/lib/nutri/hidratacao/hydrationAdherence';
import type {
  HydrationRecord,
  HydrationSource,
  HydrationWeeklySummary,
} from '@/lib/nutri/hidratacao/hydrationTypes';

export const HYDRATION_PROFESSIONAL_MIN_REGISTERED_DAYS = 3;

export type HydrationProfessionalAdherence =
  | 'boa_adesao'
  | 'atencao'
  | 'baixa_adesao'
  | 'sem_dados';

export type HydrationCheckInFulfillment = 'nenhum' | 'pendente' | 'parcial' | 'concluido' | 'expirado';

export function classifyHydrationProfessionalAdherence(
  summary: HydrationWeeklySummary
): HydrationProfessionalAdherence {
  if (summary.daysRegistered < HYDRATION_PROFESSIONAL_MIN_REGISTERED_DAYS) {
    return 'sem_dados';
  }
  const avg = summary.averageAdherencePct ?? 0;
  if (avg >= 80) return 'boa_adesao';
  if (avg >= 60) return 'atencao';
  return 'baixa_adesao';
}

export function hydrationProfessionalAdherenceLabel(status: HydrationProfessionalAdherence): string {
  switch (status) {
    case 'boa_adesao':
      return 'Boa adesão';
    case 'atencao':
      return 'Atenção';
    case 'baixa_adesao':
      return 'Baixa adesão';
    case 'sem_dados':
      return 'Sem dados suficientes';
  }
}

export function hydrationSourceLabel(source: HydrationSource | undefined): string {
  switch (source) {
    case 'whatsapp_checkin':
      return 'Check-in (link)';
    case 'professional':
      return 'Profissional';
    case 'patient_portal':
    default:
      return 'Portal do paciente';
  }
}

export function formatHydrationCheckInPeriod(dates: string[]): string {
  const sorted = [...dates].filter(Boolean).sort();
  if (sorted.length === 0) return '—';
  if (sorted.length === 1) return formatHydrationHistoryDate(sorted[0]!);
  const first = formatHydrationHistoryDate(sorted[0]!);
  const last = formatHydrationHistoryDate(sorted[sorted.length - 1]!);
  const firstDay = first.slice(0, 2);
  const lastFull = last;
  const firstMonth = first.slice(3);
  const lastMonth = last.slice(3);
  if (firstMonth === lastMonth) {
    return `${firstDay}–${lastFull}`;
  }
  return `${first}–${lastFull}`;
}

export function classifyHydrationCheckInFulfillment(input: {
  hasLink: boolean;
  expiresAt?: Date | null;
  status?: string | null;
  allowedDates: string[];
  registeredDates: string[];
  now?: Date;
}): HydrationCheckInFulfillment {
  if (!input.hasLink) return 'nenhum';
  const now = input.now ?? new Date();
  if (input.status === 'expired' || (input.expiresAt && input.expiresAt.getTime() <= now.getTime())) {
    return 'expirado';
  }
  if (input.status === 'revoked') return 'nenhum';
  const allowed = new Set(input.allowedDates);
  const registered = input.registeredDates.filter((d) => allowed.has(d));
  if (input.status === 'completed' || (allowed.size > 0 && registered.length >= allowed.size)) {
    return 'concluido';
  }
  if (registered.length > 0) return 'parcial';
  return 'pendente';
}

export function hydrationCheckInFulfillmentLabel(status: HydrationCheckInFulfillment): string {
  switch (status) {
    case 'pendente':
      return 'Pendente';
    case 'parcial':
      return 'Parcial';
    case 'concluido':
      return 'Concluído';
    case 'expirado':
      return 'Expirado';
    case 'nenhum':
      return 'Sem link no período';
  }
}

export function hydrationCheckInOperationalTitle(status: HydrationCheckInFulfillment): string {
  switch (status) {
    case 'pendente':
      return 'Aguardando preenchimento';
    case 'parcial':
      return 'Parcialmente preenchido';
    case 'concluido':
      return 'Check-in concluído';
    case 'expirado':
      return 'Link expirado';
    case 'nenhum':
      return 'Sem check-in no período';
  }
}

export function formatHydrationProfessionalWhen(
  value: Date | string | null | undefined,
  todayYmd: string
): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const ymd = hydrationYmdInTimeZone(date);
  const time = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  if (ymd === todayYmd) return `Hoje · ${time}`;
  return `${formatHydrationHistoryDate(ymd)} · ${time}`;
}

export function formatHydrationLastRecordLine(
  record: HydrationRecord | null,
  todayYmd: string
): string {
  if (!record) return '—';
  const when = record.date === todayYmd ? 'Hoje' : formatHydrationHistoryDate(record.date);
  const pct = calcHydrationPercentage(record.consumedMl, record.goalMl);
  const check = record.goalReached ? ' ✓' : '';
  return `${when} · ${formatHydrationLiters(record.consumedMl)} · ${pct}% da meta${check}`;
}

export function hydrationProfessionalStatusLabel(status: HydrationPatternStatus): string {
  if (status === 'insufficient_data') return 'Acompanhamento inicial';
  return hydrationAdherenceStatusLabel(status);
}

export function hydrationProfessionalStatusHint(status: HydrationPatternStatus): string | null {
  if (status === 'insufficient_data') {
    return 'Dados ainda insuficientes para avaliar o padrão.';
  }
  return null;
}

export function hydrationProfessionalNarrative(input: {
  evaluation: HydrationAdherenceEvaluation;
  summary: HydrationWeeklySummary;
}): string {
  const { evaluation, summary } = input;
  const otherReasons = evaluation.reasons.filter(
    (reason) => reason !== 'no_registration_2_days' && reason !== 'no_registration_3_days'
  );
  const parts: string[] = [];
  if (evaluation.consecutiveMissingDays >= 2) {
    parts.push(
      `Sem registro há ${evaluation.consecutiveMissingDays} ${
        evaluation.consecutiveMissingDays === 1 ? 'dia' : 'dias'
      }.`
    );
  }
  parts.push(...otherReasons.map(hydrationAdherenceReasonCopy));
  if (parts.length > 0) return parts.join(' ');
  if (evaluation.status === 'insufficient_data') {
    if (summary.daysRegistered === 0) {
      return 'Ainda não há registros neste período. Isso não indica baixa adesão à meta de hidratação.';
    }
    const avgL = formatHydrationLiters(summary.averageConsumedMl ?? 0);
    const avgPct = summary.averageAdherencePct ?? 0;
    return `Nos dias registrados, o paciente consumiu em média ${avgL}/dia, equivalente a ${avgPct}% da meta. Ainda precisamos de mais registros para avaliar o padrão de adesão.`;
  }
  if (evaluation.status === 'good') {
    return 'O paciente apresenta boa regularidade nos registros e consumo próximo ou acima da meta na maior parte dos dias.';
  }
  return 'Acompanhe a adesão à meta de hidratação deste paciente.';
}

export function hydrationCheckInOperationalBody(input: {
  fulfillment: HydrationCheckInFulfillment;
  lastOpenedAt: string | null;
  completedAt: string | null;
  todayYmd: string;
}): string | null {
  if (input.fulfillment === 'concluido') {
    const when = formatHydrationProfessionalWhen(input.completedAt, input.todayYmd);
    return when === '—' ? 'Os dias deste período já foram atualizados.' : `Concluído ${when.toLowerCase()}.`;
  }
  if (input.fulfillment === 'expirado') {
    return 'Este link não está mais disponível. Envie um novo check-in se quiser atualizar o período.';
  }
  if (input.fulfillment === 'nenhum') {
    return 'Envie o check-in para o paciente atualizar os últimos dias.';
  }
  if (input.lastOpenedAt && !input.completedAt) {
    return 'O paciente abriu este check-in, mas ainda não concluiu o preenchimento.';
  }
  if (!input.lastOpenedAt) {
    return 'O paciente ainda não abriu este check-in.';
  }
  return null;
}

export function hydrationCalendarDayTooltip(input: {
  date: string;
  record: HydrationRecord | null;
  isFuture: boolean;
}): string {
  const day = formatHydrationHistoryDate(input.date);
  if (input.isFuture) return `${day} · Dia futuro`;
  if (!input.record) return `${day} · Sem registro`;
  const pct = calcHydrationPercentage(input.record.consumedMl, input.record.goalMl);
  const origin = hydrationSourceLabel(input.record.lastSource ?? input.record.source);
  const reached = input.record.goalReached ? 'Meta atingida ✓' : `${pct}% da meta`;
  return [
    day,
    `Consumido ${formatHydrationMl(input.record.consumedMl)}`,
    `Meta ${formatHydrationMl(input.record.goalMl)}`,
    `Adesão ${pct}%`,
    reached,
    `Origem ${origin}`,
  ].join('\n');
}

export function formatHydrationLastOpened(value: Date | string | null | undefined): string {
  if (!value) return 'Não aberto ainda';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Não aberto ainda';
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  CalendarDays,
  ChartNoAxesCombined,
  CheckCircle2,
  Dumbbell,
  Loader2,
  Target,
  type LucideIcon,
} from 'lucide-react';
import { ExerciseProgressionList } from '@/components/personal/stats/ExerciseProgressionList';
import { ExerciseProgressionModal } from '@/components/personal/stats/ExerciseProgressionModal';
import { PersonalTrainingStatsService } from '@/services/personalTrainingStatsService';
import {
  DEFAULT_STATS_PERIOD_DAYS,
  STATS_PERIOD_OPTIONS,
  type ExerciseEvolutionSummary,
  type SessionCompletionStats,
  type StatsPeriodDays,
  type TrainingStatsDataset,
  type TrainingStatsSeriesCounts,
  type WeeklySessionCount,
} from '@/lib/personal/trainingStats';

function CompletionRing({ percent }: { percent: number | null }) {
  const size = 34;
  const stroke = 3;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const bounded = percent == null ? 0 : Math.min(100, Math.max(0, percent));
  const filled = percent == null ? 0 : (bounded / 100) * circumference;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#1B3658"
        strokeWidth={stroke}
      />
      {percent != null ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#4CCB7A"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
    </svg>
  );
}

function IndicatorCard({
  icon: Icon,
  title,
  value,
  hint,
  ringPercent,
}: {
  icon: LucideIcon;
  title: string;
  value: string;
  hint?: string;
  ringPercent?: number | null;
}) {
  return (
    <article className="flex h-full min-w-0 flex-col rounded-[18px] border border-[#315072] bg-[#11294B] p-3">
      <Icon className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
      <p className="mt-2 text-[11px] font-medium leading-snug text-[#A5BAD3]">{title}</p>
      <div className="mt-1 flex items-center gap-2">
        <p className="text-2xl font-bold tabular-nums leading-none text-white">{value}</p>
        {ringPercent !== undefined ? <CompletionRing percent={ringPercent} /> : null}
      </div>
      {hint ? <p className="mt-1.5 break-words text-[10px] leading-snug text-[#A5BAD3]">{hint}</p> : null}
    </article>
  );
}

function rateLabel(completion: SessionCompletionStats): string {
  if (completion.completionRatePercent == null) return '—';
  return `${Math.round(completion.completionRatePercent)}%`;
}

function seriesLabel(series: TrainingStatsSeriesCounts): string {
  if (series.total <= 0) return '—';
  return String(series.done);
}

function WeeklyBars({ weeks }: { weeks: WeeklySessionCount[] }) {
  const maxCount = Math.max(1, ...weeks.map((week) => week.completed));
  return (
    <section className="rounded-[18px] border border-[#315072] bg-[#11294B] px-3 py-3">
      <h3 className="text-sm font-semibold text-white">Treinos concluídos por semana</h3>
      <p className="mt-0.5 text-[11px] text-[#A5BAD3]">Últimas 4 semanas</p>
      <div className="mt-3 flex h-36 items-end gap-2">
        {weeks.map((week) => {
          const current = week.weekIndex === weeks.length;
          const height = week.completed <= 0 ? 0 : (week.completed / maxCount) * 100;
          return (
            <div key={`${week.startDate}-${week.endDate}`} className="flex h-full min-w-0 flex-1 flex-col justify-end">
              <p
                className={`mb-1 text-center text-xs font-semibold tabular-nums ${
                  current ? 'text-[#4CCB7A]' : 'text-[#A5BAD3]'
                }`}
              >
                {week.completed}
              </p>
              <div className="flex min-h-0 flex-1 items-end">
                <div
                  className={`w-full rounded-t-md ${current ? 'bg-[#4CCB7A]' : 'bg-[#2F8FA3]/80'}`}
                  style={{ height: `${height}%` }}
                />
              </div>
              <p className="mt-1.5 text-center text-[10px] leading-tight text-[#A5BAD3]">{week.label}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PatientTrainingStats({ patientId }: { patientId: string | null }) {
  const [periodDays, setPeriodDays] = useState<StatsPeriodDays>(DEFAULT_STATS_PERIOD_DAYS);
  const [dataset, setDataset] = useState<TrainingStatsDataset | null>(null);
  const [loading, setLoading] = useState(() => Boolean(patientId));
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<ExerciseEvolutionSummary | null>(null);

  const load = useCallback(async () => {
    if (!patientId) {
      setDataset(null);
      setLoading(false);
      setError(false);
      return;
    }
    setLoading(true);
    setError(false);
    try {
      const next = await PersonalTrainingStatsService.loadDataset(patientId, periodDays);
      setDataset(next);
    } catch (err) {
      console.error('Erro ao carregar estatísticas:', err);
      setDataset(null);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [patientId, periodDays]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    setSelected(null);
    setQuery('');
  }, [periodDays, patientId]);

  const empty = !dataset || dataset.completion.programmed === 0;

  return (
    <div className="space-y-3 overflow-x-hidden">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#12382c]">
          <ChartNoAxesCombined className="h-4 w-4 text-[#4CCB7A]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-white">Sua evolução</h2>
          <p className="text-xs leading-snug text-[#A5BAD3]">Acompanhe seu desempenho nos treinos.</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-1 rounded-full border border-[#315072] bg-[#11294B] p-1">
        {STATS_PERIOD_OPTIONS.map((days) => (
          <button
            key={days}
            type="button"
            onClick={() => setPeriodDays(days)}
            className={`rounded-full py-2 text-xs font-semibold ${
              periodDays === days ? 'bg-[#4CCB7A] text-[#091D3C]' : 'text-[#A5BAD3]'
            }`}
          >
            {days} dias
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center rounded-[18px] border border-[#315072] bg-[#11294B] py-14">
          <Loader2 className="h-6 w-6 animate-spin text-[#4CCB7A]" />
        </div>
      ) : error ? (
        <div className="space-y-3 rounded-[18px] border border-[#315072] bg-[#11294B] px-4 py-8 text-center">
          <p className="text-sm text-[#A5BAD3]">Não foi possível carregar as estatísticas.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 rounded-lg bg-[#4CCB7A] px-4 text-xs font-semibold text-[#091D3C]"
          >
            Tentar de novo
          </button>
        </div>
      ) : empty ? (
        <div className="rounded-[18px] border border-[#315072] bg-[#11294B] px-4 py-8 text-center">
          <p className="text-sm text-[#A5BAD3]">Ainda não há treinos suficientes neste período.</p>
        </div>
      ) : dataset ? (
        <>
          <div className="grid grid-cols-2 items-stretch gap-2">
            <IndicatorCard
              icon={CheckCircle2}
              title="Treinos concluídos"
              value={String(dataset.completion.completed)}
              hint={`${dataset.completion.skipped} pulados · ${dataset.completion.scheduled} ainda agendados`}
            />
            <IndicatorCard
              icon={Target}
              title="Taxa de conclusão"
              value={rateLabel(dataset.completion)}
              hint={`${dataset.completion.completed} de ${dataset.completion.programmed} sessões do período`}
              ringPercent={dataset.completion.completionRatePercent}
            />
            <IndicatorCard
              icon={Dumbbell}
              title="Séries realizadas"
              value={seriesLabel(dataset.series)}
              hint={
                dataset.series.total > 0
                  ? `${dataset.series.done} de ${dataset.series.total} séries concluídas`
                  : 'Sem registro série a série neste período'
              }
            />
            <IndicatorCard
              icon={CalendarDays}
              title="Sessões no período"
              value={String(dataset.completion.programmed)}
            />
          </div>
          <WeeklyBars weeks={dataset.weeklyCompleted} />
          {dataset.sessionsWithExecutions > 0 ? (
            <p className="px-1 text-[11px] text-[#A5BAD3]">
              Dados de carga disponíveis em {dataset.sessionsWithExecutions}{' '}
              {dataset.sessionsWithExecutions === 1 ? 'sessão' : 'sessões'} com execução série a série.
            </p>
          ) : null}
          <ExerciseProgressionList
            exercises={dataset.exercises}
            query={query}
            onQueryChange={setQuery}
            onOpen={setSelected}
          />
        </>
      ) : null}

      {selected ? (
        <ExerciseProgressionModal exercise={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

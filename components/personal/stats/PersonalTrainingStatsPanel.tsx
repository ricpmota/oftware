'use client';

import { useCallback, useEffect, useState } from 'react';
import { PersonalTrainingStatsService } from '@/services/personalTrainingStatsService';
import {
  DEFAULT_STATS_PERIOD_DAYS,
  STATS_PERIOD_OPTIONS,
  type ExerciseEvolutionSummary,
  type StatsPeriodDays,
  type TrainingStatsDataset,
} from '@/lib/personal/trainingStats';
import { TrainingStatsKpis } from '@/components/personal/stats/TrainingStatsKpis';
import { WeeklyTrainingChart } from '@/components/personal/stats/WeeklyTrainingChart';
import { ExerciseProgressionList } from '@/components/personal/stats/ExerciseProgressionList';
import { ExerciseProgressionModal } from '@/components/personal/stats/ExerciseProgressionModal';

export function PersonalTrainingStatsPanel({ patientId }: { patientId: string | null }) {
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

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-4 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
        <p className="text-xs uppercase tracking-wide text-[#E8EDED]/55">Resumo de performance</p>
        <p className="text-sm text-[#E8EDED]/80 mt-1">
          Constância das sessões e evolução de carga por exercício.
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {STATS_PERIOD_OPTIONS.map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => setPeriodDays(days)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${
                periodDays === days
                  ? 'bg-[#4CCB7A] text-[#0A1F44]'
                  : 'bg-white/10 text-[#E8EDED]/80 hover:bg-white/15'
              }`}
            >
              {days} dias
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16 rounded-2xl border border-white/10 bg-[#0A1F44]/85">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CCB7A]" />
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-8 text-center space-y-3">
          <p className="text-sm text-[#E8EDED]/80">Não foi possível carregar as estatísticas.</p>
          <button
            type="button"
            onClick={() => void load()}
            className="h-9 px-4 rounded-lg bg-[#4CCB7A] text-[#0A1F44] text-xs font-semibold"
          >
            Tentar de novo
          </button>
        </div>
      ) : !dataset || dataset.completion.programmed === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/85 p-8 text-center">
          <p className="text-sm text-[#E8EDED]/80">
            Ainda não há treinos suficientes neste período.
          </p>
        </div>
      ) : (
        <>
          <TrainingStatsKpis completion={dataset.completion} series={dataset.series} />
          <WeeklyTrainingChart weeks={dataset.weeklyCompleted} />
          {dataset.sessionsWithExecutions > 0 ? (
            <p className="text-[11px] text-[#E8EDED]/50 px-1">
              Dados de carga disponíveis em {dataset.sessionsWithExecutions}{' '}
              {dataset.sessionsWithExecutions === 1 ? 'sessão' : 'sessões'} com execução série a
              série.
            </p>
          ) : null}
          <ExerciseProgressionList
            exercises={dataset.exercises}
            query={query}
            onQueryChange={setQuery}
            onOpen={setSelected}
          />
        </>
      )}

      {selected ? (
        <ExerciseProgressionModal exercise={selected} onClose={() => setSelected(null)} />
      ) : null}
    </div>
  );
}

export default PersonalTrainingStatsPanel;

'use client';

import { TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { translateExerciseName } from '@/data/exerciseTranslations';
import {
  formatKg,
  formatLoadVariationPercent,
  type ExerciseEvolutionSummary,
} from '@/lib/personal/trainingStats';

export function ExerciseProgressionList({
  exercises,
  query,
  onQueryChange,
  onOpen,
}: {
  exercises: ExerciseEvolutionSummary[];
  query: string;
  onQueryChange: (value: string) => void;
  onOpen: (exercise: ExerciseEvolutionSummary) => void;
}) {
  const normalized = query.trim().toLowerCase();
  const filtered = exercises.filter((item) => {
    if (!normalized) return true;
    const translated = translateExerciseName(item.name).toLowerCase();
    return translated.includes(normalized) || item.name.toLowerCase().includes(normalized);
  });

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/90 p-5 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)] space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#E8EDED]">Progressão por exercício</h3>
        <p className="text-[11px] text-[#E8EDED]/55 mt-0.5">
          Veja como as cargas utilizadas estão evoluindo ao longo dos treinos.
        </p>
      </div>
      {exercises.length > 4 ? (
        <input
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Buscar exercício..."
          className="w-full h-10 px-3 text-sm rounded-lg border border-white/15 bg-white/10 text-[#E8EDED] placeholder:text-[#E8EDED]/45 outline-none focus:ring-2 focus:ring-[#4CCB7A]/35"
        />
      ) : null}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#E8EDED]/65 py-6 text-center">
          Ainda não há execuções série a série com carga neste período.
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const variation = item.variationPercent;
            const TrendIcon =
              variation == null ? Minus : variation >= 0 ? TrendingUp : TrendingDown;
            const trendClass =
              variation == null
                ? 'text-[#E8EDED]/55'
                : variation >= 0
                  ? 'text-[#4CCB7A]'
                  : 'text-amber-300';
            return (
              <button
                key={item.exerciseId}
                type="button"
                onClick={() => onOpen(item)}
                className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] p-4 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-[#E8EDED] truncate">
                      {translateExerciseName(item.name)}
                    </p>
                    <p className="text-[11px] text-[#E8EDED]/55 mt-1">
                      {item.sessionCountWithLoad}{' '}
                      {item.sessionCountWithLoad === 1 ? 'sessão registrada' : 'sessões registradas'}
                    </p>
                  </div>
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold ${trendClass}`}>
                    <TrendIcon className="w-3.5 h-3.5" />
                    {formatLoadVariationPercent(variation)}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#E8EDED]/70">
                  <span>Última carga {formatKg(item.latestLoadKg)}</span>
                  <span>Maior carga {formatKg(item.maxLoadKg)}</span>
                </div>
                <p className="mt-3 text-[11px] font-semibold text-[#4CCB7A]">Ver evolução</p>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ExerciseProgressionList;

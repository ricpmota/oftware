'use client';

import type { WeeklySessionCount } from '@/lib/personal/trainingStats';

export function WeeklyTrainingChart({ weeks }: { weeks: WeeklySessionCount[] }) {
  const maxCount = Math.max(1, ...weeks.map((week) => week.completed));
  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A1F44]/90 p-5 shadow-[0_12px_30px_-12px_rgba(76,203,122,0.22)]">
      <h3 className="text-lg font-semibold text-[#E8EDED]">Treinos concluídos por semana</h3>
      <p className="text-[11px] text-[#E8EDED]/55 mt-0.5">Últimas 4 semanas · sessões concluídas</p>
      <div className="mt-4 space-y-2">
        {weeks.map((week) => (
          <div key={`${week.startDate}-${week.endDate}`} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-xs text-[#E8EDED]/70">{week.label}</span>
            <div className="flex-1 bg-white/10 rounded-full h-6 relative overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#2F8FA3] to-[#4CCB7A] h-6 rounded-full flex items-center justify-end pr-2 min-w-0"
                style={{ width: `${(week.completed / maxCount) * 100}%` }}
              >
                {week.completed > 0 ? (
                  <span className="text-xs text-[#0A1F44] font-semibold">{week.completed}</span>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WeeklyTrainingChart;

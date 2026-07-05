'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, Activity } from 'lucide-react';
import type { SectionScoreResult, ScoreColor } from '@/lib/labExames/labSectionScore';

interface LabMetabolicSummarySectionProps {
  scores: SectionScoreResult[];
}

const COLOR_CLASS: Record<ScoreColor, string> = {
  green: 'text-green-600',
  orange: 'text-amber-600',
  red: 'text-red-600',
  gray: 'text-gray-400',
};

const DOT_CLASS: Record<ScoreColor, string> = {
  green: 'bg-green-500',
  orange: 'bg-amber-500',
  red: 'bg-red-500',
  gray: 'bg-gray-300',
};

export function LabMetabolicSummarySection({ scores }: LabMetabolicSummarySectionProps) {
  const [expanded, setExpanded] = useState(false);

  const scoredSections = scores.filter((s) => s.score !== null);

  if (scoredSections.length === 0) return null;

  const globalAvg = Math.round(
    scoredSections.reduce((sum, s) => sum + (s.score ?? 0), 0) / scoredSections.length
  );
  const globalColor: ScoreColor =
    globalAvg >= 80 ? 'green' : globalAvg >= 60 ? 'orange' : 'red';

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-indigo-500" />
          <span className="font-semibold text-sm text-gray-800">Resumo Metabólico</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium">
            Geral:{' '}
            <span className={COLOR_CLASS[globalColor]}>{globalAvg}%</span>
          </span>
          {expanded ? (
            <ChevronUp className="w-4 h-4 text-gray-500" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-500" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 space-y-2">
          {scoredSections.map((s) => (
            <div key={s.sectionKey} className="flex items-center justify-between py-1">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${DOT_CLASS[s.color]}`} />
                <span className="text-xs text-gray-700">{s.label}</span>
              </div>
              <span className={`text-xs font-semibold ${COLOR_CLASS[s.color]}`}>
                {s.score}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

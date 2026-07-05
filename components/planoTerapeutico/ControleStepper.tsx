'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

type Props = {
  label: string;
  pergunta?: string;
  valorExibido: string;
  onIncrementar: () => void;
  onDecrementar: () => void;
  podeIncrementar: boolean;
  podeDecrementar: boolean;
  ariaLabelMais: string;
  ariaLabelMenos: string;
};

export default function ControleStepper({
  label,
  pergunta,
  valorExibido,
  onIncrementar,
  onDecrementar,
  podeIncrementar,
  podeDecrementar,
  ariaLabelMais,
  ariaLabelMenos,
}: Props) {
  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {pergunta && <p className="text-sm text-slate-500 mt-0.5">{pergunta}</p>}
      </div>
      <div className="flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={onDecrementar}
          disabled={!podeDecrementar}
          aria-label={ariaLabelMenos}
          className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronDown className="w-5 h-5" />
        </button>
        <span className="min-w-[7rem] text-center text-lg font-semibold text-slate-900 tabular-nums">
          {valorExibido}
        </span>
        <button
          type="button"
          onClick={onIncrementar}
          disabled={!podeIncrementar}
          aria-label={ariaLabelMais}
          className="flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronUp className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

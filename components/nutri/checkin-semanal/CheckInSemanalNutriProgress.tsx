'use client';

import { motion } from 'framer-motion';
import { X } from 'lucide-react';

type Props = {
  progress: number;
  stepLabel: string;
  groupLabel?: string;
  onClose?: () => void;
};

export function CheckInSemanalNutriProgress({ progress, stepLabel, groupLabel, onClose }: Props) {
  return (
    <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200/80">
      <div className="max-w-lg md:max-w-2xl mx-auto px-4 md:px-6 pt-3 pb-2.5">
        <div className="flex items-center justify-between mb-2 gap-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 truncate">
            {groupLabel || 'Check-in Semanal Nutri'}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-medium text-slate-500">{stepLabel}</span>
            {onClose ? (
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Fechar"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-200 overflow-hidden">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>
    </div>
  );
}

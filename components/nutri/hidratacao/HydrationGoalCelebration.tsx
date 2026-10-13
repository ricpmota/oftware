'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Droplet, X } from 'lucide-react';

type HydrationGoalCelebrationProps = {
  open: boolean;
  onClose: () => void;
};

export default function HydrationGoalCelebration({ open, onClose }: HydrationGoalCelebrationProps) {
  useEffect(() => {
    if (!open) return;
    const timer = window.setTimeout(onClose, 5600);
    return () => window.clearTimeout(timer);
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-x-3 bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] z-[120] mx-auto max-w-md sm:inset-x-auto sm:right-4 sm:left-auto"
      role="status"
    >
      <div className="flex items-start gap-3 rounded-2xl border border-[#4CCB7A]/40 bg-white/95 p-3.5 shadow-[0_12px_32px_-12px_rgba(10,31,68,0.45)] backdrop-blur-md dark:border-[#4CCB7A]/30 dark:bg-[#0A1F44]/95">
        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#4CCB7A]/20">
          <Droplet className="h-4 w-4 text-[#2F8FA3] dark:text-[#4CCB7A]" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-[#0A1F44] dark:text-[#E8EDED]">
            💧 Meta de hidratação atingida!
          </p>
          <p className="mt-0.5 text-xs leading-relaxed text-[#0A1F44]/75 dark:text-[#E8EDED]/75">
            Excelente! Você atingiu sua meta de água de hoje. 🎯 Continue cuidando da sua hidratação. 💙
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[#0A1F44]/40 hover:bg-black/5 dark:text-[#E8EDED]/50"
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>,
    document.body
  );
}

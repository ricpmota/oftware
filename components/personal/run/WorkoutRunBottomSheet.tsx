'use client';

import type { ReactNode } from 'react';
import { X } from 'lucide-react';

export function WorkoutRunBottomSheet({
  open,
  title,
  subtitle,
  labelledBy,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  subtitle?: string;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="absolute inset-0 z-20 flex h-full max-h-full flex-col justify-end overflow-hidden overscroll-none touch-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <div
        className="absolute inset-0 bg-black/55 touch-none"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[min(78vh,620px)] w-full flex-col overflow-hidden rounded-t-2xl border border-white/10 bg-[#0A1F44] shadow-[0_-16px_40px_-12px_rgba(0,0,0,0.55)] touch-auto pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.08em] text-[#E8EDED]/45">{title}</p>
            {subtitle ? (
              <h3 id={labelledBy} className="truncate text-sm font-semibold text-[#E8EDED]">
                {subtitle}
              </h3>
            ) : (
              <h3 id={labelledBy} className="sr-only">
                {title}
              </h3>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-[#E8EDED]/70 hover:bg-white/10"
            aria-label="Fechar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-y-contain touch-pan-y p-4">
          {children}
        </div>
      </div>
    </div>
  );
}

'use client';

import React from 'react';
import { ChevronRight, MessageSquareQuote } from 'lucide-react';

type Props = {
  onOpen: () => void;
};

export default function InstagramDepoimentosButton({ onOpen }: Props) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-haspopup="dialog"
      aria-label="Depoimentos. Toque para ver histórias de pacientes."
      className="group relative w-full overflow-hidden rounded-xl border border-amber-400/25 bg-gradient-to-br from-amber-500/[0.12] via-white/[0.05] to-emerald-500/[0.08] px-3.5 py-3 backdrop-blur-md shadow-[0_0_28px_rgba(251,191,36,0.12)] transition active:scale-[0.98] hover:border-amber-300/40 hover:bg-white/[0.08] focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060d1f]"
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-amber-400/[0.05] to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="relative flex items-center gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15 text-amber-400">
          <MessageSquareQuote className="h-4 w-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1 text-left text-[15px] font-semibold tracking-tight text-white">
          Depoimentos
        </span>
        <ChevronRight
          className="h-4 w-4 shrink-0 text-amber-400/70 opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100"
          aria-hidden
        />
      </div>
    </button>
  );
}

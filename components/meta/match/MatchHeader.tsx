'use client';

import type { ReactNode } from 'react';
import { ChevronLeft } from 'lucide-react';
import { MatchLogo } from './MatchLogo';

type MatchHeaderProps = {
  onBack: () => void;
  trailing?: ReactNode;
};

export function MatchHeader({ onBack, trailing }: MatchHeaderProps) {
  return (
    <header className="relative z-30 bg-transparent px-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-1">
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={onBack}
          aria-label="Voltar"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)] transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CCB7A]/70"
        >
          <ChevronLeft className="h-6 w-6" strokeWidth={2.25} />
        </button>

        <MatchLogo height={28} className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />

        <div className="min-w-0 flex-1 pl-2 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]">
          <p className="truncate text-[15px] font-bold leading-tight tracking-tight text-white">
            Match Saudável
          </p>
          <p className="truncate text-[12px] leading-snug text-white/85">
            Conexões para uma vida melhor.
          </p>
        </div>

        {trailing ? <div className="shrink-0 pr-2">{trailing}</div> : null}
      </div>
    </header>
  );
}

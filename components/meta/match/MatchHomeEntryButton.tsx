'use client';

import { useRouter } from 'next/navigation';
import { MatchLogo } from './MatchLogo';

export function MatchHomeEntryButton() {
  const router = useRouter();

  return (
    <div className="relative overflow-visible">
      <button
        type="button"
        onClick={() => router.push('/meta/match')}
        aria-label="Abrir Match Saudável, novo"
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4CCB7A]/50"
      >
        <MatchLogo height={26} />
      </button>
      <div
        className="pointer-events-none absolute left-1/2 top-full z-[60] -translate-x-1/2 translate-y-1.5 animate-hint-pulse"
        aria-hidden
      >
        <div className="mx-auto h-0 w-0 border-x-[5px] border-b-[5px] border-x-transparent border-b-emerald-600" />
        <div className="whitespace-nowrap rounded-full bg-emerald-600 px-2.5 py-1 text-center text-[10px] font-semibold leading-tight tracking-wide text-white shadow-[0_2px_8px_rgba(5,150,105,0.4)]">
          Novo
        </div>
      </div>
    </div>
  );
}

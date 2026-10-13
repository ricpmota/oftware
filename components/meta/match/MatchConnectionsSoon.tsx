'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { MatchLogo } from '@/components/meta/match/MatchLogo';
import { useMatchAuth } from '@/components/meta/match/useMatchAuth';

export function MatchConnectionsSoon() {
  const router = useRouter();
  const user = useMatchAuth();

  useEffect(() => {
    if (user === null) router.replace('/');
  }, [router, user]);

  return (
    <div className="h-full overflow-hidden bg-[#071633] text-white">
      <div className="mx-auto flex h-full w-full max-w-[480px] flex-col bg-[#0A1F44] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-[max(0.75rem,env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={() => router.push('/meta/match')}
          className="flex h-11 w-11 items-center justify-center rounded-full text-white"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>

        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <MatchLogo height={72} />
          <h1 className="mt-8 text-[1.85rem] font-extrabold leading-tight tracking-tight">
            Seus matches ainda
            <br />
            não estão prontos.
          </h1>
          <p className="mt-3 max-w-[18rem] text-sm leading-relaxed text-white/75">
            As conexões do Match Saudável chegam em seguida. Seu perfil continua em Configurações.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push('/meta/match')}
          className="flex h-12 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#6CD492] to-[#4CCB7A] text-[15px] font-semibold text-[#0A1F44]"
        >
          Voltar ao Match
        </button>
      </div>
    </div>
  );
}

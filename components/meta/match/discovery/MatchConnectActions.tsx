'use client';

import { Check, X } from 'lucide-react';
import type { MatchRelation } from '@/lib/match/matchPair';

export function MatchConnectActions({
  name,
  busy,
  relation,
  mode,
  canPass,
  showPass = true,
  notice,
  error,
  onPass,
  onConnect,
}: {
  name: string;
  busy: boolean;
  relation: MatchRelation;
  mode: 'discovery' | 'incoming';
  canPass: boolean;
  showPass?: boolean;
  notice?: string;
  error?: string;
  onPass: () => void;
  onConnect: () => void;
}) {
  const settled = relation === 'outgoing_pending' || relation === 'connected' || relation === 'blocked';
  const passLabel = mode === 'incoming' ? `Ignorar solicitação de ${name}` : 'Passar para a próxima pessoa';

  return (
    <div className="bg-transparent px-4 pb-2 pt-1">
      {notice ? <p className="mb-2 text-center text-sm font-semibold text-[#4CCB7A] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">{notice}</p> : null}
      {error ? <p className="mb-2 text-center text-sm text-[#F3B4B4] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">{error}</p> : null}
      {relation === 'outgoing_pending' ? (
        <p className="mb-2 text-center text-[12px] text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]">Aguardando resposta</p>
      ) : null}
      <div className="flex items-center justify-center gap-10">
        {showPass ? (
          <button
            type="button"
            onClick={onPass}
            disabled={busy || !canPass}
            aria-label={passLabel}
            className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-white text-[#E11D48] shadow-[0_8px_20px_-12px_rgba(0,0,0,0.7)] disabled:opacity-40"
          >
            <X className="h-8 w-8" strokeWidth={2.75} aria-hidden="true" />
          </button>
        ) : null}
        {relation === 'blocked' ? null : (
          <button
            type="button"
            disabled={busy || settled}
            onClick={onConnect}
            aria-label={settled ? `Conectar com ${name} indisponível` : `Conectar com ${name}`}
            className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full bg-[#4CCB7A] text-white shadow-[0_8px_20px_-12px_rgba(76,203,122,0.9)] disabled:opacity-40"
          >
            <Check className="h-8 w-8" strokeWidth={2.75} aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}

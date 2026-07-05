'use client';

import { Star } from 'lucide-react';
import { formatarVariacaoMedida, toneVariacaoMedida } from '@/lib/aplicacao/formatarVariacaoMedida';
import type { ConclusaoTratamentoTimeline } from './prontuarioTypes';

type Props = {
  conclusao: ConclusaoTratamentoTimeline;
};

const CHIP_TONE: Record<ReturnType<typeof toneVariacaoMedida>, string> = {
  positivo: 'border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100',
  atencao: 'border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100',
  neutro: 'border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100',
};

export function ConclusaoTratamentoTimelineCard({ conclusao }: Props) {
  const pesoPerdidoFmt = formatarVariacaoMedida(conclusao.pesoPerdidoAcumulado, 'kg');
  const reducaoAbdominalFmt = formatarVariacaoMedida(conclusao.reducaoAbdominalCm, 'cm');
  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/90 to-teal-50/50 dark:from-emerald-950/30 dark:to-teal-950/20 p-4">
        <div className="flex flex-wrap gap-2 mb-3">
          {conclusao.pesoFinalKg != null && (
            <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px]">
              <p className="text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-300">Peso final</p>
              <p className="text-sm font-bold text-violet-900 dark:text-violet-100">{conclusao.pesoFinalKg.toFixed(1)} kg</p>
            </div>
          )}
          {pesoPerdidoFmt && (
            <div className={`rounded-xl border bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px] ${CHIP_TONE[toneVariacaoMedida(conclusao.pesoPerdidoAcumulado)]}`}>
              <p className="text-[10px] font-semibold uppercase opacity-70">Peso perdido</p>
              <p className="text-sm font-bold">{pesoPerdidoFmt}</p>
            </div>
          )}
          {conclusao.circunferenciaFinalCm != null && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px]">
              <p className="text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-300">Cintura final</p>
              <p className="text-sm font-bold text-rose-900 dark:text-rose-100">{conclusao.circunferenciaFinalCm.toFixed(1)} cm</p>
            </div>
          )}
          {reducaoAbdominalFmt && (
            <div className={`rounded-xl border bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px] ${CHIP_TONE[toneVariacaoMedida(conclusao.reducaoAbdominalCm)]}`}>
              <p className="text-[10px] font-semibold uppercase opacity-70">Redução abdominal</p>
              <p className="text-sm font-bold">{reducaoAbdominalFmt}</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          {conclusao.percepcaoResultadoFinal && (
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-500">Percepção do resultado</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{conclusao.percepcaoResultadoFinal}</p>
            </div>
          )}
          {conclusao.principalConquista && (
            <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
              <p className="text-[10px] font-semibold uppercase text-gray-500">Principal conquista</p>
              <p className="font-medium text-gray-900 dark:text-white mt-0.5">{conclusao.principalConquista}</p>
            </div>
          )}
        </div>

        {conclusao.depoimento && (
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2 mt-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Depoimento</p>
            <p className="text-sm text-gray-800 dark:text-gray-200 mt-0.5 whitespace-pre-wrap leading-relaxed">{conclusao.depoimento}</p>
          </div>
        )}

        {conclusao.estrelasMedico != null && conclusao.estrelasMedico >= 1 && (
          <div className="flex items-center gap-1 mt-2">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star
                key={s}
                size={16}
                className={s <= conclusao.estrelasMedico! ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}
              />
            ))}
            <span className="text-xs text-gray-500 ml-1">Nota do tratamento</span>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import type { MarcoZero } from '@/types/obesidade';

type Props = {
  marcoZero: MarcoZero;
};

export function MarcoZeroResumoSection({ marcoZero }: Props) {
  return (
    <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-gradient-to-br from-amber-50/60 to-orange-50/30 dark:from-amber-950/25 dark:to-orange-950/15 p-3 sm:p-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-amber-800 dark:text-amber-300">
        Marco Zero do Tratamento
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/80 dark:border-amber-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase text-gray-500">Peso inicial</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {marcoZero.pesoInicial.toFixed(1)} kg
          </p>
        </div>
        {marcoZero.circunferenciaInicial != null && (
          <div className="rounded-lg border border-white/80 dark:border-amber-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Cintura inicial</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
              {marcoZero.circunferenciaInicial.toFixed(1)} cm
            </p>
          </div>
        )}
        <div className="rounded-lg border border-white/80 dark:border-amber-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 sm:col-span-2">
          <p className="text-[10px] font-semibold uppercase text-gray-500">Seu objetivo</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {marcoZero.objetivoPaciente}
          </p>
        </div>
        <div className="rounded-lg border border-white/80 dark:border-amber-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase text-gray-500">Motivação</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {marcoZero.motivacaoPrincipal}
          </p>
        </div>
        <div className="rounded-lg border border-white/80 dark:border-amber-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase text-gray-500">Fotos iniciais</p>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1">
            {marcoZero.possuiFotosIniciais ? '📸 Registradas' : 'Ainda não registradas'}
          </p>
        </div>
      </div>
    </div>
  );
}

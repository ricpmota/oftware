'use client';

import type { MarcoZeroTimeline } from './prontuarioTypes';

type Props = {
  marcoZero: MarcoZeroTimeline;
  dataInicio?: string;
};

export function MarcoZeroTimelineCard({ marcoZero, dataInicio }: Props) {
  return (
    <div className="mt-2 space-y-3">
      <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/60 bg-gradient-to-br from-amber-50/90 to-orange-50/50 dark:from-amber-950/30 dark:to-orange-950/20 p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xl" aria-hidden>
            🎯
          </span>
          <p className="text-xs font-bold uppercase tracking-wide text-amber-900 dark:text-amber-200">
            Marco Zero do Tratamento
          </p>
        </div>

        <div className="flex flex-wrap gap-2 mb-3">
          <div className="rounded-xl border border-violet-200 dark:border-violet-800 bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px]">
            <p className="text-[10px] font-semibold uppercase text-violet-700 dark:text-violet-300">
              Peso inicial
            </p>
            <p className="text-sm font-bold text-violet-900 dark:text-violet-100">
              {marcoZero.pesoInicial.toFixed(1)} kg
            </p>
          </div>
          {marcoZero.circunferenciaInicial != null && (
            <div className="rounded-xl border border-rose-200 dark:border-rose-800 bg-white/80 dark:bg-gray-900/50 px-3 py-2 min-w-[100px]">
              <p className="text-[10px] font-semibold uppercase text-rose-700 dark:text-rose-300">
                Cintura inicial
              </p>
              <p className="text-sm font-bold text-rose-900 dark:text-rose-100">
                {marcoZero.circunferenciaInicial.toFixed(1)} cm
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Motivação</p>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">
              {marcoZero.motivacaoPrincipal}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Satisfação atual</p>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">
              {marcoZero.satisfacaoAtual}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2 sm:col-span-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Objetivo do paciente</p>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">
              {marcoZero.objetivoPaciente}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Confiança no objetivo</p>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">
              {marcoZero.confiancaNoObjetivo}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 dark:bg-gray-900/50 border px-3 py-2">
            <p className="text-[10px] font-semibold uppercase text-gray-500">Fotos iniciais</p>
            <p className="font-medium text-gray-900 dark:text-white mt-0.5">
              {marcoZero.possuiFotosIniciais ? 'Sim' : 'Não'}
            </p>
          </div>
        </div>

        {dataInicio && (
          <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 mt-3">
            Início do tratamento: {dataInicio}
          </p>
        )}
      </div>
    </div>
  );
}

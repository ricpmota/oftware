'use client';

import { ChevronRight, FileText, Pill, Receipt } from 'lucide-react';
import type { Prescricao } from '@/types/prescricao';

function formatarDataHora(d: Date): string {
  try {
    return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
}

export type PrescricoesListaPacienteProps = {
  prescricoes: Prescricao[];
  onItemClick: (p: Prescricao) => void;
  /** Cor do destaque ao passar o dedo / foco (alinha com tema do app) */
  accent?: 'green' | 'purple';
  className?: string;
  /** Altura máxima da área rolável (ex.: max-h-[min(70vh,520px)]) */
  maxHeightClassName?: string;
};

/**
 * Lista de prescrições/recibos do paciente — layout compartilhado entre /meta e metaadmin (Histórico).
 */
export default function PrescricoesListaPaciente({
  prescricoes,
  onItemClick,
  accent = 'green',
  className = '',
  maxHeightClassName = 'max-h-[min(70vh,520px)]',
}: PrescricoesListaPacienteProps) {
  const isPurple = accent === 'purple';
  const rowHover = isPurple
    ? 'hover:bg-purple-50/60 active:bg-purple-50/80 border-l-transparent hover:border-l-purple-500'
    : 'hover:bg-emerald-50/50 active:bg-emerald-50/70 border-l-transparent hover:border-l-emerald-500/70';

  const iconWrapRecibo = isPurple
    ? 'bg-teal-100 text-teal-700 ring-teal-200/60'
    : 'bg-teal-100 text-teal-700 ring-teal-200/60';
  const iconWrapRx = isPurple
    ? 'bg-purple-100 text-purple-700 ring-purple-200/60'
    : 'bg-emerald-100 text-emerald-700 ring-emerald-200/60';

  return (
    <div
      className={`border border-gray-200 rounded-xl bg-white overflow-hidden shadow-sm flex flex-col ${maxHeightClassName} ${className}`}
    >
      <ul className="overflow-y-auto overscroll-contain divide-y divide-gray-100 min-h-0 flex-1">
        {prescricoes.map((p) => {
          const isRecibo = p.tipoDocumento === 'recibo_medico';
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onItemClick(p)}
                className={`group w-full text-left flex items-start gap-3 sm:gap-4 px-4 py-4 sm:py-3.5 transition-colors border-l-4 ${rowHover} focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${isPurple ? 'focus-visible:ring-purple-400' : 'focus-visible:ring-emerald-400'}`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ring-1 ${isRecibo ? iconWrapRecibo : iconWrapRx}`}
                  aria-hidden
                >
                  {isRecibo ? <Receipt className="h-5 w-5" strokeWidth={2} /> : <Pill className="h-5 w-5" strokeWidth={2} />}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex flex-wrap items-center gap-2 gap-y-1">
                    <span className="font-semibold text-gray-900 text-sm sm:text-[15px] leading-snug line-clamp-2">
                      {p.nome || 'Sem título'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-semibold uppercase tracking-wide ${
                        isRecibo
                          ? 'bg-teal-100 text-teal-800 border border-teal-200/80'
                          : isPurple
                            ? 'bg-purple-100 text-purple-800 border border-purple-200/80'
                            : 'bg-emerald-100 text-emerald-800 border border-emerald-200/80'
                      }`}
                    >
                      {isRecibo ? 'Recibo' : 'Prescrição'}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-gray-500 flex items-center gap-1.5">
                    <FileText className="h-3.5 w-3.5 shrink-0 opacity-70" aria-hidden />
                    <span>Atualizado {formatarDataHora(p.atualizadoEm)}</span>
                  </p>
                </div>
                <ChevronRight
                  className={`h-5 w-5 shrink-0 mt-2 text-gray-300 transition-colors ${isPurple ? 'group-hover:text-purple-500' : 'group-hover:text-emerald-600'}`}
                  strokeWidth={2}
                  aria-hidden
                />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

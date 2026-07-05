'use client';

import { X } from 'lucide-react';
import { CheckInSemanalScoreCard } from '@/components/aplicacao/CheckInSemanalScoreCard';
import { checkInSemanalParaExibicao } from '@/lib/aplicacao/checkInSemanalResumo';
import type { CheckInSemanalDetalhe } from '@/lib/aplicacao/resolveCheckInSemanalScore';

type Props = {
  open: boolean;
  onClose: () => void;
  pacienteNome: string;
  detalhe: CheckInSemanalDetalhe;
};

function formatarDataRegistro(value: unknown): string | null {
  if (!value) return null;
  const date =
    value instanceof Date
      ? value
      : typeof (value as { toDate?: () => Date }).toDate === 'function'
        ? (value as { toDate: () => Date }).toDate()
        : new Date(value as string | number);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function CheckInSemanalDetalheModal({ open, onClose, pacienteNome, detalhe }: Props) {
  if (!open) return null;

  const checkInItens = detalhe.checkInSemanal
    ? checkInSemanalParaExibicao(detalhe.checkInSemanal)
    : [];
  const comentario = checkInItens.find((item) => item.key === 'comentarioSemana');
  const perguntasCheckIn = checkInItens.filter((item) => item.key !== 'comentarioSemana');
  const dataRegistro = formatarDataRegistro(detalhe.registro.dataRegistro);

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col sm:items-center sm:justify-center sm:bg-black/50 sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkin-semanal-modal-title"
    >
      <div
        className="flex flex-col flex-1 min-h-0 w-full h-full sm:flex-initial sm:h-auto sm:max-w-lg sm:max-h-[88vh] overflow-hidden rounded-none sm:rounded-2xl bg-white dark:bg-gray-900 sm:shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-start justify-between gap-3 px-4 sm:px-5 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="min-w-0">
            <h3
              id="checkin-semanal-modal-title"
              className="text-base sm:text-lg font-bold text-gray-900 dark:text-white leading-snug"
            >
              Check-in semanal
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5 truncate">
              {pacienteNome}
              {detalhe.semana > 0 ? ` · Semana ${detalhe.semana}` : ''}
              {dataRegistro ? ` · ${dataRegistro}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 dark:hover:text-gray-200 transition-colors"
            aria-label="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-5 py-4 space-y-4">
          <CheckInSemanalScoreCard score={detalhe.score} variant="prontuario" />

          {perguntasCheckIn.length > 0 && (
            <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/60 bg-gradient-to-br from-emerald-50/80 to-teal-50/40 dark:from-emerald-950/30 dark:to-teal-950/20 p-3">
              <div className="flex items-center gap-2 mb-2.5">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                  ✓
                </span>
                <p className="text-xs font-bold uppercase tracking-wide text-emerald-900 dark:text-emerald-200">
                  Respostas do paciente
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {perguntasCheckIn.map((item) => (
                  <div
                    key={item.key}
                    className="rounded-lg border border-white/80 dark:border-emerald-900/40 bg-white/90 dark:bg-gray-900/50 px-3 py-2.5 shadow-sm"
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 leading-snug">
                      {item.label}
                    </p>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mt-1 leading-snug">
                      {item.valor}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {comentario && (
            <div className="rounded-xl border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">
                Comentário do paciente
              </p>
              <p className="text-sm text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
                {comentario.valor}
              </p>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-4 sm:px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-3 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto sm:ml-auto sm:flex px-4 py-2.5 rounded-lg bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 text-sm font-semibold hover:opacity-90 transition-opacity"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

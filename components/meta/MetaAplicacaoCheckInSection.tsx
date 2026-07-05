'use client';

import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { checkInSemanalParaExibicao } from '@/lib/aplicacao/checkInSemanalResumo';
import { resolveCheckInSemanalScore } from '@/lib/aplicacao/resolveCheckInSemanalScore';
import { CheckInSemanalScoreCard } from '@/components/aplicacao/CheckInSemanalScoreCard';

type Props = {
  paciente: PacienteCompleto;
  registro: SeguimentoSemanal | null;
};

export function MetaAplicacaoCheckInSection({ paciente, registro }: Props) {
  if (!registro?.checkInSemanal) return null;

  const score = resolveCheckInSemanalScore(paciente, registro);
  const itens = checkInSemanalParaExibicao(registro.checkInSemanal);
  const comentario = itens.find((item) => item.key === 'comentarioSemana');
  const perguntas = itens.filter((item) => item.key !== 'comentarioSemana');

  if (!score && perguntas.length === 0) return null;

  return (
    <div className="rounded-xl border border-emerald-200/80 dark:border-emerald-800/50 bg-gradient-to-br from-emerald-50/60 to-teal-50/30 dark:from-emerald-950/25 dark:to-teal-950/15 p-3 sm:p-4 space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300">
        Check-in semanal
      </p>

      {score && <CheckInSemanalScoreCard score={score} />}

      {perguntas.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {perguntas.map((item) => (
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
      )}

      {comentario && (
        <div className="rounded-lg border border-amber-200/80 dark:border-amber-800/50 bg-amber-50/60 dark:bg-amber-950/20 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300 mb-1">
            Comentário
          </p>
          <p className="text-xs text-amber-950 dark:text-amber-100 leading-relaxed whitespace-pre-wrap">
            {comentario.valor}
          </p>
        </div>
      )}
    </div>
  );
}

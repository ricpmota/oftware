'use client';

import type { CheckInSemanalScoreResultado } from '@/lib/aplicacao/calcularScoreCheckInSemanal';
import { medalhaCheckInEmoji, medalhaCheckInLabel } from '@/lib/aplicacao/calcularScoreCheckInSemanal';

type Props = {
  score: CheckInSemanalScoreResultado;
  variant?: 'paciente' | 'prontuario';
};

const CATEGORIA_CORES: Record<string, string> = {
  excelente: 'from-amber-50 to-yellow-50 border-amber-200 text-amber-950',
  boa: 'from-slate-50 to-gray-50 border-slate-200 text-slate-900',
  moderada: 'from-orange-50 to-amber-50 border-orange-200 text-orange-950',
  atencao: 'from-rose-50 to-red-50 border-rose-200 text-rose-950',
  necessita_acompanhamento: 'from-red-50 to-rose-50 border-red-300 text-red-950',
};

export function CheckInSemanalScoreCard({ score, variant = 'paciente' }: Props) {
  const emoji = medalhaCheckInEmoji(score.medalha);
  const cor = CATEGORIA_CORES[score.categoria] ?? CATEGORIA_CORES.boa;
  const compact = variant === 'prontuario';

  return (
    <div
      className={`rounded-2xl border bg-gradient-to-br ${cor} ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] opacity-70">
            Score da Semana
          </p>
          <div className="flex items-end gap-2 mt-1">
            <p className={`font-bold tabular-nums leading-none ${compact ? 'text-2xl' : 'text-4xl'}`}>
              {score.score}
            </p>
            <p className={`font-semibold opacity-60 ${compact ? 'text-sm pb-0.5' : 'text-lg pb-1'}`}>
              /100
            </p>
          </div>
          <p className={`font-semibold mt-1.5 ${compact ? 'text-sm' : 'text-base'}`}>
            {score.titulo}
          </p>
        </div>
        {emoji ? (
          <div className="shrink-0 text-center">
            <span className={compact ? 'text-2xl' : 'text-4xl'} aria-hidden>
              {emoji}
            </span>
            <p className="text-[9px] font-semibold uppercase tracking-wide opacity-70 mt-0.5 max-w-[72px] leading-tight">
              {medalhaCheckInLabel(score.medalha)}
            </p>
          </div>
        ) : null}
      </div>

      {!compact && (
        <p className="text-sm leading-relaxed mt-3 opacity-90">{score.mensagemPaciente}</p>
      )}

      {score.fatoresPositivos.length > 0 && (
        <div className={`flex flex-wrap gap-1.5 ${compact ? 'mt-2.5' : 'mt-3'}`}>
          {score.fatoresPositivos.map((fator) => (
            <span
              key={fator}
              className="inline-flex items-center rounded-full bg-white/80 border border-white px-2.5 py-1 text-[11px] font-medium shadow-sm"
            >
              {fator}
            </span>
          ))}
        </div>
      )}

      {score.pontosDeAtencao.length > 0 && (
        <div className={`${compact ? 'mt-2' : 'mt-3'} space-y-1`}>
          {score.pontosDeAtencao.map((ponto) => (
            <p key={ponto} className="text-[11px] font-medium opacity-85">
              Atenção: {ponto}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

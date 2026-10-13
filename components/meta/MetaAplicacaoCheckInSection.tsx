'use client';

import type { PacienteCompleto, SeguimentoSemanal } from '@/types/obesidade';
import { checkInSemanalParaExibicao } from '@/lib/aplicacao/checkInSemanalResumo';
import { resolveCheckInSemanalScore } from '@/lib/aplicacao/resolveCheckInSemanalScore';
import { MetaAplicacaoDetalheLinha } from '@/components/meta/MetaAplicacaoDetalheLinha';

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
    <div className="space-y-0">
      <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-800 dark:text-emerald-300 pb-1">
        Check-in semanal
      </p>

      {score && (
        <>
          <MetaAplicacaoDetalheLinha
            label="Score"
            value={`${score.score}/100${score.titulo ? ` · ${score.titulo}` : ''}`}
          />
          {score.mensagemPaciente ? (
            <p className="text-xs text-gray-600 dark:text-[#E8EDED]/70 leading-relaxed py-2 border-b border-gray-200/70 dark:border-white/10">
              {score.mensagemPaciente}
            </p>
          ) : null}
        </>
      )}

      {perguntas.map((item) => (
        <MetaAplicacaoDetalheLinha key={item.key} label={item.label} value={item.valor} />
      ))}

      {comentario && (
        <div className="py-2">
          <p className="text-xs font-medium text-gray-500 dark:text-[#E8EDED]/55 mb-1">Comentário</p>
          <p className="text-sm text-gray-900 dark:text-[#E8EDED] leading-relaxed whitespace-pre-wrap">
            {comentario.valor}
          </p>
        </div>
      )}
    </div>
  );
}

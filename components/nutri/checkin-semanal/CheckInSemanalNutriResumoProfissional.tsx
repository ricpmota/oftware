'use client';

import {
  rotuloDiasSemana,
  rotuloPrincipalConquista,
  rotuloPrincipalDificuldade,
  rotuloSessoesAtividade,
} from '@/lib/nutri/checkInSemanalNutriLabels';
import {
  compareWeeklyNutritionCheckIns,
  getWeeklyNutritionCheckInFlags,
} from '@/lib/nutri/checkInSemanalNutriFlags';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { formatNutritionWeekShortLabel, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

function formatDelta(delta: number | null, suffix = ''): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `${sign}${delta}${suffix}`;
}

type Props = {
  record: CheckInSemanalNutri;
  previous?: CheckInSemanalNutri | null;
};

export function CheckInSemanalNutriResumoProfissional({ record, previous }: Props) {
  const week = getNutritionWeek(record.weekStart || record.weekKey);
  const comparison = previous ? compareWeeklyNutritionCheckIns(record, previous) : null;
  const flags = getWeeklyNutritionCheckInFlags(record);
  const dificuldade = rotuloPrincipalDificuldade(record);
  const conquista = rotuloPrincipalConquista(record);

  return (
    <section className="rounded-2xl border border-teal-100 bg-teal-50/50 p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-teal-800">Resumo da semana</p>
      <h3 className="text-base font-semibold text-slate-900">Semana {formatNutritionWeekShortLabel(week)}</h3>
      <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="text-slate-500">Score</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {record.score ?? '—'}
            {comparison?.score.delta != null && comparison.score.delta !== 0 ? (
              <span className={`ml-1 text-xs ${comparison.score.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatDelta(comparison.score.delta)}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Aderência</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {record.aderenciaPlano}%
            {comparison?.aderencia.delta != null && comparison.aderencia.delta !== 0 ? (
              <span className={`ml-1 text-xs ${comparison.aderencia.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatDelta(comparison.aderencia.delta, '%')}
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Proteína</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {rotuloDiasSemana(record.diasProteinaMeta)}
            {comparison?.proteina.delta != null && comparison.proteina.delta !== 0 ? (
              <span className={`ml-1 text-xs ${comparison.proteina.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatDelta(comparison.proteina.delta)} dias
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Frutas/vegetais</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {rotuloDiasSemana(record.diasFrutasVegetais)}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Água</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {rotuloDiasSemana(record.diasMetaAgua)}
            {comparison?.agua.delta != null && comparison.agua.delta !== 0 ? (
              <span className={`ml-1 text-xs ${comparison.agua.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatDelta(comparison.agua.delta)} dia
              </span>
            ) : null}
          </dd>
        </div>
        <div>
          <dt className="text-slate-500">Atividade física</dt>
          <dd className="font-semibold tabular-nums text-slate-900">
            {rotuloSessoesAtividade(record.sessoesAtividadeFisica)}
          </dd>
        </div>
      </dl>

      {dificuldade !== '—' ? (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Principal dificuldade</p>
          <p className="text-sm text-slate-800 mt-0.5">{dificuldade}</p>
        </div>
      ) : null}
      {conquista !== '—' ? (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Principal conquista</p>
          <p className="text-sm text-slate-800 mt-0.5">{conquista}</p>
        </div>
      ) : null}
      {record.observacoes?.trim() ? (
        <div>
          <p className="text-xs font-semibold uppercase text-slate-500">Recado do paciente</p>
          <p className="text-sm text-slate-800 mt-0.5 whitespace-pre-wrap">{record.observacoes.trim()}</p>
        </div>
      ) : null}

      {flags.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Atenção</p>
          <ul className="mt-1 space-y-0.5 text-sm text-amber-950">
            {flags.map((flag) => (
              <li key={flag.id}>• {flag.label}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

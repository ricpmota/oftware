'use client';

import {
  Activity,
  Apple,
  Droplets,
  Heart,
  MessageSquare,
  Trophy,
} from 'lucide-react';
import { checkInSemanalNutriScoreTone } from '@/lib/nutri/calcularScoreCheckInSemanalNutri';
import { linhaAutoriaCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriAutoria';
import type { CheckInSemanalNutriViewerRole } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { CheckInSemanalNutriFoodSwapList, CheckInSemanalNutriMealAdherenceList, CheckInSemanalNutriWeekMap } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriV3Summary';
import {
  rotuloAlimentacaoForaPlano,
  rotuloDiasSemana,
  rotuloEnergiaSemana,
  rotuloMediaSono,
  rotuloPrincipalConquista,
  rotuloPrincipalDificuldade,
  rotuloSessoesAtividade,
  rotuloSeveridadeGI,
} from '@/lib/nutri/checkInSemanalNutriLabels';
import {
  compareWeeklyNutritionCheckIns,
  getWeeklyNutritionCheckInFlags,
} from '@/lib/nutri/checkInSemanalNutriFlags';
import type { CheckInSemanalNutri, CheckInSemanalNutriSeveridadeGI } from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import { rotuloHydrationQuality } from '@/lib/nutri/checkInSemanalNutriV3';
import { formatNutritionWeekLongLabel, getNutritionWeek } from '@/lib/nutri/checkInSemanalNutriWeek';

type Props = {
  record: CheckInSemanalNutri;
  compact?: boolean;
  viewerRole?: CheckInSemanalNutriViewerRole;
  previous?: CheckInSemanalNutri | null;
};

function MiniBar({ label, valuePct }: { label: string; valuePct: number }) {
  const pct = Math.min(100, Math.max(0, valuePct));
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] sm:text-xs">
        <span className="font-medium text-gray-600">{label}</span>
        <span className="tabular-nums font-semibold text-gray-900">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-600 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function daysPct(days?: number | null): number {
  if (days == null || !Number.isFinite(days)) return 0;
  return (Math.min(7, Math.max(0, days)) / 7) * 100;
}

function formatDelta(delta: number | null, suffix = ''): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? '+' : '';
  return `${delta > 0 ? '↑' : '↓'} ${sign}${delta}${suffix}`;
}

function giClass(value?: CheckInSemanalNutriSeveridadeGI): string {
  if (value === 'nenhum') return 'bg-emerald-100 text-emerald-800';
  if (value === 'leve') return 'bg-amber-100 text-amber-800';
  if (value === 'moderado') return 'bg-orange-100 text-orange-800';
  if (value === 'grave') return 'bg-red-100 text-red-800';
  return 'bg-gray-100 text-gray-700';
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100/80">
      <span className="text-sm font-medium text-gray-800">{label}</span>
      <span className="text-sm font-semibold tabular-nums text-gray-900">{value}</span>
    </div>
  );
}

export function CheckInSemanalNutriDetails({
  record,
  compact = false,
  viewerRole = 'patient',
  previous = null,
}: Props) {
  const week = getNutritionWeek(record.weekStart || record.weekKey);
  const score = record.score ?? 0;
  const tone = checkInSemanalNutriScoreTone(score);
  const ringClass =
    tone === 'green' ? 'text-emerald-500' : tone === 'yellow' ? 'text-amber-500' : 'text-red-500';
  const borderL =
    tone === 'green' ? 'border-l-emerald-500' : tone === 'yellow' ? 'border-l-amber-400' : 'border-l-red-500';
  const comparison = previous ? compareWeeklyNutritionCheckIns(record, previous) : null;
  const flags = getWeeklyNutritionCheckInFlags(record);
  const autoria = linhaAutoriaCheckInSemanalNutri(record);
  const professional = viewerRole !== 'patient';
  const isV3 = isWeeklyNutritionQuestionnaireV3(record.questionnaireVersion);
  const showProbiotico = record.probioticoDias != null && record.suplementosAplicaveis?.probiotico !== false;
  const showWhey = record.wheyDias != null && record.suplementosAplicaveis?.whey !== false;
  const showCreatina = record.creatinaDias != null && record.suplementosAplicaveis?.creatina !== false;
  const showSuplementos = showProbiotico || showWhey || showCreatina;
  const scoreDelta = formatDelta(comparison?.score.delta ?? null);
  const aderenciaDelta = formatDelta(comparison?.aderencia.delta ?? null, '%');
  const atividadePct =
    record.sessoesAtividadeFisica == null
      ? 0
      : (Math.min(7, record.sessoesAtividadeFisica) / 7) * 100;
  const energiaPct =
    record.energiaSemana == null ? 0 : record.energiaSemana > 5 ? record.energiaSemana : (record.energiaSemana / 5) * 100;

  return (
    <div className={`border-l-4 ${borderL} pl-3 sm:pl-4 space-y-5`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-500 mb-1">Semana selecionada</p>
          <h3 className="text-base sm:text-lg font-bold text-gray-900 leading-tight">
            {formatNutritionWeekLongLabel(week)}
          </h3>
          <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{autoria.principal}</p>
          {autoria.edicao ? <p className="text-xs text-gray-500 mt-1">{autoria.edicao}</p> : null}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white shadow-inner ring-4 ring-gray-100" title="Score da semana">
            <svg className="absolute inset-0 h-full w-full -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-gray-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              <path
                className={ringClass}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeDasharray={`${Math.min(100, Math.max(0, score))}, 100`}
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
            <span className="relative text-sm font-extrabold tabular-nums text-gray-900">
              {Math.round(score)}
              <span className="text-[10px] font-bold text-gray-500">%</span>
            </span>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Score da semana</p>
            <p className="text-sm text-gray-700 mt-0.5">
              {tone === 'green' && 'Ótima adesão geral.'}
              {tone === 'yellow' && 'Adesão moderada — há espaço para ajustes.'}
              {tone === 'red' && 'Adesão abaixo do ideal nesta semana.'}
              {comparison?.instrumentChanged ? (
                <span className="ml-1 font-semibold text-slate-600">Nova versão do Check-in</span>
              ) : scoreDelta ? (
                <span className={`ml-1 font-semibold ${comparison?.score.delta && comparison.score.delta > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                  {scoreDelta}
                </span>
              ) : null}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <MiniBar label={`Aderência ao plano${aderenciaDelta ? ` ${aderenciaDelta}` : ''}`} valuePct={record.aderenciaPlano ?? 0} />
        {isV3 ? (
          <MiniBar
            label={`Hidratação (${record.hydrationQuality ? rotuloHydrationQuality(record.hydrationQuality) : '—'})`}
            valuePct={
              record.hydrationQuality === 'excellent'
                ? 100
                : record.hydrationQuality === 'good'
                  ? 80
                  : record.hydrationQuality === 'regular'
                    ? 50
                    : record.hydrationQuality === 'poor'
                      ? 20
                      : 0
            }
          />
        ) : (
          <>
            <MiniBar label={`Proteína (${rotuloDiasSemana(record.diasProteinaMeta)})`} valuePct={daysPct(record.diasProteinaMeta)} />
            <MiniBar label={`Água (${rotuloDiasSemana(record.diasMetaAgua)})`} valuePct={daysPct(record.diasMetaAgua)} />
          </>
        )}
        <MiniBar label="Energia / disposição" valuePct={energiaPct} />
      </div>

      {compact ? null : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {isV3 && record.dailyAdherence ? (
              <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <h4 className="mb-3 text-sm font-bold text-gray-900">Como foi a semana</h4>
                <CheckInSemanalNutriWeekMap week={week} daily={record.dailyAdherence} />
              </section>
            ) : null}

            {isV3 && (record.mealAdherence?.length || record.menuSnapshot) ? (
              <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <h4 className="mb-3 text-sm font-bold text-gray-900">Como foi cada refeição</h4>
                <CheckInSemanalNutriMealAdherenceList meals={record.mealAdherence || []} />
              </section>
            ) : null}

            {isV3 && (record.foodSwapRequests?.length || 0) > 0 ? (
              <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <h4 className="mb-3 text-sm font-bold text-gray-900">Solicitações de ajuste do cardápio</h4>
                <CheckInSemanalNutriFoodSwapList swaps={record.foodSwapRequests || []} />
              </section>
            ) : null}

            {isV3 ? null : (
              <>
            <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Apple className="h-4 w-4 text-emerald-600" />
                <h4 className="text-sm font-bold text-gray-900">Alimentação</h4>
                <span className="ml-auto text-xs font-bold tabular-nums text-emerald-700">
                  {daysPct(record.diasProteinaMeta).toFixed(0)}%
                </span>
              </div>
              <div className="space-y-2">
                <MetricRow label="Proteína" value={rotuloDiasSemana(record.diasProteinaMeta)} />
                <MetricRow label="Frutas e vegetais" value={rotuloDiasSemana(record.diasFrutasVegetais)} />
                <MetricRow label="Fora do planejado" value={rotuloAlimentacaoForaPlano(record.alimentacaoForaPlano)} />
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Droplets className="h-4 w-4 text-sky-600" />
                <h4 className="text-sm font-bold text-gray-900">Hidratação</h4>
              </div>
              <MetricRow label="Meta de água" value={rotuloDiasSemana(record.diasMetaAgua)} />
            </section>
              </>
            )}

            {showSuplementos ? (
              <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <h4 className="text-sm font-bold text-gray-900">Suplementação (histórico)</h4>
                </div>
                <div className="space-y-2">
                  {showProbiotico ? <MetricRow label="Probiótico" value={rotuloDiasSemana(record.probioticoDias)} /> : null}
                  {showWhey ? <MetricRow label="Whey" value={rotuloDiasSemana(record.wheyDias)} /> : null}
                  {showCreatina ? <MetricRow label="Creatina" value={rotuloDiasSemana(record.creatinaDias)} /> : null}
                </div>
              </section>
            ) : null}

            <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Heart className="h-4 w-4 text-rose-500" />
                <h4 className="text-sm font-bold text-gray-900">Bem-estar & rotina</h4>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(
                  [
                    ['Náuseas', record.nauseas],
                    ['Constipação', record.constipacao],
                    ['Diarreia', record.diarreia],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">{label}</p>
                    <span className={`mt-1 inline-flex text-xs font-bold px-2 py-0.5 rounded-md ${giClass(value)}`}>
                      {rotuloSeveridadeGI(value)}
                    </span>
                  </div>
                ))}
                {record.mediaSono ? (
                  <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Sono</p>
                    <p className="mt-1 text-sm font-semibold text-gray-900">{rotuloMediaSono(record.mediaSono)}</p>
                  </div>
                ) : null}
                <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Energia</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900">{rotuloEnergiaSemana(record.energiaSemana)}</p>
                </div>
                <div className="rounded-lg bg-gray-50/90 px-3 py-2 ring-1 ring-gray-100">
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Atividade física</p>
                  <p className="mt-1 text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                    <Activity className="h-3.5 w-3.5 text-sky-600" />
                    {rotuloSessoesAtividade(record.sessoesAtividadeFisica)}
                    <span className="text-xs font-normal text-gray-500">({atividadePct.toFixed(0)}%)</span>
                  </p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <Trophy className="h-4 w-4 text-amber-500" />
                <h4 className="text-sm font-bold text-gray-900">Evolução comportamental</h4>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">Principal dificuldade</p>
              <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{rotuloPrincipalDificuldade(record)}</p>
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-500 mt-3">Principal conquista</p>
              <p className="text-sm text-gray-800 mt-0.5 whitespace-pre-wrap">{rotuloPrincipalConquista(record)}</p>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white/80 p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-teal-700" />
                <h4 className="text-sm font-bold text-gray-900">Recado ao nutricionista</h4>
              </div>
              <p className="text-sm text-gray-800 whitespace-pre-wrap">{record.observacoes?.trim() || '—'}</p>
            </section>
          </div>

          {professional && flags.length > 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2">
              <p className="text-xs font-bold uppercase tracking-wide text-amber-800">Atenção</p>
              <ul className="mt-1 space-y-0.5 text-sm text-amber-950">
                {flags.map((flag) => (
                  <li key={flag.id}>• {flag.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

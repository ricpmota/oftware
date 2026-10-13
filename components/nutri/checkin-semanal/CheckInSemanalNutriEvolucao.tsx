'use client';

import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { CheckInSemanalNutriHistorico } from '@/components/nutri/checkin-semanal/CheckInSemanalNutriHistorico';
import {
  buildWeeklyNutritionAnalytics,
  type WeeklyNutritionAnalytics,
  type WeeklyNutritionHabit,
} from '@/lib/nutri/checkInSemanalNutriAnalytics';
import type { CheckInSemanalNutriViewerRole } from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { rotuloEnergiaSemana, rotuloSessoesAtividade } from '@/lib/nutri/checkInSemanalNutriLabels';
import { loadWeeklyNutritionCheckIns } from '@/lib/nutri/checkInSemanalNutriStore';
import type { CheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriTypes';
import { isWeeklyNutritionQuestionnaireV3 } from '@/lib/nutri/checkInSemanalNutriTypes';
import { rotuloHydrationQuality } from '@/lib/nutri/checkInSemanalNutriV3';

const EVOLUTION_PAGE_SIZE = 52;

type Props = {
  pacienteId: string;
  pacienteNome?: string;
  tratamentoSemana?: number | null;
  canFill: boolean;
  canDelete?: boolean;
  hasLegacyDaily: boolean;
  focusWeekKey?: string | null;
  viewerRole?: CheckInSemanalNutriViewerRole;
  nutritionistId?: string | null;
  onStartCheckIn: () => void;
  onOpenWeek: (weekKey: string) => void;
  onDeleted?: (weekKey: string) => void;
  onAdjustMenu?: () => void;
};

function habitPct(habit: WeeklyNutritionHabit): number {
  if (habit.current == null) return 0;
  if (habit.unit === 'days') return (Math.min(7, Math.max(0, habit.current)) / 7) * 100;
  if (habit.unit === 'sessions') return (Math.min(7, Math.max(0, habit.current)) / 7) * 100;
  if (habit.unit === 'quality') return Math.min(100, Math.max(0, habit.current));
  if (habit.current > 5) return Math.min(100, Math.max(0, habit.current));
  return (habit.current / 5) * 100;
}

function habitDisplay(habit: WeeklyNutritionHabit): string {
  if (habit.current == null) return '—';
  if (habit.unit === 'sessions') return rotuloSessoesAtividade(habit.current);
  if (habit.unit === 'quality') {
    if (habit.current >= 100) return 'Muito boa';
    if (habit.current >= 80) return 'Boa';
    if (habit.current >= 50) return 'Regular';
    return 'Ruim';
  }
  if (habit.unit === 'scale') return rotuloEnergiaSemana(habit.current);
  return `${habit.current}/7`;
}

function CompactBar({ label, pct, value }: { label: string; pct: number; value: string }) {
  const width = Math.min(100, Math.max(0, pct));
  return (
    <div className="flex items-center gap-2">
      <span className="w-[4.5rem] shrink-0 truncate text-[11px] text-slate-500">{label}</span>
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-500"
          style={{ width: `${width}%` }}
        />
      </div>
      <span className="w-12 shrink-0 text-right text-[11px] font-medium tabular-nums text-slate-700">{value}</span>
    </div>
  );
}

function ResumoBarras({ analytics }: { analytics: WeeklyNutritionAnalytics }) {
  const latest = analytics.latest;
  if (!latest) return null;
  const hidratacao = analytics.habits.find((h) => h.id === 'hidratacao');
  const energia = analytics.habits.find((h) => h.id === 'energia');
  const atividade = analytics.habits.find((h) => h.id === 'atividade');
  const hidratacaoLabel = isWeeklyNutritionQuestionnaireV3(latest.questionnaireVersion)
    ? latest.hydrationQuality
      ? rotuloHydrationQuality(latest.hydrationQuality)
      : '—'
    : hidratacao
      ? habitDisplay(hidratacao)
      : '—';

  return (
    <section className="rounded-xl border border-slate-200/80 bg-white px-3 py-2.5">
      <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">Resumo</p>
      <div className="space-y-1.5">
        <CompactBar
          label="Score"
          pct={latest.score ?? 0}
          value={latest.score == null ? '—' : String(Math.round(latest.score))}
        />
        <CompactBar
          label="Aderência"
          pct={latest.aderenciaPlano ?? 0}
          value={latest.aderenciaPlano == null ? '—' : `${Math.round(latest.aderenciaPlano)}%`}
        />
        {hidratacao ? (
          <CompactBar label="Hidratação" pct={habitPct(hidratacao)} value={hidratacaoLabel} />
        ) : null}
        {energia ? <CompactBar label="Energia" pct={habitPct(energia)} value={habitDisplay(energia)} /> : null}
        {atividade ? (
          <CompactBar label="Atividade" pct={habitPct(atividade)} value={habitDisplay(atividade)} />
        ) : null}
      </div>
    </section>
  );
}

export function CheckInSemanalNutriEvolucao({
  pacienteId,
  canFill,
  canDelete = false,
  hasLegacyDaily,
  focusWeekKey,
  viewerRole = 'patient',
  nutritionistId,
  onStartCheckIn,
  onOpenWeek,
  onDeleted,
}: Props) {
  const [items, setItems] = useState<CheckInSemanalNutri[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [reloadEpoch, setReloadEpoch] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setErro(null);
    loadWeeklyNutritionCheckIns(pacienteId, { pageSize: EVOLUTION_PAGE_SIZE })
      .then((result) => {
        if (!cancelled) setItems(result.items);
      })
      .catch((err) => {
        if (!cancelled) setErro(err instanceof Error ? err.message : 'Erro ao carregar evolução nutricional.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pacienteId, reloadEpoch]);

  const analytics = useMemo(() => buildWeeklyNutritionAnalytics(items), [items]);

  return (
    <div className="min-w-0 space-y-3">
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-7 w-7 animate-spin text-teal-700" aria-label="Carregando evolução nutricional" />
        </div>
      ) : erro ? (
        <p className="text-sm text-rose-700">{erro}</p>
      ) : (
        <>
          <CheckInSemanalNutriHistorico
            pacienteId={pacienteId}
            nutritionistId={nutritionistId}
            canFill={canFill}
            hasLegacyDaily={hasLegacyDaily}
            focusWeekKey={focusWeekKey}
            viewerRole={viewerRole}
            title=""
            canDelete={canDelete}
            onStartCheckIn={onStartCheckIn}
            onOpenWeek={onOpenWeek}
            onDeleted={(weekKey) => {
              setReloadEpoch((n) => n + 1);
              onDeleted?.(weekKey);
            }}
          />
          {analytics.latest ? <ResumoBarras analytics={analytics} /> : null}
        </>
      )}
    </div>
  );
}

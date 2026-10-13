'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, CheckCircle, Loader2 } from 'lucide-react';
import {
  getCheckInSemanalNutriCapabilities,
  type CheckInSemanalNutriViewerRole,
} from '@/lib/nutri/checkInSemanalNutriCapabilities';
import { loadCheckInSemanalNutri } from '@/lib/nutri/checkInSemanalNutriStore';
import {
  formatNutritionWeekLongLabel,
  formatNutritionWeekShortLabel,
  getNutritionCheckInReferenceWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';

type Layout = 'sidebar' | 'banner';

type Props = {
  pacienteId: string;
  layout: Layout;
  onOpen: () => void;
  viewerRole?: CheckInSemanalNutriViewerRole;
};

export function CheckInSemanalNutriCta({
  pacienteId,
  layout,
  onOpen,
  viewerRole = 'patient',
}: Props) {
  const week = getNutritionCheckInReferenceWeek();
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);
  const professionalFill = getCheckInSemanalNutriCapabilities(viewerRole).fillOnBehalf;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadCheckInSemanalNutri(pacienteId, week.weekKey)
      .then((record) => {
        if (!cancelled) setCompleted(Boolean(record));
      })
      .catch(() => {
        if (!cancelled) setCompleted(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [pacienteId, week.weekKey]);

  const title = completed
    ? '✓ Check-in da semana concluído'
    : professionalFill
      ? 'Check-in da semana ainda não respondido'
      : 'Check-in Semanal';
  const subtitle = completed
    ? 'Ver respostas'
    : professionalFill
      ? 'Preencher Check-in'
      : formatNutritionWeekShortLabel(week);
  const hint = completed ? formatNutritionWeekLongLabel(week) : 'Como foi sua semana?';

  if (layout === 'sidebar') {
    return (
      <button
        type="button"
        title={title}
        onClick={onOpen}
        className={`nc-pastas-item w-full flex items-center justify-center xl:justify-start min-h-11 gap-0 xl:gap-3 px-0 xl:px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors mb-1 ${
          completed
            ? 'bg-emerald-100 text-emerald-800 border-r-2 border-emerald-500'
            : 'bg-red-50 text-red-800 ring-1 ring-red-200 hover:bg-red-100'
        }`}
      >
        {loading ? (
          <Loader2 className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 animate-spin" />
        ) : completed ? (
          <CheckCircle className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-emerald-600" strokeWidth={2} />
        ) : (
          <CalendarDays className="nc-pastas-item-icon w-[18px] h-[18px] flex-shrink-0 text-red-600" strokeWidth={2} />
        )}
        <span className="nc-pastas-label hidden xl:block truncate text-left leading-tight">
          <span className="block">{title}</span>
          <span className="block text-[11px] font-medium opacity-80">{subtitle}</span>
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full md:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl font-semibold transition-all ${
        completed
          ? 'text-emerald-900 bg-emerald-100 ring-1 ring-emerald-300 hover:bg-emerald-50'
          : 'text-[#0A1F44] bg-[#4CCB7A] hover:bg-[#45b86d] shadow-lg hover:shadow-[#4CCB7A]/30'
      }`}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
      ) : completed ? (
        <CheckCircle className="h-5 w-5 shrink-0" aria-hidden />
      ) : (
        <CalendarDays className="h-5 w-5 shrink-0" aria-hidden />
      )}
      <span className="text-left leading-tight">
        <span className="block">{title}</span>
        <span className="block text-xs font-medium opacity-80">{completed ? hint : subtitle}</span>
      </span>
    </button>
  );
}

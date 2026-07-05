'use client';

import { useMemo } from 'react';
import { Scale, Percent, Dumbbell, Heart } from 'lucide-react';
import { BioMetricCard } from '@/components/bodymap/BioMetricCard';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import {
  formatBioDelta,
  getBioMainMetrics,
  getBioMetricStatus,
} from '@/utils/bioImpedanciaMetrics';
import { bioTrendDir } from '@/utils/bioImpedanciaTrend';
import type { Sex } from '@/utils/bioImpedanciaRanges';

export interface BioImpedanciaSummaryGridProps {
  registro: BioImpedanciaRegistro;
  registroAnterior: BioImpedanciaRegistro | null;
  sexo?: Sex | 'Outro' | null;
  compact?: boolean;
}

export function BioImpedanciaSummaryGrid({
  registro,
  registroAnterior,
  sexo,
  compact = false,
}: BioImpedanciaSummaryGridProps) {
  const m = getBioMainMetrics(registro);
  const mPrev = registroAnterior ? getBioMainMetrics(registroAnterior) : null;
  const peso = registro.peso;

  const cards = useMemo(() => {
    const items: {
      key: string;
      label: string;
      value: string;
      unit?: string;
      fieldKey: string;
      num: number | null;
      icon: typeof Scale;
    }[] = [];

    if (m.peso != null) {
      items.push({
        key: 'peso',
        label: 'Peso atual',
        value: m.peso.toFixed(1),
        unit: 'kg',
        fieldKey: 'peso',
        num: m.peso,
        icon: Scale,
      });
    }
    if (m.percentualGordura != null) {
      items.push({
        key: 'gordura',
        label: '% Gordura',
        value: m.percentualGordura.toFixed(1),
        unit: '%',
        fieldKey: 'percentualGordura',
        num: m.percentualGordura,
        icon: Percent,
      });
    }
    if (m.massaMuscularKg != null) {
      items.push({
        key: 'musculo',
        label: 'Massa muscular',
        value: m.massaMuscularKg.toFixed(1),
        unit: 'kg',
        fieldKey: 'massaMuscularKg',
        num: m.massaMuscularKg,
        icon: Dumbbell,
      });
    }
    if (m.gorduraVisceral != null) {
      items.push({
        key: 'visceral',
        label: 'Gordura visceral',
        value: String(Math.round(m.gorduraVisceral)),
        fieldKey: 'gorduraVisceral',
        num: m.gorduraVisceral,
        icon: Heart,
      });
    }

    return items;
  }, [m]);

  if (cards.length === 0) return null;

  return (
    <div className={`grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 lg:grid-cols-2'}`}>
      {cards.map((c) => {
        const prevNum =
          c.key === 'peso'
            ? mPrev?.peso ?? null
            : c.key === 'gordura'
              ? mPrev?.percentualGordura ?? null
              : c.key === 'musculo'
                ? mPrev?.massaMuscularKg ?? null
                : mPrev?.gorduraVisceral ?? null;

        const trend =
          c.num != null && prevNum != null
            ? bioTrendDir(c.num, prevNum)
            : 'none';

        const helper = formatBioDelta(c.num, prevNum, c.unit ?? '');

        return (
          <BioMetricCard
            key={c.key}
            label={c.label}
            value={c.value}
            unit={c.unit}
            status={getBioMetricStatus(c.fieldKey, c.num, sexo, peso)}
            trend={trend}
            helperText={helper}
            icon={c.icon}
            compact={compact}
            priority={c.key === 'peso' ? 'highlight' : 'default'}
          />
        );
      })}
    </div>
  );
}

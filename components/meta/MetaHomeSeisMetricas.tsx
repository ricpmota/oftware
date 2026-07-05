'use client';

import { useState } from 'react';
import { Activity, BarChart3, Dumbbell, Heart, Percent, RefreshCw } from 'lucide-react';
import { BioMetricCard } from '@/components/bodymap/BioMetricCard';
import { MetaHomeMetricEvolucaoModal } from '@/components/meta/MetaHomeMetricEvolucaoModal';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  formatBioDelta,
  getBioMainMetrics,
  getBioMetricStatus,
  getImcGrauObesidadeBadge,
} from '@/utils/bioImpedanciaMetrics';
import { bioTrendDir } from '@/utils/bioImpedanciaTrend';
import type { MetaHomeMetricId } from '@/utils/metaHomeMetricEvolution';
import type { Sex } from '@/utils/bioImpedanciaRanges';

export interface MetaHomeSeisMetricasProps {
  paciente: PacienteCompleto | null;
  perdaPesoAcumulado: number | null;
  perdaPesoAnterior: number | null;
  circunferenciaCm: number | null;
  circunferenciaAnterior: number | null;
  imc: number | null;
  imcAnterior: number | null;
  registroBio: BioImpedanciaRegistro | null;
  registroBioAnterior: BioImpedanciaRegistro | null;
  sexo?: Sex | 'Outro' | null;
  compact?: boolean;
}

function trendFromDelta(atual: number | null, anterior: number | null) {
  if (atual == null || anterior == null) return 'none' as const;
  return bioTrendDir(atual, anterior);
}

export function MetaHomeSeisMetricas({
  paciente,
  perdaPesoAcumulado,
  perdaPesoAnterior,
  circunferenciaCm,
  circunferenciaAnterior,
  imc,
  imcAnterior,
  registroBio,
  registroBioAnterior,
  sexo,
  compact = false,
}: MetaHomeSeisMetricasProps) {
  const [metricModal, setMetricModal] = useState<MetaHomeMetricId | null>(null);

  const m = registroBio ? getBioMainMetrics(registroBio) : null;
  const mPrev = registroBioAnterior ? getBioMainMetrics(registroBioAnterior) : null;
  const pesoBio = registroBio?.peso;

  const gridCls = `grid gap-3 ${compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-3'}`;
  const abrirEvolucao = (id: MetaHomeMetricId) => () => setMetricModal(id);

  return (
    <>
      <div className={gridCls}>
        <BioMetricCard
          label="Perda de peso acumulado"
          value={perdaPesoAcumulado != null ? perdaPesoAcumulado.toFixed(1) : '—'}
          unit={perdaPesoAcumulado != null ? 'kg' : undefined}
          icon={RefreshCw}
          trend={trendFromDelta(perdaPesoAcumulado, perdaPesoAnterior)}
          helperText={
            perdaPesoAcumulado != null && perdaPesoAnterior != null
              ? formatBioDelta(perdaPesoAcumulado, perdaPesoAnterior, 'kg')
              : null
          }
          compact={compact}
          onClick={abrirEvolucao('perdaPeso')}
        />
        <BioMetricCard
          label="Circunferência abdominal"
          value={circunferenciaCm != null ? circunferenciaCm.toFixed(1) : '—'}
          unit={circunferenciaCm != null ? 'cm' : undefined}
          icon={Activity}
          trend={trendFromDelta(circunferenciaCm, circunferenciaAnterior)}
          helperText={
            circunferenciaCm != null && circunferenciaAnterior != null
              ? formatBioDelta(circunferenciaCm, circunferenciaAnterior, 'cm')
              : null
          }
          compact={compact}
          onClick={abrirEvolucao('circunferencia')}
        />
        <BioMetricCard
          label="IMC"
          value={imc != null ? imc.toFixed(1) : '—'}
          unit={imc != null ? 'kg/m²' : undefined}
          icon={BarChart3}
          badge={getImcGrauObesidadeBadge(imc) ?? undefined}
          trend={trendFromDelta(imc, imcAnterior)}
          helperText={imc != null && imcAnterior != null ? formatBioDelta(imc, imcAnterior, 'kg/m²') : null}
          compact={compact}
          onClick={abrirEvolucao('imc')}
        />
        <BioMetricCard
          label="% Gordura"
          value={m?.percentualGordura != null ? m.percentualGordura.toFixed(1) : '—'}
          unit={m?.percentualGordura != null ? '%' : undefined}
          icon={Percent}
          status={
            m?.percentualGordura != null
              ? getBioMetricStatus('percentualGordura', m.percentualGordura, sexo, pesoBio ?? null)
              : 'neutro'
          }
          trend={trendFromDelta(m?.percentualGordura ?? null, mPrev?.percentualGordura ?? null)}
          helperText={formatBioDelta(m?.percentualGordura ?? null, mPrev?.percentualGordura ?? null, '%')}
          compact={compact}
          onClick={abrirEvolucao('gordura')}
        />
        <BioMetricCard
          label="Massa muscular"
          value={m?.massaMuscularKg != null ? m.massaMuscularKg.toFixed(1) : '—'}
          unit={m?.massaMuscularKg != null ? 'kg' : undefined}
          icon={Dumbbell}
          status={
            m?.massaMuscularKg != null
              ? getBioMetricStatus('massaMuscularKg', m.massaMuscularKg, sexo, pesoBio ?? null)
              : 'neutro'
          }
          trend={trendFromDelta(m?.massaMuscularKg ?? null, mPrev?.massaMuscularKg ?? null)}
          helperText={formatBioDelta(m?.massaMuscularKg ?? null, mPrev?.massaMuscularKg ?? null, 'kg')}
          compact={compact}
          onClick={abrirEvolucao('massaMuscular')}
        />
        <BioMetricCard
          label="Gordura visceral"
          value={m?.gorduraVisceral != null ? String(Math.round(m.gorduraVisceral)) : '—'}
          icon={Heart}
          status={
            m?.gorduraVisceral != null
              ? getBioMetricStatus('gorduraVisceral', m.gorduraVisceral, sexo, pesoBio ?? null)
              : 'neutro'
          }
          trend={trendFromDelta(m?.gorduraVisceral ?? null, mPrev?.gorduraVisceral ?? null)}
          helperText={formatBioDelta(m?.gorduraVisceral ?? null, mPrev?.gorduraVisceral ?? null, '')}
          compact={compact}
          onClick={abrirEvolucao('gorduraVisceral')}
        />
      </div>

      <MetaHomeMetricEvolucaoModal
        open={metricModal != null}
        metricId={metricModal}
        paciente={paciente}
        onClose={() => setMetricModal(null)}
      />
    </>
  );
}

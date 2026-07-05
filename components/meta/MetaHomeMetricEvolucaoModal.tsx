'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { BioEvolutionLineChart } from '@/components/bodymap/BioEvolutionLineChart';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  META_HOME_METRIC_CONFIG,
  buildMetaHomeMetricEvolution,
  metaHomeMetricHasEvolutionChart,
  type MetaHomeMetricId,
} from '@/utils/metaHomeMetricEvolution';

export interface MetaHomeMetricEvolucaoModalProps {
  open: boolean;
  metricId: MetaHomeMetricId | null;
  paciente: PacienteCompleto | null;
  onClose: () => void;
}

export function MetaHomeMetricEvolucaoModal({
  open,
  metricId,
  paciente,
  onClose,
}: MetaHomeMetricEvolucaoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open || !metricId || typeof document === 'undefined') return null;

  const config = META_HOME_METRIC_CONFIG[metricId];
  const dados = buildMetaHomeMetricEvolution(paciente, metricId);
  const temGrafico = metaHomeMetricHasEvolutionChart(paciente, metricId);

  return createPortal(
    <div
      className="fixed inset-0 z-[99990] flex items-end sm:items-center justify-center p-0 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meta-home-metric-evolucao-titulo"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="relative z-[1] w-full max-w-lg rounded-t-2xl sm:rounded-2xl border border-gray-200 bg-white shadow-xl max-h-[min(90vh,560px)] flex flex-col">
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">Evolução</p>
            <h2 id="meta-home-metric-evolucao-titulo" className="text-base font-semibold text-gray-900 sm:text-lg">
              {config.label}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-800"
            aria-label="Fechar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto px-4 py-4 sm:px-5 sm:py-5">
          {temGrafico ? (
            <BioEvolutionLineChart
              data={dados}
              label={config.label}
              unit={config.unit}
              color={config.color}
              height={240}
            />
          ) : (
            <p className="text-sm text-gray-500 text-center py-10 leading-relaxed">
              Ainda não há registros suficientes para exibir a evolução desta métrica.
              <br />
              <span className="text-xs text-gray-400">São necessários pelo menos 2 pontos de medição.</span>
            </p>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

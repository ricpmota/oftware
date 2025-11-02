'use client';

import { varianceStatus, getVarianceColorClasses } from '@/utils/expectedCurve';

interface ProgressPillProps {
  varianceKg: number | null;
  expectedWeight: number;
  actualWeight: number;
}

/**
 * Componente que renderiza o desvio de peso com indicação visual de cor
 */
export function ProgressPill({ varianceKg, expectedWeight, actualWeight }: ProgressPillProps) {
  const status = varianceStatus(varianceKg);
  const colorClasses = getVarianceColorClasses(status);
  
  const formatNumber = (num: number) => num.toFixed(1);
  
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-700">
        Peso real: <span className="font-semibold">{formatNumber(actualWeight)} kg</span> • 
        Peso previsto: <span className="font-semibold">{formatNumber(expectedWeight)} kg</span>
      </div>
      {varianceKg !== null ? (
        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses}`}>
          Δ = {varianceKg > 0 ? '+' : ''}{varianceKg} kg
        </div>
      ) : (
        <div className="text-xs text-gray-400">Sem comparação</div>
      )}
    </div>
  );
}


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
  const formatVariance = (num: number) => num.toFixed(1); // 3 dígitos total (um após vírgula)
  
  return (
    <div className="space-y-1">
      <div className="text-xs text-gray-600">
        Real: <span className="font-semibold text-gray-900">{formatNumber(actualWeight)} kg</span> • 
        Previsto: <span className="font-semibold text-gray-900">{formatNumber(expectedWeight)} kg</span>
      </div>
      {varianceKg !== null ? (
        <div className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorClasses}`}>
          Δ = {varianceKg > 0 ? '+' : ''}{formatVariance(varianceKg)} kg
        </div>
      ) : (
        <div className="text-xs text-gray-400">Sem comparação</div>
      )}
    </div>
  );
}


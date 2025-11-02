'use client';

import { getVarianceColorClasses } from '@/utils/expectedCurve';

interface ProgressPillProps {
  varianceKg: number;
  expectedWeight: number;
  actualWeight: number;
}

/**
 * Componente que renderiza o desvio de peso com indicação visual de cor
 */
export function ProgressPill({ varianceKg, expectedWeight, actualWeight }: ProgressPillProps) {
  const status = Math.abs(varianceKg) <= 0.3 ? 'GREEN' : Math.abs(varianceKg) <= 1.0 ? 'YELLOW' : 'RED';
  const colorClasses = getVarianceColorClasses(status);
  
  const formatNumber = (num: number) => num.toFixed(1);
  
  return (
    <div className="space-y-1">
      <div className="text-sm text-gray-700">
        Peso real: <span className="font-semibold">{formatNumber(actualWeight)} kg</span> • 
        Peso previsto: <span className="font-semibold">{formatNumber(expectedWeight)} kg</span>
      </div>
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${colorClasses}`}>
        Δ = {varianceKg > 0 ? '+' : ''}{formatNumber(varianceKg)} kg
      </div>
    </div>
  );
}


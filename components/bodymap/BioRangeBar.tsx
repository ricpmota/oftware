'use client';

export interface BioRangeBarProps {
  /** Label do campo */
  label: string;
  /** Unidade (ex: L, kg, %) */
  unit: string;
  /** Limite inferior da zona NORMAL */
  min: number;
  /** Limite superior da zona NORMAL */
  max: number;
  /** Valor absoluto mínimo da escala (zona ABAIXO) - se ausente, usa min com margem */
  barMin?: number;
  /** Valor absoluto máximo da escala (zona ACIMA) - se ausente, usa max com margem */
  barMax?: number;
  /** Valor atual */
  value: number | null;
  width?: number;
  height?: number;
}

type ZoneStatus = 'abaixo' | 'normal' | 'acima';

/**
 * Barra de referência com 3 zonas: Abaixo (azul), Normal (verde), Acima (vermelho)
 */
export function BioRangeBar({
  label,
  unit,
  min,
  max,
  barMin: barMinProp,
  barMax: barMaxProp,
  value,
  width = 300,
  height = 24,
}: BioRangeBarProps) {
  const hasValue = value !== null && !isNaN(value);
  const rangeWidth = max - min;

  const barMin = barMinProp ?? Math.max(0, min - rangeWidth * 0.5);
  const barMax = barMaxProp ?? max + rangeWidth * 0.5;

  const getStatus = (): ZoneStatus | null => {
    if (!hasValue) return null;
    if (value! < min) return 'abaixo';
    if (value! > max) return 'acima';
    return 'normal';
  };

  const status = getStatus();

  // Zonas padronizadas: 30% Abaixo | 30% Normal | 40% Acima
  const ZONE_ABAIXO_PCT = 30;
  const ZONE_NORMAL_PCT = 30;
  const ZONE_ACIMA_PCT = 40;

  const zoneAbaixoStart = 0;
  const zoneAbaixoWidth = ZONE_ABAIXO_PCT;
  const zoneNormalStart = ZONE_ABAIXO_PCT;
  const zoneNormalWidth = ZONE_NORMAL_PCT;
  const zoneAcimaStart = ZONE_ABAIXO_PCT + ZONE_NORMAL_PCT;
  const zoneAcimaWidth = ZONE_ACIMA_PCT;

  // Posição do marcador: mapeia o valor real para a escala 0–100%
  const getValuePosition = () => {
    if (!hasValue) return null;
    const v = value!;
    if (v < min) {
      const t = barMin < min ? (v - barMin) / (min - barMin) : 0;
      return t * ZONE_ABAIXO_PCT;
    }
    if (v <= max) {
      const t = min < max ? (v - min) / (max - min) : 0.5;
      return ZONE_ABAIXO_PCT + t * ZONE_NORMAL_PCT;
    }
    const t = max < barMax ? (v - max) / (barMax - max) : 1;
    return ZONE_ABAIXO_PCT + ZONE_NORMAL_PCT + Math.min(1, t) * ZONE_ACIMA_PCT;
  };

  const markerPosition = getValuePosition();

  const statusLabel: Record<ZoneStatus, string> = {
    abaixo: 'Abaixo',
    normal: 'Normal',
    acima: 'Acima',
  };
  const fmt = (n: number) => Number(n).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 1 });

  return (
    <div className="flex flex-col gap-1.5 min-w-0 w-full max-w-full overflow-hidden">
      {/* Valor + status acima da barra */}
      <div className="flex items-center justify-between gap-2 text-xs">
        {hasValue ? (
          <>
            <span className="font-semibold text-gray-900 tabular-nums">{fmt(value!)} {unit}</span>
            {status && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  status === 'normal'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                    : status === 'abaixo'
                      ? 'bg-blue-50 text-blue-700 border-blue-100'
                      : 'bg-red-50 text-red-700 border-red-100'
                }`}
              >
                {statusLabel[status]}
              </span>
            )}
          </>
        ) : (
          <span className="text-gray-500">Sem valor informado</span>
        )}
      </div>
      {/* Limites */}
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>&lt;{fmt(min)}</span>
        <span className="text-emerald-600 font-medium">{fmt(min)}–{fmt(max)}</span>
        <span>&gt;{fmt(max)}</span>
      </div>
      {/* Barra visual */}
      <div className="relative w-full max-w-full min-w-0 rounded-full overflow-hidden" style={{ height: `${height}px` }}>
        {/* Zona Abaixo (azul - degradê) */}
        {zoneAbaixoWidth > 0 && (
          <div
            className="absolute top-0 h-full rounded-l-full"
            style={{
              left: `${zoneAbaixoStart}%`,
              width: `${zoneAbaixoWidth}%`,
              background: 'linear-gradient(90deg, #93c5fd 0%, #3b82f6 50%, #1d4ed8 100%)',
              borderRadius: zoneNormalWidth === 0 && zoneAcimaWidth === 0 ? '9999px' : '9999px 0 0 9999px',
            }}
          />
        )}
        {/* Zona Normal (verde - degradê) */}
        {zoneNormalWidth > 0 && (
          <div
            className="absolute top-0 h-full"
            style={{
              left: `${zoneNormalStart}%`,
              width: `${zoneNormalWidth}%`,
              background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 50%, #15803d 100%)',
              borderRadius: zoneAbaixoWidth === 0 && zoneAcimaWidth === 0 ? '9999px' : zoneAbaixoWidth === 0 ? '9999px 0 0 9999px' : zoneAcimaWidth === 0 ? '0 9999px 9999px 0' : '0',
            }}
          />
        )}
        {/* Zona Acima (vermelho - degradê) */}
        {zoneAcimaWidth > 0 && (
          <div
            className="absolute top-0 h-full rounded-r-full"
            style={{
              left: `${zoneAcimaStart}%`,
              width: `${zoneAcimaWidth}%`,
              background: 'linear-gradient(90deg, #f87171 0%, #dc2626 50%, #b91c1c 100%)',
              borderRadius: zoneNormalWidth === 0 && zoneAbaixoWidth === 0 ? '9999px' : '0 9999px 9999px 0',
            }}
          />
        )}
        {/* Marcador do valor - amarelo para destacar sobre as 3 cores */}
        {markerPosition !== null && (
          <div
            className="absolute top-0 w-1 h-full rounded-full z-20 bg-gray-900 shadow-md"
            style={{ left: `${markerPosition}%`, transform: 'translateX(-50%)' }}
          />
        )}
      </div>
    </div>
  );
}

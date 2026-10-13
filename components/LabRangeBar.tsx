'use client';

import { LabRange } from '@/types/labRanges';

export type LabBarVisualStatus = 'ideal' | 'optimize' | 'attention' | 'neutral';

interface LabRangeBarProps {
  range: LabRange;
  value: number | null;
  /** @deprecated Preferir largura fluida (100%). Mantido por compatibilidade. */
  width?: number;
  height?: number;
  /** Status visual já resolvido (não recalcula regras clínicas). */
  status?: LabBarVisualStatus;
  /** Exibe o balão numérico acima do marcador (padrão true). */
  showValueBubble?: boolean;
}

const STATUS_MARKER: Record<LabBarVisualStatus, string> = {
  ideal: 'var(--state-success)',
  optimize: 'var(--state-warning)',
  attention: 'var(--state-danger)',
  neutral: 'var(--text-secondary)',
};

/**
 * Barra visual do intervalo de referência de um exame laboratorial.
 * A matemática de posição (padding 20%) é preservada; só a representação muda.
 */
export function LabRangeBar({
  range,
  value,
  width,
  height = 15,
  status,
  showValueBubble = true,
}: LabRangeBarProps) {
  const hasValue = value !== null && !isNaN(value);
  const inRange = hasValue && value >= range.min && value <= range.max;

  const visualStatus: LabBarVisualStatus =
    status ?? (hasValue ? (inRange ? 'ideal' : 'attention') : 'neutral');
  const markerColor = STATUS_MARKER[visualStatus];

  // Normaliza o valor para a escala 0-100% da barra
  const getValuePosition = () => {
    if (!hasValue) return null;

    // Expandir o range para deixar a visualização mais clara
    const rangeWidth = range.max - range.min;
    const padding = rangeWidth * 0.2; // 20% de padding
    const expandedMin = range.min - padding;
    const expandedMax = range.max + padding;
    const expandedRange = expandedMax - expandedMin;

    const normalizedValue = ((value - expandedMin) / expandedRange) * 100;
    return Math.max(0, Math.min(100, normalizedValue));
  };

  const markerPosition = getValuePosition();

  // Posição da faixa de referência normal na barra
  const getRangePosition = () => {
    const rangeWidth = range.max - range.min;
    const padding = rangeWidth * 0.2;
    const expandedMin = range.min - padding;
    const expandedMax = range.max + padding;
    const expandedRange = expandedMax - expandedMin;

    const start = ((range.min - expandedMin) / expandedRange) * 100;
    const end = ((range.max - expandedMin) / expandedRange) * 100;

    return { start, end, width: end - start };
  };

  const rangePos = getRangePosition();

  const formatTick = (n: number) => {
    if (!Number.isFinite(n)) return '';
    return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '');
  };

  const formatBubble = (n: number) => {
    if (!Number.isFinite(n)) return '';
    if (Number.isInteger(n)) return String(n);
    const fixed = n.toFixed(1);
    return fixed.endsWith('.0') ? fixed.slice(0, -2) : fixed;
  };

  const widthStyle = width != null ? { width: `${width}px` } : undefined;
  // Escala visual do marcador/balão conforme altura da barra (mesmo layout em linha)
  const markerSize = height <= 13 ? 18 : 22;
  const bubbleReserve = height <= 13 ? 22 : 26;
  const bubbleFont = height <= 13 ? 10 : 12;
  const tickPadBottom = height <= 13 ? 12 : 14;

  return (
    <div className="flex w-full min-w-0 flex-col" style={widthStyle}>
      <div
        className="relative w-full"
        style={{ paddingTop: bubbleReserve, paddingBottom: tickPadBottom }}
      >
        {/* Barra com gradient suave (linguagem visual — não é semáforo clínico) */}
        <div
          className="relative w-full rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.05)]"
          style={{
            height: `${height}px`,
            background:
              'linear-gradient(90deg, #34b36a 0%, #7bc98a 32%, #d4d88a 55%, #e8b86a 78%, #e07a72 100%)',
          }}
        >
          {/* Ticks verticais de min/max na escala expandida */}
          <span
            className="pointer-events-none absolute top-1/2 z-[1] h-[130%] w-px -translate-y-1/2 bg-slate-400/35"
            style={{ left: `${rangePos.start}%` }}
            aria-hidden
          />
          <span
            className="pointer-events-none absolute top-1/2 z-[1] h-[130%] w-px -translate-y-1/2 bg-slate-400/35"
            style={{ left: `${rangePos.end}%` }}
            aria-hidden
          />
        </div>

        {/* Balão: clamp visual nas extremidades (não altera a posição do marcador) */}
        {markerPosition !== null && showValueBubble && (
          <div
            className="pointer-events-none absolute top-0 z-[4]"
            style={{
              left: `clamp(14px, ${markerPosition}%, calc(100% - 14px))`,
              transform: 'translateX(-50%)',
            }}
          >
            <div
              className="rounded-md px-1 py-px font-bold leading-[1.3] text-white whitespace-nowrap shadow-[0_1px_2px_rgba(0,0,0,0.12)]"
              style={{ background: markerColor, fontSize: bubbleFont }}
            >
              {formatBubble(value as number)}
            </div>
            <div
              className="mx-auto h-0 w-0 border-x-[3px] border-t-[4px] border-x-transparent"
              style={{ borderTopColor: markerColor }}
              aria-hidden
            />
          </div>
        )}

        {/* Marcador circular na posição matemática real */}
        {markerPosition !== null && (
          <div
            className="pointer-events-none absolute z-[3]"
            style={{
              left: `${markerPosition}%`,
              top: bubbleReserve + height / 2,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div
              className="rounded-full border-2 border-white shadow-[0_1px_3px_rgba(0,0,0,0.14)]"
              style={{
                width: markerSize,
                height: markerSize,
                background: markerColor,
              }}
              aria-hidden
            />
          </div>
        )}

        {/* Labels min/max alinhados à escala expandida */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-3 text-[8px] tabular-nums text-slate-400">
          <span
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${rangePos.start}%` }}
          >
            {formatTick(range.min)}
          </span>
          <span
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${rangePos.end}%` }}
          >
            {formatTick(range.max)}
          </span>
        </div>
      </div>
    </div>
  );
}

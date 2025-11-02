'use client';

import { LabRange } from '@/types/labRanges';

interface LabRangeBarProps {
  range: LabRange;
  value: number | null;
  width?: number;
  height?: number;
}

/**
 * Componente que renderiza uma barra visual representando o intervalo de referência
 * de um exame laboratorial, com marcador mostrando o valor atual.
 */
export function LabRangeBar({ range, value, width = 300, height = 20 }: LabRangeBarProps) {
  const hasValue = value !== null && !isNaN(value);
  const inRange = hasValue && value >= range.min && value <= range.max;
  
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
    const width = ((range.max - range.min) / expandedRange) * 100;
    
    return { start, width };
  };
  
  const rangePos = getRangePosition();
  
  return (
    <div className="flex flex-col gap-1">
      {/* Barra visual */}
      <div className="relative" style={{ width: `${width}px`, height: `${height}px` }}>
        {/* Fundo cinza */}
        <div className="absolute inset-0 bg-gray-200 rounded-full" />
        
        {/* Faixa de referência (verde) */}
        <div
          className="absolute top-0 h-full bg-green-500 rounded-full opacity-60"
          style={{
            left: `${rangePos.start}%`,
            width: `${rangePos.width}%`,
          }}
        />
        
        {/* Marcador do valor atual */}
        {markerPosition !== null && (
          <div
            className={`absolute top-0 w-1 h-full rounded-full ${
              inRange ? 'bg-green-600' : 'bg-red-600'
            }`}
            style={{ left: `${markerPosition}%` }}
          />
        )}
      </div>
      
      {/* Labels informativos */}
      <div className="text-xs text-gray-600">
        {hasValue ? (
          <span className={inRange ? 'text-green-700' : 'text-red-700'}>
            {inRange ? '✅' : '⚠️'} Valor: {value} {range.unit} • 
            Referência: {range.min}-{range.max} {range.unit}
          </span>
        ) : (
          <span className="text-gray-400">Sem valor informado</span>
        )}
      </div>
    </div>
  );
}


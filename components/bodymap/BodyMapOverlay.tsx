'use client';

import { useState } from 'react';
import { getBioRange } from '@/utils/bioImpedanciaRanges';
import type { MassaMagraSegmentar, GorduraSegmentar } from '@/types/bioImpedancia';
import type { Sex } from '@/utils/bioImpedanciaRanges';

const BODY_MAP_POSITIONS = {
  arm_r: { x: 23, y: 34, side: 'left' as const, label: 'Braço Dir.' },
  arm_l: { x: 77, y: 34, side: 'right' as const, label: 'Braço Esq.' },
  trunk: { x: 50, y: 42, side: 'center' as const, label: 'Tronco' },
  leg_r: { x: 32, y: 72, side: 'left' as const, label: 'Perna Dir.' },
  leg_l: { x: 68, y: 72, side: 'right' as const, label: 'Perna Esq.' },
} as const;

const GORRURA_KEYS: Record<keyof typeof BODY_MAP_POSITIONS, string> = {
  arm_r: 'gordura_arm_r',
  arm_l: 'gordura_arm_l',
  trunk: 'gordura_trunk',
  leg_r: 'gordura_leg_r',
  leg_l: 'gordura_leg_l',
};

/** Fallback: faixas ideais de referência para colorir (abaixo=azul, normal=preto, acima=vermelho) */
const FALLBACK_LIMITES: Record<string, { min: number; max: number }> = {
  arm_r: { min: 1.5, max: 6 },
  arm_l: { min: 1.5, max: 6 },
  trunk: { min: 18, max: 38 },
  leg_r: { min: 6, max: 16 },
  leg_l: { min: 6, max: 16 },
  gordura_arm_r: { min: 0.5, max: 4 },
  gordura_arm_l: { min: 0.5, max: 4 },
  gordura_trunk: { min: 6, max: 25 },
  gordura_leg_r: { min: 2, max: 10 },
  gordura_leg_l: { min: 2, max: 10 },
};

type StatusCor = 'normal' | 'acima' | 'abaixo';

function getStatusCor(valorKg: number, range: { min: number; max: number } | null): StatusCor {
  const r = range ?? null;
  if (!r || valorKg <= 0) return 'normal';
  if (valorKg > r.max) return 'acima';
  if (valorKg < r.min) return 'abaixo';
  return 'normal';
}

const COR_POR_STATUS: Record<StatusCor, string> = {
  normal: '#111827',
  acima: '#dc2626',
  abaixo: '#2563eb',
};


type Side = 'left' | 'right' | 'center';

function getLabelStyle(x: number, y: number, side: Side): React.CSSProperties {
  const base: React.CSSProperties = {
    position: 'absolute',
    left: `${x}%`,
    top: `${y}%`,
    whiteSpace: 'nowrap',
    pointerEvents: 'auto',
  };
  switch (side) {
    case 'center':
      return { ...base, transform: 'translate(-50%, -50%)' };
    case 'left':
      return { ...base, transform: 'translate(-100%, -50%)' };
    case 'right':
      return { ...base, transform: 'translate(0, -50%)' };
  }
}

interface BodyMapOverlayProps {
  imageSrc: string;
  imageAlt: string;
  massaMagraSegmentar?: MassaMagraSegmentar | null;
  gorduraSegmentar?: GorduraSegmentar | null;
  sexo?: Sex | null;
}

export function BodyMapOverlay({ imageSrc, imageAlt, massaMagraSegmentar, gorduraSegmentar, sexo }: BodyMapOverlayProps) {
  const [modo, setModo] = useState<'massaMagra' | 'gordura'>('massaMagra');
  const dadosAtuais = modo === 'massaMagra' ? massaMagraSegmentar : gorduraSegmentar;

  const getRange = (key: keyof typeof BODY_MAP_POSITIONS): { min: number; max: number } | null => {
    const rangeKey = modo === 'gordura' ? GORRURA_KEYS[key] : key;
    const fromJson = getBioRange(rangeKey, sexo ?? undefined);
    if (fromJson && typeof fromJson.min === 'number' && typeof fromJson.max === 'number') {
      return { min: fromJson.min, max: fromJson.max };
    }
    return FALLBACK_LIMITES[rangeKey] ?? null;
  };

  return (
    <div className="w-full max-w-[420px] mx-auto">
      {/* Switch Visualizar Massa Magra / Gordura */}
      <div className="flex flex-wrap items-center justify-center gap-2 mb-4">
        <div className="inline-flex rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            type="button"
            onClick={() => setModo('massaMagra')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              modo === 'massaMagra' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Massa magra
          </button>
          <button
            type="button"
            onClick={() => setModo('gordura')}
            className={`rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
              modo === 'gordura' ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Gordura segmentar
          </button>
        </div>
      </div>
      <div className="relative w-full rounded-2xl bg-gray-50/80 border border-gray-100 p-4">
        {/* Imagem do corpo - mantém proporção natural */}
        <img
          src={imageSrc}
          alt={imageAlt}
          className="w-full h-auto max-h-[360px] object-contain select-none block"
          draggable={false}
        />
        {/* Overlay com labels - posicionado sobre a imagem */}
        <div className="absolute inset-0">
          {(Object.keys(BODY_MAP_POSITIONS) as Array<keyof typeof BODY_MAP_POSITIONS>).map((key) => {
            const pos = BODY_MAP_POSITIONS[key];
            const seg = dadosAtuais?.[key];
            const valorKg = seg?.kg ?? 0;
            const valor = valorKg > 0 ? `${valorKg.toFixed(1)} kg` : '-';
            const percentual = seg != null && seg.percentual > 0 ? `${seg.percentual.toFixed(0)}%` : '-';
            const range = getRange(key);
            const status = getStatusCor(valorKg, range);
            const cor = COR_POR_STATUS[status];
            return (
              <div
                key={key}
                className="absolute transition-opacity hover:opacity-100"
                style={getLabelStyle(pos.x, pos.y, pos.side)}
              >
                <div
                  className="rounded-[10px] px-2 py-1.5 text-[11px] font-semibold"
                  style={{
                    background: 'white',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                  }}
                >
                  <div className="leading-tight" style={{ color: cor }}>{valor}</div>
                  <div className="leading-tight" style={{ color: valor === '-' ? '#6b7280' : cor }}>{percentual}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Legenda das cores */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-3 text-[10px] text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#111827' }} />
          Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#dc2626' }} />
          Acima
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ background: '#2563eb' }} />
          Abaixo
        </span>
      </div>
    </div>
  );
}

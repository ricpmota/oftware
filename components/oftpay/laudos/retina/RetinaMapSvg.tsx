'use client';

import type {
  EyeSide,
  RetinaFinding,
  RetinaMapClickPayload,
  RetinaMeiosOpticos,
  RetinaSection,
} from '@/types/oftpay/retinaMap';
import { RETINA_MEIOS_OPTICOS_LABELS, RETINA_SECTION_LABELS } from '@/types/oftpay/retinaMap';
import { hitTestRetinaMap } from '@/lib/oftpay/retinaMapGeometry';
import RetinaFindingLayer from './RetinaFindingLayer';

/**
 * Mapa esquemático de fundo de olho (não substitui imagem diagnóstica).
 * Coordenadas em viewBox 600×600; hit-test usa normalização 0–1 em retinaMapGeometry.
 */
const VIEW_SIZE = 600;
const CENTER_X = 300;
const CENTER_Y = 300;
const FUNDUS_RX = 272;
const FUNDUS_RY = 266;

interface RetinaMapSvgProps {
  eye: EyeSide;
  findings: RetinaFinding[];
  /** Overlay visual opcional derivado dos campos de vítreo. */
  meiosOpticos?: RetinaMeiosOpticos | null;
  activeSection?: RetinaSection;
  mapClickEnabled?: boolean;
  /** Rótulo do achado em modo de localização (ex.: "Drusas"). */
  placementLabel?: string;
  onAddFinding: (payload: RetinaMapClickPayload) => void;
  onSelectMeiosOpticos?: () => void;
}

const DISC_X = 390;
const MACULA_X = 270;
const GLOW_X = 282;

/** Espelha o desenho inteiro para OE (coordenadas sempre em espaço OD). */
function eyeMirrorTransform(eye: EyeSide): string | undefined {
  return eye === 'OE' ? `translate(${VIEW_SIZE}, 0) scale(-1, 1)` : undefined;
}

function vitreoOverlayStyle(value: RetinaMeiosOpticos | null): {
  fill: string;
  opacity: number;
} {
  if (!value) return { fill: '#e7e5e4', opacity: 0.38 };
  switch (value) {
    case 'transparentes':
      return { fill: '#ffffff', opacity: 0 };
    case 'opacidades_leves':
      return { fill: '#f5f5f4', opacity: 0.14 };
    case 'opacidades_moderadas':
      return { fill: '#e7e5e4', opacity: 0.28 };
    case 'opacidades_densas':
      return { fill: '#d6d3d1', opacity: 0.45 };
    case 'hemorragia_vitrea_leve':
      return { fill: '#fecaca', opacity: 0.18 };
    case 'hemorragia_vitrea_moderada':
      return { fill: '#f87171', opacity: 0.28 };
    case 'hemorragia_vitrea_densa':
      return { fill: '#dc2626', opacity: 0.38 };
    case 'catarata_incipiente':
      return { fill: '#a8a29e', opacity: 0.16 };
    case 'catarata_moderada':
      return { fill: '#78716c', opacity: 0.3 };
    case 'catarata_densa':
      return { fill: '#57534e', opacity: 0.48 };
    default:
      return { fill: '#ffffff', opacity: 0 };
  }
}

/** Path cúbico em coordenadas OD (temporal = esquerda, nasal = direita). */
function vesselPath(
  start: { x: number; y: number },
  curves: Array<{ c1x: number; c1y: number; c2x: number; c2y: number; x: number; y: number }>
): string {
  let d = `M ${start.x} ${start.y}`;
  for (const c of curves) {
    d += ` C ${c.c1x} ${c.c1y}, ${c.c2x} ${c.c2y}, ${c.x} ${c.y}`;
  }
  return d;
}

/** Arcadas vasculares — desenhadas em espaço OD; espelhadas via transform no grupo pai. */
function renderVessels() {
  const d = { x: DISC_X, y: CENTER_Y };
  const mac = { x: MACULA_X, y: CENTER_Y };

  const supVein = vesselPath({ x: d.x + 4, y: d.y - 12 }, [
    { c1x: d.x - 70, c1y: d.y - 85, c2x: 200, c2y: 105, x: 88, y: 128 },
    { c1x: 62, c1y: 142, c2x: 48, c2y: 158, x: 38, y: 172 },
  ]);

  const supVein2 = vesselPath({ x: d.x - 2, y: d.y - 8 }, [
    { c1x: d.x - 58, c1y: d.y - 72, c2x: 215, c2y: 112, x: 105, y: 138 },
  ]);

  const infVein = vesselPath({ x: d.x + 4, y: d.y + 12 }, [
    { c1x: d.x - 70, c1y: d.y + 85, c2x: 200, c2y: 495, x: 88, y: 472 },
    { c1x: 62, c1y: 458, c2x: 48, c2y: 442, x: 38, y: 428 },
  ]);

  const infVein2 = vesselPath({ x: d.x - 2, y: d.y + 8 }, [
    { c1x: d.x - 58, c1y: d.y + 72, c2x: 215, c2y: 488, x: 105, y: 462 },
  ]);

  const supArt = vesselPath({ x: d.x + 8, y: d.y - 8 }, [
    { c1x: d.x - 52, c1y: d.y - 62, c2x: 220, c2y: 128, x: 118, y: 148 },
    { c1x: 98, c1y: 158, c2x: 82, c2y: 168, x: 72, y: 178 },
  ]);

  const infArt = vesselPath({ x: d.x + 8, y: d.y + 8 }, [
    { c1x: d.x - 52, c1y: d.y + 62, c2x: 220, c2y: 472, x: 118, y: 452 },
    { c1x: 98, c1y: 442, c2x: 82, c2y: 432, x: 72, y: 422 },
  ]);

  const nasalSupArt = vesselPath({ x: d.x + 16, y: d.y - 14 }, [
    { c1x: d.x + 42, c1y: d.y - 42, c2x: d.x + 58, c2y: d.y - 68, x: d.x + 52, y: d.y - 92 },
  ]);

  const nasalInfVein = vesselPath({ x: d.x + 14, y: d.y + 14 }, [
    { c1x: d.x + 40, c1y: d.y + 40, c2x: d.x + 56, c2y: d.y + 66, x: d.x + 50, y: d.y + 90 },
  ]);

  const toMacArt = vesselPath({ x: d.x - 24, y: d.y - 5 }, [
    { c1x: (d.x + mac.x) / 2, c1y: d.y - 22, c2x: mac.x - 10, c2y: mac.y - 10, x: mac.x + 4, y: mac.y - 2 },
  ]);

  const toMacVein = vesselPath({ x: d.x - 20, y: d.y + 6 }, [
    { c1x: (d.x + mac.x) / 2, c1y: d.y + 24, c2x: mac.x - 12, c2y: mac.y + 12, x: mac.x + 6, y: mac.y + 4 },
  ]);

  const discEmerging = [
    { ox: -2, oy: -14, ex: -14, ey: -24, w: 2.5, vein: false },
    { ox: 4, oy: -10, ex: -18, ey: -20, w: 2, vein: false },
    { ox: 10, oy: -12, ex: 12, ey: -22, w: 3.2, vein: true },
    { ox: -2, oy: 14, ex: -14, ey: 24, w: 2.5, vein: false },
    { ox: 4, oy: 10, ex: -18, ey: 20, w: 3.4, vein: true },
    { ox: 10, oy: 12, ex: 12, ey: 22, w: 2, vein: false },
    { ox: 14, oy: 2, ex: 18, ey: 0, w: 2.2, vein: false },
    { ox: -10, oy: -2, ex: -16, ey: -4, w: 2.8, vein: true },
  ];

  return (
    <g id="retinal-vessels" pointerEvents="none" aria-hidden>
      <path d={supVein} stroke="#3d0a14" strokeWidth={6.5} opacity={0.64} fill="none" strokeLinecap="round" />
      <path d={supVein2} stroke="#4a0e1a" strokeWidth={5} opacity={0.58} fill="none" strokeLinecap="round" />
      <path d={infVein} stroke="#3d0a14" strokeWidth={6.5} opacity={0.64} fill="none" strokeLinecap="round" />
      <path d={infVein2} stroke="#4a0e1a" strokeWidth={5} opacity={0.58} fill="none" strokeLinecap="round" />

      <path d={supArt} stroke="#a82a2a" strokeWidth={3} opacity={0.74} fill="none" strokeLinecap="round" />
      <path d={infArt} stroke="#a82a2a" strokeWidth={3} opacity={0.74} fill="none" strokeLinecap="round" />

      <path d={nasalSupArt} stroke="#b53535" strokeWidth={2.6} opacity={0.7} fill="none" strokeLinecap="round" />
      <path d={nasalInfVein} stroke="#3d0a14" strokeWidth={4.5} opacity={0.6} fill="none" strokeLinecap="round" />

      <path d={toMacArt} stroke="#c04040" strokeWidth={2.2} opacity={0.72} fill="none" strokeLinecap="round" />
      <path d={toMacVein} stroke="#3d0a14" strokeWidth={3.8} opacity={0.58} fill="none" strokeLinecap="round" />

      {discEmerging.map((v, i) => (
        <line
          key={i}
          x1={d.x + v.ox}
          y1={d.y + v.oy}
          x2={d.x + v.ox + v.ex}
          y2={d.y + v.oy + v.ey}
          stroke={v.vein ? '#3d0a14' : '#a83030'}
          strokeWidth={v.w}
          opacity={0.72}
          strokeLinecap="round"
        />
      ))}
    </g>
  );
}

export default function RetinaMapSvg({
  eye,
  findings,
  meiosOpticos = null,
  activeSection,
  mapClickEnabled = true,
  placementLabel,
  onAddFinding,
  onSelectMeiosOpticos,
}: RetinaMapSvgProps) {
  const uid = `retina-${eye}`;
  const eyeFindings = findings.filter((f) => f.eye === eye);
  const mirrorTransform = eyeMirrorTransform(eye);

  const nasalLabelX = eye === 'OD' ? CENTER_X + FUNDUS_RX - 36 : CENTER_X - FUNDUS_RX + 36;
  const temporalLabelX = eye === 'OD' ? CENTER_X - FUNDUS_RX + 36 : CENTER_X + FUNDUS_RX - 36;

  const handleSvgClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!mapClickEnabled) return;

    const svg = event.currentTarget;
    const pt = svg.createSVGPoint();
    pt.x = event.clientX;
    pt.y = event.clientY;
    const ctm = svg.getScreenCTM();
    if (!ctm) return;

    const { x: px, y: py } = pt.matrixTransform(ctm.inverse());
    const hit = hitTestRetinaMap(px / VIEW_SIZE, py / VIEW_SIZE, eye);
    if (!hit.insideRetina) return;

    onAddFinding({
      x: hit.x,
      y: hit.y,
      region: hit.region,
      quadrant: hit.quadrant,
      clockHour: hit.clockHour,
    });
  };

  const vitreoStyle = vitreoOverlayStyle(meiosOpticos);

  return (
    <svg
      viewBox={`0 0 ${VIEW_SIZE} ${VIEW_SIZE}`}
      className={`w-full max-w-lg mx-auto select-none ${
        mapClickEnabled ? 'cursor-crosshair' : 'cursor-default'
      }`}
      style={{ filter: 'drop-shadow(0 8px 24px rgba(60, 10, 10, 0.22))' }}
      role="img"
      aria-label={`Mapa esquemático de retina — ${eye}`}
      onClick={handleSvgClick}
    >
      <defs>
        <radialGradient id={`${uid}-fundus`} cx="46%" cy="48%" r="58%">
          <stop offset="0%" stopColor="#ff9a72" />
          <stop offset="28%" stopColor="#e8634a" />
          <stop offset="55%" stopColor="#c93d30" />
          <stop offset="78%" stopColor="#8f2218" />
          <stop offset="100%" stopColor="#4a0e12" />
        </radialGradient>

        <radialGradient id={`${uid}-glow`} cx="44%" cy="50%" r="32%">
          <stop offset="0%" stopColor="#ffc4a8" stopOpacity={0.55} />
          <stop offset="100%" stopColor="#c93d30" stopOpacity={0} />
        </radialGradient>

        <radialGradient id={`${uid}-vignette`} cx="50%" cy="50%" r="50%">
          <stop offset="55%" stopColor="#000000" stopOpacity={0} />
          <stop offset="100%" stopColor="#2d0808" stopOpacity={0.42} />
        </radialGradient>

        <radialGradient id={`${uid}-macula`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#4a120e" stopOpacity={0.62} />
          <stop offset="45%" stopColor="#5c1812" stopOpacity={0.38} />
          <stop offset="100%" stopColor="#7a2218" stopOpacity={0.08} />
        </radialGradient>

        <radialGradient id={`${uid}-disc`} cx="42%" cy="40%" r="58%">
          <stop offset="0%" stopColor="#fff9ed" />
          <stop offset="40%" stopColor="#f2e0b8" />
          <stop offset="85%" stopColor="#d4b87a" />
          <stop offset="100%" stopColor="#b89555" />
        </radialGradient>

        <radialGradient id={`${uid}-cup`} cx="48%" cy="46%" r="48%">
          <stop offset="0%" stopColor="#fffdf8" />
          <stop offset="55%" stopColor="#efe6d0" />
          <stop offset="100%" stopColor="#d9c9a0" />
        </radialGradient>

        <filter id={`${uid}-noise`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.92" numOctaves={4} seed={12} result="n" />
          <feColorMatrix type="saturate" values="0" in="n" result="gn" />
          <feComponentTransfer in="gn" result="soft">
            <feFuncA type="linear" slope={0.028} />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="soft" mode="soft-light" />
        </filter>

        <filter id={`${uid}-rim`} x="-4%" y="-4%" width="108%" height="108%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="3" result="blur" />
          <feOffset dx="0" dy="2" result="off" />
          <feComponentTransfer in="off" result="shadow">
            <feFuncA type="linear" slope={0.35} />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode in="shadow" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <clipPath id={`${uid}-clip`}>
          <ellipse cx={CENTER_X} cy={CENTER_Y} rx={FUNDUS_RX} ry={FUNDUS_RY} />
        </clipPath>
      </defs>

      {/* Sombra externa */}
      <ellipse
        cx={CENTER_X}
        cy={CENTER_Y + 4}
        rx={FUNDUS_RX + 8}
        ry={FUNDUS_RY + 6}
        fill="#2d0808"
        opacity={0.2}
        pointerEvents="none"
      />

      <g
        clipPath={`url(#${uid}-clip)`}
        filter={`url(#${uid}-noise)`}
        pointerEvents="none"
        transform={mirrorTransform}
      >
        {/* Fundo retiniano */}
        <ellipse cx={CENTER_X} cy={CENTER_Y} rx={FUNDUS_RX} ry={FUNDUS_RY} fill={`url(#${uid}-fundus)`} />

        {/* Reflexo luminoso — lado temporal (mácula) */}
        <ellipse cx={GLOW_X} cy={CENTER_Y} rx={FUNDUS_RX * 0.42} ry={FUNDUS_RY * 0.38} fill={`url(#${uid}-glow)`} />

        {/* Vinheta periférica */}
        <ellipse cx={CENTER_X} cy={CENTER_Y} rx={FUNDUS_RX} ry={FUNDUS_RY} fill={`url(#${uid}-vignette)`} />

        {/* Quadrantes — guias radiais discretas */}
        <g stroke="#3d1210" strokeWidth={0.8} opacity={0.05} fill="none">
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
            return (
              <line
                key={i}
                x1={CENTER_X}
                y1={CENTER_Y}
                x2={CENTER_X + Math.cos(a) * FUNDUS_RX * 0.94}
                y2={CENTER_Y + Math.sin(a) * FUNDUS_RY * 0.94}
              />
            );
          })}
        </g>

        {/* Mácula temporal */}
        <ellipse cx={MACULA_X} cy={CENTER_Y} rx={40} ry={30} fill={`url(#${uid}-macula)`} />
        <ellipse cx={MACULA_X} cy={CENTER_Y} rx={26} ry={19} fill="#4a100c" opacity={0.28} />
        <circle cx={MACULA_X} cy={CENTER_Y} r={6} fill="#2d0806" opacity={0.82} />
        <circle cx={MACULA_X} cy={CENTER_Y} r={2.5} fill="#1a0403" opacity={0.95} />

        {renderVessels()}

        {/* Disco óptico nasal */}
        <ellipse
          cx={DISC_X}
          cy={CENTER_Y}
          rx={36}
          ry={34}
          fill={`url(#${uid}-disc)`}
          stroke="#9a7340"
          strokeWidth={2}
        />
        <ellipse
          cx={DISC_X + 2}
          cy={CENTER_Y}
          rx={35}
          ry={33}
          fill="none"
          stroke="#7a5a2e"
          strokeWidth={0.9}
          opacity={0.45}
        />
        <ellipse cx={DISC_X} cy={CENTER_Y} rx={16} ry={15} fill={`url(#${uid}-cup)`} stroke="#c4a86a" strokeWidth={0.8} />
        <ellipse cx={DISC_X} cy={CENTER_Y} rx={7} ry={6.5} fill="#faf6ee" opacity={0.9} />

        <g stroke="#b89860" strokeWidth={0.7} opacity={0.35} aria-hidden>
          {Array.from({ length: 10 }).map((_, i) => {
            const a = (i / 10) * Math.PI * 2;
            return (
              <line
                key={i}
                x1={DISC_X + Math.cos(a) * 8}
                y1={CENTER_Y + Math.sin(a) * 7.5}
                x2={DISC_X + Math.cos(a) * 30}
                y2={CENTER_Y + Math.sin(a) * 28}
              />
            );
          })}
        </g>
      </g>

      {/* Borda vinho */}
      <ellipse
        cx={CENTER_X}
        cy={CENTER_Y}
        rx={FUNDUS_RX}
        ry={FUNDUS_RY}
        fill="none"
        stroke="#3d0a14"
        strokeWidth={2.5}
        opacity={0.75}
        filter={`url(#${uid}-rim)`}
        pointerEvents="none"
      />
      <ellipse
        cx={CENTER_X}
        cy={CENTER_Y}
        rx={FUNDUS_RX}
        ry={FUNDUS_RY}
        fill="none"
        stroke="#8f3d35"
        strokeWidth={0.6}
        opacity={0.35}
        pointerEvents="none"
      />

      {/* Labels anatômicos */}
      <g
        fontSize={11}
        fill="#2d0808"
        opacity={0.25}
        fontFamily="system-ui, -apple-system, sans-serif"
        pointerEvents="none"
      >
        <text x={CENTER_X} y={42} textAnchor="middle" fontWeight={500}>
          Superior
        </text>
        <text x={CENTER_X} y={VIEW_SIZE - 28} textAnchor="middle" fontWeight={500}>
          Inferior
        </text>
        <text x={nasalLabelX} y={CENTER_Y + 4} textAnchor="middle" fontWeight={500}>
          Nasal
        </text>
        <text x={temporalLabelX} y={CENTER_Y + 4} textAnchor="middle" fontWeight={500}>
          Temporal
        </text>
      </g>

      {/* Vítreo — efeito visual */}
      {meiosOpticos && vitreoStyle.opacity > 0 && (
        <ellipse
          cx={CENTER_X}
          cy={CENTER_Y}
          rx={FUNDUS_RX}
          ry={FUNDUS_RY}
          fill={vitreoStyle.fill}
          opacity={vitreoStyle.opacity}
          pointerEvents="none"
        />
      )}

      {/* Achados clínicos — sempre por cima */}
      <RetinaFindingLayer findings={eyeFindings} viewSize={VIEW_SIZE} />

      {(activeSection || placementLabel) && (
        <g pointerEvents="none">
          <rect
            x={72}
            y={VIEW_SIZE - 36}
            width={456}
            height={24}
            rx={6}
            fill={mapClickEnabled && placementLabel ? '#4c1d95' : '#1c1917'}
            opacity={0.9}
          />
          <text
            x={CENTER_X}
            y={VIEW_SIZE - 20}
            textAnchor="middle"
            fontSize={10}
            fill="#e7e5e4"
            fontFamily="system-ui, sans-serif"
          >
            {placementLabel && mapClickEnabled
              ? `Localizar: ${placementLabel} — clique no fundo`
              : activeSection
                ? `Etapa: ${RETINA_SECTION_LABELS[activeSection]}`
                : ''}
          </text>
        </g>
      )}

      {meiosOpticos && onSelectMeiosOpticos && (
        <g
          role="button"
          tabIndex={0}
          aria-label="Alterar vítreo"
          className="cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            onSelectMeiosOpticos();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onSelectMeiosOpticos();
            }
          }}
        >
          <rect x={72} y={16} width={276} height={30} rx={7} fill="#1e1b4b" opacity={0.9} />
          <text
            x={210}
            y={35}
            textAnchor="middle"
            fontSize={11}
            fill="#e0e7ff"
            fontFamily="system-ui, sans-serif"
          >
            Vítreo: {RETINA_MEIOS_OPTICOS_LABELS[meiosOpticos]} — alterar
          </text>
        </g>
      )}

      <g pointerEvents="none">
        <rect x={16} y={16} width={46} height={28} rx={7} fill="#1c1917" opacity={0.9} />
        <text
          x={39}
          y={35}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill="#fafaf9"
          fontFamily="system-ui, sans-serif"
        >
          {eye}
        </text>
      </g>
    </svg>
  );
}

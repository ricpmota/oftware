'use client';

import type { RetinaFinding } from '@/types/oftpay/retinaMap';

interface RetinaFindingLayerProps {
  findings: RetinaFinding[];
  /** Deve coincidir com o viewBox do RetinaMapSvg (ex.: 600). */
  viewSize?: number;
}

function FindingSymbol({
  finding,
  scale,
}: {
  finding: RetinaFinding;
  scale: number;
}) {
  const px = finding.x * scale;
  const py = finding.y * scale;
  const key = finding.id;
  const s = scale / 400;

  switch (finding.type) {
    case 'drusa':
      return (
        <g key={key}>
          <circle cx={px - 3 * s} cy={py - 2 * s} r={2 * s} fill="#b8860b" opacity={0.95} />
          <circle cx={px + 2 * s} cy={py + 1 * s} r={1.5 * s} fill="#daa520" opacity={0.95} />
          <circle cx={px} cy={py + 3 * s} r={1.5 * s} fill="#cd853f" opacity={0.95} />
        </g>
      );
    case 'hemorragia':
      return (
        <g key={key}>
          <circle cx={px} cy={py} r={5 * s} fill="#b91c1c" opacity={0.9} />
          <circle cx={px} cy={py} r={2.5 * s} fill="#7f1d1d" />
        </g>
      );
    case 'exsudato':
      return (
        <g key={key}>
          <circle
            cx={px}
            cy={py}
            r={4.5 * s}
            fill="#facc15"
            stroke="#ca8a04"
            strokeWidth={1 * s}
          />
        </g>
      );
    case 'microaneurisma':
      return <circle key={key} cx={px} cy={py} r={2 * s} fill="#dc2626" />;
    case 'lattice':
      return (
        <g key={key} stroke="#4b5563" strokeWidth={1.2 * s}>
          <line x1={px - 6 * s} y1={py - 6 * s} x2={px + 6 * s} y2={py + 6 * s} />
          <line x1={px - 4 * s} y1={py + 6 * s} x2={px + 6 * s} y2={py - 4 * s} />
          <line x1={px - 6 * s} y1={py + 2 * s} x2={px + 4 * s} y2={py - 6 * s} />
        </g>
      );
    case 'rotura':
      return (
        <g key={key} fill="#ef4444" stroke="#991b1b" strokeWidth={1 * s}>
          <polygon
            points={`${px},${py - 7 * s} ${px - 6 * s},${py + 5 * s} ${px + 6 * s},${py + 5 * s}`}
          />
        </g>
      );
    case 'buraco':
      return (
        <circle
          key={key}
          cx={px}
          cy={py}
          r={5 * s}
          fill="none"
          stroke="#1f2937"
          strokeWidth={2 * s}
          strokeDasharray={`${2 * s} ${1 * s}`}
        />
      );
    case 'cicatriz':
      return (
        <g key={key} fill="none" stroke="#78716c" strokeWidth={1.5 * s}>
          <path
            d={`M ${px - 5 * s} ${py} Q ${px} ${py - 6 * s} ${px + 6 * s} ${py + 2 * s} T ${px + 2 * s} ${py + 7 * s}`}
          />
        </g>
      );
    case 'atrofia_epr':
      return (
        <ellipse
          key={key}
          cx={px}
          cy={py}
          rx={8 * s}
          ry={6 * s}
          fill="#fef3c7"
          stroke="#d97706"
          strokeWidth={1 * s}
          opacity={0.8}
        />
      );
    case 'descolamento_retina':
      return (
        <g key={key}>
          <path
            d={`M ${px - 12 * s} ${py} Q ${px - 4 * s} ${py - 8 * s} ${px + 4 * s} ${py} T ${px + 12 * s} ${py + 4 * s}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth={2 * s}
            opacity={0.85}
          />
          <ellipse cx={px} cy={py} rx={10 * s} ry={7 * s} fill="#93c5fd" opacity={0.3} />
        </g>
      );
    case 'nevo':
      return (
        <ellipse key={key} cx={px} cy={py} rx={7 * s} ry={5 * s} fill="#422006" opacity={0.88} />
      );
    case 'membrana_epirretiniana':
      return (
        <g key={key} stroke="#a855f7" strokeWidth={1.2 * s} fill="none" opacity={0.92}>
          <path
            d={`M ${px - 8 * s} ${py} Q ${px} ${py - 5 * s} ${px + 8 * s} ${py} Q ${px} ${py + 5 * s} ${px - 8 * s} ${py}`}
          />
        </g>
      );
    case 'edema_macular':
      return (
        <circle
          key={key}
          cx={px}
          cy={py}
          r={10 * s}
          fill="#fde68a"
          opacity={0.5}
          stroke="#f59e0b"
          strokeWidth={1.2 * s}
        />
      );
    case 'papiledema':
      return (
        <g key={key}>
          <circle
            cx={px}
            cy={py}
            r={14 * s}
            fill="none"
            stroke="#f97316"
            strokeWidth={2 * s}
            opacity={0.65}
          />
          <circle cx={px} cy={py} r={9 * s} fill="#fed7aa" opacity={0.4} />
        </g>
      );
    case 'outros':
    default:
      return (
        <g key={key}>
          <rect
            x={px - 4 * s}
            y={py - 4 * s}
            width={8 * s}
            height={8 * s}
            fill="#6366f1"
            transform={`rotate(45 ${px} ${py})`}
          />
        </g>
      );
  }
}

export default function RetinaFindingLayer({
  findings,
  viewSize = 400,
}: RetinaFindingLayerProps) {
  return (
    <g className="retina-finding-layer" aria-label="Achados marcados" pointerEvents="none">
      {findings.map((finding) => (
        <FindingSymbol key={finding.id} finding={finding} scale={viewSize} />
      ))}
    </g>
  );
}

'use client';

import React, { useId } from 'react';
import { Brain, Dumbbell, Stethoscope, User, UtensilsCrossed } from 'lucide-react';
import styles from './como-funciona-mobile.module.css';

type Quadrant = {
  key: 'medico' | 'nutri' | 'psi' | 'treino';
  name: string;
  href: string;
  aria: string;
  icon: typeof Stethoscope;
  hitClass: string;
  sliceClass: string;
  accent: string;
  glass: string;
  edge: string;
};

const QUADRANTS: Quadrant[] = [
  {
    key: 'medico',
    name: 'Médico',
    href: '/metaadmin',
    aria: 'Médico. Acessar área médica.',
    icon: Stethoscope,
    hitClass: styles.hitMedico,
    sliceClass: styles.sliceMedico,
    accent: '#4CCB7A',
    glass: 'M 18.1 36.85 A 34.5 34.5 0 0 1 36.85 18.1',
    edge: 'M 9.14 33.16 A 44.2 44.2 0 0 1 33.16 9.14',
  },
  {
    key: 'nutri',
    name: 'Nutri',
    href: '/metanutri',
    aria: 'Nutri. Acessar área do nutricionista.',
    icon: UtensilsCrossed,
    hitClass: styles.hitNutri,
    sliceClass: styles.sliceNutri,
    accent: '#3ecb9a',
    glass: 'M 63.15 18.1 A 34.5 34.5 0 0 1 81.9 36.85',
    edge: 'M 66.84 9.14 A 44.2 44.2 0 0 1 90.86 33.16',
  },
  {
    key: 'psi',
    name: 'Psi',
    href: '/metapsi',
    aria: 'Psi. Acessar área de psiquiatria.',
    icon: Brain,
    hitClass: styles.hitPsi,
    sliceClass: styles.slicePsi,
    accent: '#8ea4c8',
    glass: 'M 36.85 81.9 A 34.5 34.5 0 0 1 18.1 63.15',
    edge: 'M 33.16 90.86 A 44.2 44.2 0 0 1 9.14 66.84',
  },
  {
    key: 'treino',
    name: 'Treino',
    href: '/metapersonal',
    aria: 'Treino. Acessar área do personal.',
    icon: Dumbbell,
    hitClass: styles.hitTreino,
    sliceClass: styles.sliceTreino,
    accent: '#2F8FA3',
    glass: 'M 81.9 63.15 A 34.5 34.5 0 0 1 63.15 81.9',
    edge: 'M 90.86 66.84 A 44.2 44.2 0 0 1 66.84 90.86',
  },
];

export default function ComoFuncionaMobilePizza({
  onAccess,
}: {
  onAccess: (path: string) => void;
}) {
  const uid = useId().replace(/:/g, '');

  return (
    <div className="mx-auto w-full max-w-full">
      <header className="mx-auto mb-2.5 w-[min(100%,17.5rem)] px-1 text-center">
        <h2 className="text-[1.65rem] font-bold leading-tight tracking-tight text-[#E8EDED]">Como funciona</h2>
        <p className="mt-1.5 text-sm leading-snug text-[#E8EDED]/55">
          Acompanhamento integrado em todas as etapas.
        </p>
      </header>

      <div className={styles.stage}>
        <div className={styles.glow} aria-hidden />
        <div className={styles.wheel}>
          <svg className={styles.slices} viewBox="0 0 100 100" aria-hidden="true">
            <defs>
              <radialGradient id={`${uid}-glass`} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="48">
                <stop offset="28%" stopColor="#1a3d66" stopOpacity="0.96" />
                <stop offset="58%" stopColor="#122848" stopOpacity="0.94" />
                <stop offset="100%" stopColor="#0A1F44" stopOpacity="0.9" />
              </radialGradient>
              <radialGradient id={`${uid}-light`} gradientUnits="userSpaceOnUse" cx="50" cy="50" r="46">
                <stop offset="18%" stopColor="#ffffff" stopOpacity="0.16" />
                <stop offset="42%" stopColor="#4CCB7A" stopOpacity="0.05" />
                <stop offset="70%" stopColor="#ffffff" stopOpacity="0" />
              </radialGradient>
            </defs>
            {QUADRANTS.map((quadrant) => (
              <g key={quadrant.key} className={quadrant.sliceClass}>
                <path
                  d={quadrant.glass}
                  fill="none"
                  stroke={`url(#${uid}-glass)`}
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <path
                  className={styles.sheen}
                  d={quadrant.glass}
                  fill="none"
                  stroke={`url(#${uid}-light)`}
                  strokeWidth="22"
                  strokeLinecap="round"
                />
                <path
                  d={quadrant.edge}
                  fill="none"
                  stroke={quadrant.accent}
                  strokeOpacity="0.42"
                  strokeWidth="0.55"
                  strokeLinecap="round"
                />
              </g>
            ))}
          </svg>

          <button
            type="button"
            className={styles.core}
            onClick={() => onAccess('/meta')}
            aria-label="Acessar área do paciente"
          >
            <User className={styles.coreIcon} aria-hidden />
            <span className={styles.coreLabel}>Paciente</span>
          </button>

          {QUADRANTS.map((quadrant) => {
            const Icon = quadrant.icon;
            return (
              <button
                key={quadrant.key}
                type="button"
                className={`${styles.hit} ${quadrant.hitClass}`}
                style={{ '--accent': quadrant.accent } as React.CSSProperties}
                onClick={() => onAccess(quadrant.href)}
                aria-label={quadrant.aria}
              >
                <span className={styles.stack}>
                  <span className={styles.icon}>
                    <Icon className={styles.iconSvg} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className={styles.name}>{quadrant.name}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';

import { Stethoscope, UserCheck, UtensilsCrossed, Dumbbell } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg?: string;
};

const NODES = [
  { key: 'medico', label: 'Médico', icon: Stethoscope, pos: 'top' },
  { key: 'nutri', label: 'Nutrição', icon: UtensilsCrossed, pos: 'left' },
  { key: 'treino', label: 'Treino', icon: Dumbbell, pos: 'right' },
  { key: 'paciente', label: 'Paciente', icon: UserCheck, pos: 'bottom' },
] as const;

export default function HomeProvisorioPillars({ accentColor }: Props) {
  return (
    <section className="drprov-rise overflow-hidden rounded-2xl bg-[#0A1F44] px-3.5 py-7 text-white sm:px-6 sm:py-10">
      <h2 className="text-center text-[1.25rem] font-bold tracking-tight sm:text-[1.6rem]">
        Os pilares do Método
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-white/65 sm:text-[14px]">
        Integração real entre quem conduz, quem acompanha e quem vive a jornada.
      </p>

      <div className="relative mx-auto mt-8 h-[280px] w-full max-w-[320px] sm:h-[320px] sm:max-w-[380px]">
        {/* Connection lines */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 320 280"
          fill="none"
          aria-hidden
        >
          <line x1="160" y1="52" x2="160" y2="140" stroke={accentColor} strokeOpacity="0.35" strokeWidth="1.5" />
          <line x1="160" y1="140" x2="160" y2="228" stroke={accentColor} strokeOpacity="0.35" strokeWidth="1.5" />
          <line x1="58" y1="140" x2="160" y2="140" stroke={accentColor} strokeOpacity="0.35" strokeWidth="1.5" />
          <line x1="160" y1="140" x2="262" y2="140" stroke={accentColor} strokeOpacity="0.35" strokeWidth="1.5" />
          <circle cx="160" cy="140" r="4" fill={accentColor} className="homeprov-pulse-dot" />
        </svg>

        <Node
          className="absolute left-1/2 top-0 -translate-x-1/2"
          label="Médico"
          icon={Stethoscope}
          accentColor={accentColor}
        />
        <Node
          className="absolute left-0 top-1/2 -translate-y-1/2"
          label="Nutrição"
          icon={UtensilsCrossed}
          accentColor={accentColor}
        />
        <Node
          className="absolute right-0 top-1/2 -translate-y-1/2"
          label="Treino"
          icon={Dumbbell}
          accentColor={accentColor}
        />
        <Node
          className="absolute bottom-0 left-1/2 -translate-x-1/2"
          label="Paciente"
          icon={UserCheck}
          accentColor={accentColor}
        />

        <div className="absolute left-1/2 top-1/2 z-[2] flex h-[72px] w-[72px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border border-white/15 bg-[#0A1F44] shadow-[0_0_0_6px_rgba(76,203,122,0.12)] sm:h-20 sm:w-20">
          <p className="text-[9px] font-semibold uppercase tracking-wider text-white/50">Centro</p>
          <p className="text-[11px] font-bold leading-tight" style={{ color: accentColor }}>
            Método
          </p>
        </div>
      </div>

      <ul className="sr-only">
        {NODES.map((n) => (
          <li key={n.key}>{n.label}</li>
        ))}
      </ul>
    </section>
  );
}

function Node({
  className,
  label,
  icon: Icon,
  accentColor,
}: {
  className: string;
  label: string;
  icon: typeof Stethoscope;
  accentColor: string;
}) {
  return (
    <div className={`z-[1] flex w-[88px] flex-col items-center gap-1.5 sm:w-[100px] ${className}`}>
      <span
        className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 sm:h-12 sm:w-12"
        style={{ color: accentColor }}
      >
        <Icon className="h-5 w-5" aria-hidden />
      </span>
      <span className="text-center text-[12px] font-semibold text-white/90">{label}</span>
    </div>
  );
}

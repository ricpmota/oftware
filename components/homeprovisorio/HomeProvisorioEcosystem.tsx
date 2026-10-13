'use client';

import { Stethoscope, UtensilsCrossed, Dumbbell, UserCheck } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg?: string;
};

export default function HomeProvisorioEcosystem({ accentColor }: Props) {
  return (
    <section className="drprov-rise overflow-hidden rounded-2xl bg-[#0A1F44] px-3 py-7 text-white sm:px-6 sm:py-9">
      <h2 className="text-center text-[22px] font-bold tracking-tight sm:text-[24px]">
        Um ecossistema conectado
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-white/65 sm:text-[14px]">
        Médico, paciente, nutrição, psiquiatria e treino dentro da mesma jornada — com acompanhamento integrado quando necessário.
      </p>

      <div className="relative mx-auto mt-8 h-[300px] w-full max-w-[340px] sm:h-[320px] sm:max-w-[380px]">
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 340 300"
          fill="none"
          aria-hidden
        >
          <line
            className="homeprov-eco-line homeprov-eco-line-1"
            x1="170"
            y1="48"
            x2="170"
            y2="150"
            stroke={accentColor}
            strokeWidth="1.5"
          />
          <line
            className="homeprov-eco-line homeprov-eco-line-2"
            x1="52"
            y1="150"
            x2="170"
            y2="150"
            stroke={accentColor}
            strokeWidth="1.5"
          />
          <line
            className="homeprov-eco-line homeprov-eco-line-3"
            x1="288"
            y1="150"
            x2="170"
            y2="150"
            stroke={accentColor}
            strokeWidth="1.5"
          />
          <circle cx="170" cy="150" r="4" fill={accentColor} className="homeprov-pulse-dot" />
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

        <div className="absolute left-1/2 top-1/2 z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center">
          <div
            className="flex h-[84px] w-[84px] flex-col items-center justify-center rounded-full border border-white/15 bg-[#0A1F44] sm:h-24 sm:w-24"
            style={{ boxShadow: `0 0 0 6px ${accentColor}22` }}
          >
            <UserCheck className="mb-1 h-5 w-5" style={{ color: accentColor }} aria-hidden />
            <p className="text-[12px] font-bold text-white">Paciente</p>
          </div>
        </div>

        <div className="absolute bottom-1 left-1/2 flex w-[90%] -translate-x-1/2 flex-col items-center gap-1">
          <span className="h-px w-10 bg-white/15" aria-hidden />
          <p className="text-center text-[11px] text-white/45">
            Ambiente do <span style={{ color: accentColor }}>Método Emagrecer</span>
          </p>
        </div>
      </div>
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
    <div className={`z-[1] flex w-[86px] flex-col items-center gap-1.5 sm:w-[96px] ${className}`}>
      <span
        className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 sm:h-11 sm:w-11"
        style={{ color: accentColor }}
      >
        <Icon className="h-[18px] w-[18px]" aria-hidden />
      </span>
      <span className="text-center text-[12px] font-semibold text-white/90">{label}</span>
    </div>
  );
}

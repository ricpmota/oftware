'use client';

import React from 'react';
import { Stethoscope, UtensilsCrossed, Dumbbell, UserCheck } from 'lucide-react';

const BADGES = [
  { label: 'Paciente', icon: UserCheck, delay: '0s' },
  { label: 'Médico', icon: Stethoscope, delay: '-5s' },
  { label: 'Nutricionista', icon: UtensilsCrossed, delay: '-10s' },
  { label: 'Personal', icon: Dumbbell, delay: '-15s' },
] as const;

function RoleBadge({
  label,
  icon: Icon,
  delay,
}: {
  label: string;
  icon: React.ElementType;
  delay: string;
}) {
  return (
    <div
      className="absolute left-1/2 top-1/2 z-30 [--hero-orbit-r:72px] sm:[--hero-orbit-r:82px] lg:[--hero-orbit-r:92px] xl:[--hero-orbit-r:102px] animate-hero-card-orbit pointer-events-none"
      style={{ animationDelay: delay }}
    >
      <div className="flex items-center gap-2 rounded-full border border-[#22C55E]/35 bg-white px-3 py-2 shadow-lg shadow-[#22C55E]/15 whitespace-nowrap -translate-x-1/2 -translate-y-1/2">
        <div className="w-7 h-7 rounded-full bg-[#22C55E]/10 flex items-center justify-center shrink-0">
          <Icon className="w-3.5 h-3.5 text-[#16A34A]" />
        </div>
        <span className="text-xs sm:text-sm font-semibold text-[#1D1D1D]">{label}</span>
      </div>
    </div>
  );
}

export default function HeroOrbitVisual() {
  return (
    <div className="relative flex items-center justify-center w-full min-h-[380px] sm:min-h-[440px] lg:min-h-[min(65vh,684px)] lg:w-full">
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0" aria-hidden>
        <div className="absolute w-full max-w-[720px] aspect-square rounded-full bg-[#22C55E]/[0.05] blur-[90px]" />
        <div className="absolute w-[88%] max-w-[620px] aspect-square rounded-full border border-[#22C55E]/[0.12]" />
        <div className="absolute w-[68%] max-w-[460px] aspect-square rounded-full border border-[#22C55E]/[0.08]" />
      </div>

      <div className="relative w-full max-w-[980px] mx-auto aspect-[4/3] sm:aspect-[5/4] lg:aspect-auto lg:min-h-[min(61vh,648px)] flex items-center justify-center">
        <svg
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[58%] h-[58%] sm:w-[52%] sm:h-[52%] pointer-events-none text-[#22C55E]/18 z-10"
          viewBox="0 0 400 400"
          aria-hidden
        >
          <circle cx="200" cy="200" r="178" fill="none" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 10" />
        </svg>

        {BADGES.map((badge) => (
          <RoleBadge key={badge.label} {...badge} />
        ))}

        <div className="relative z-20 w-full max-w-[980px] px-0 animate-hero-ecosystem-enter origin-center scale-105 sm:scale-110 lg:scale-[1.08] xl:scale-[1.15]">
          <div className="animate-hero-ecosystem-float">
            <img
              src="/whitelabel2.png"
              alt="Oftware — dashboard médico, calendário, app do paciente e área de treino integrados"
              width={1200}
              height={900}
              className="lg:hidden w-full h-auto max-h-[min(58vh,640px)] object-contain select-none drop-shadow-[0_28px_70px_rgba(0,0,0,0.25)]"
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
            <img
              src="/whitelabel.png"
              alt="Oftware — dashboard médico, calendário, app do paciente e área de treino integrados"
              width={1200}
              height={900}
              className="hidden lg:block w-full h-auto max-h-[min(61vh,648px)] object-contain select-none drop-shadow-[0_28px_70px_rgba(0,0,0,0.25)]"
              fetchPriority="high"
              loading="eager"
              decoding="async"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

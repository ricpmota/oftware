'use client';

import type { CSSProperties } from 'react';
import {
  Calendar,
  Target,
  ChevronRight,
  Stethoscope,
  Leaf,
  Dumbbell,
  Home,
  Activity,
  MessageCircle,
  MoreHorizontal,
} from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioHeroPhoneMockup({ accentColor, pageBg }: Props) {
  return (
    <div className="homeprov-hero-phone relative mx-auto w-[min(340px,88vw)] lg:mx-0 lg:ml-auto lg:w-[360px]">
      {/* Soft glow behind phone */}
      <div
        className="pointer-events-none absolute left-1/2 top-1/3 h-[70%] w-[85%] -translate-x-1/2 rounded-full opacity-[0.22] blur-3xl"
        style={{ background: accentColor }}
        aria-hidden
      />

      <div
        className="relative overflow-hidden rounded-[42px] border-[6px] shadow-[0_28px_60px_-18px_rgba(0,0,0,0.55)]"
        style={{
          borderColor: '#061527',
          backgroundColor: '#061527',
          boxShadow: `0 28px 60px -18px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)`,
        }}
      >
        {/* Status bar notch area */}
        <div className="flex items-center justify-center bg-[#061527] pt-2.5 pb-1">
          <span className="h-[5px] w-20 rounded-full bg-white/15" aria-hidden />
        </div>

        <div
          className="flex min-h-[520px] flex-col px-3.5 pb-2 pt-3 sm:min-h-[560px]"
          style={{ background: `linear-gradient(180deg, ${pageBg} 0%, #071a38 100%)` }}
        >
          <div className="mb-3.5">
            <p className="text-[12px] text-white/55">Olá, Antônio</p>
            <p className="text-[17px] font-bold tracking-tight text-white">Seu acompanhamento</p>
          </div>

          {/* Card 1 — Próxima etapa */}
          <div
            className="homeprov-soft-in mb-2.5 flex items-center gap-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm"
            style={{ animationDelay: '120ms' }}
          >
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{ backgroundColor: `${accentColor}22`, color: accentColor }}
            >
              <Calendar className="h-5 w-5" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                Próxima etapa
              </p>
              <p className="text-[14px] font-bold text-gray-900">Reavaliação</p>
              <p className="text-[11px] text-gray-500">Agendada</p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" aria-hidden />
          </div>

          {/* Card 2 — Meta */}
          <div
            className="homeprov-soft-in mb-2.5 rounded-2xl bg-white px-3.5 py-3 shadow-sm"
            style={{ animationDelay: '220ms' }}
          >
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${pageBg}14`, color: pageBg }}
              >
                <Target className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Meta</p>
                <p className="text-[14px] font-bold text-gray-900">Em acompanhamento</p>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-100">
              <div
                className="homeprov-bar-fill h-full rounded-full"
                style={
                  {
                    backgroundColor: accentColor,
                    ['--bar-w' as string]: '58%',
                  } as CSSProperties
                }
                aria-hidden
              />
            </div>
          </div>

          {/* Card 3 — Equipe */}
          <div
            className="homeprov-soft-in mb-3 rounded-2xl bg-white px-3.5 py-3 shadow-sm"
            style={{ animationDelay: '320ms' }}
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Equipe</p>
            <p className="mt-0.5 text-[12px] text-gray-500">Profissionais envolvidos</p>
            <div className="mt-3 flex gap-2">
              {[
                { icon: Stethoscope, label: 'Médico', bg: `${accentColor}22`, color: accentColor },
                { icon: Leaf, label: 'Nutrição', bg: '#2F8FA322', color: '#2F8FA3' },
                { icon: Dumbbell, label: 'Treino', bg: `${pageBg}18`, color: pageBg },
              ].map(({ icon: Icon, label, bg, color }) => (
                <div
                  key={label}
                  className="flex flex-1 flex-col items-center gap-1 rounded-xl bg-gray-50 py-2"
                >
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: bg, color }}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden />
                  </span>
                  <span className="text-[9px] font-semibold text-gray-700">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto" />

          {/* Bottom nav — demo only */}
          <nav
            className="mt-2 grid grid-cols-4 gap-1 rounded-2xl border border-white/10 bg-white/[0.06] px-1 py-2"
            aria-hidden
          >
            {[
              { icon: Home, label: 'Início', active: true },
              { icon: Activity, label: 'Acomp.', active: false },
              { icon: MessageCircle, label: 'Msgs', active: false },
              { icon: MoreHorizontal, label: 'Mais', active: false },
            ].map(({ icon: Icon, label, active }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-0.5 py-1"
                style={{ color: active ? accentColor : 'rgba(255,255,255,0.35)' }}
              >
                <Icon className="h-4 w-4" />
                <span className="text-[9px] font-medium">{label}</span>
              </div>
            ))}
          </nav>
        </div>
      </div>

      <p className="mt-3 text-center text-[10px] text-white/40 lg:text-left">
        Demonstração da plataforma
      </p>
    </div>
  );
}

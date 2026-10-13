'use client';

import { ArrowRight } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
  pageText: string;
  onPrimaryCta: () => void;
  onSecondaryCta: () => void;
};

export default function HomeProvisorioHero({
  accentColor,
  pageBg,
  pageText,
  onPrimaryCta,
  onSecondaryCta,
}: Props) {
  return (
    <section
      id="inicio"
      className="homeprov-bleed relative overflow-hidden"
      style={{ backgroundColor: pageBg, color: pageText }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          background: `radial-gradient(ellipse 55% 50% at 15% 40%, ${accentColor}55, transparent 70%)`,
        }}
        aria-hidden
      />

      <div className="homeprov-inner relative grid items-center gap-10 py-14 md:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:py-24">
        <div className="homeprov-fade-up max-w-xl">
          <p
            className="mb-5 text-[12px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: accentColor }}
          >
            Método Emagrecer
          </p>
          <h1 className="homeprov-display text-[2.5rem] font-medium leading-[1.05] text-white sm:text-[3.25rem] lg:text-[3.75rem]">
            Seu tratamento não termina na consulta.
          </h1>
          <p className="mt-6 text-[16px] leading-[1.65] text-white/72 sm:text-[17px]">
            Entre uma visita e outra, a vida continua. O Método existe para que médico, paciente e
            equipe caminhem juntos — com clareza, presença e continuidade.
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={onPrimaryCta}
              className="inline-flex h-[54px] items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold text-[#0A1F44] transition-opacity hover:opacity-95"
              style={{ backgroundColor: accentColor }}
            >
              Conheça o Método
              <ArrowRight className="h-4 w-4" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onSecondaryCta}
              className="inline-flex h-[54px] items-center justify-center rounded-full border border-white/25 px-7 text-[15px] font-medium text-white transition-colors hover:bg-white/8"
            >
              Encontrar um médico
            </button>
          </div>
        </div>

        <div className="homeprov-fade-up relative" style={{ animationDelay: '120ms' }}>
          <div className="relative mx-auto max-w-md overflow-hidden rounded-[1.5rem] lg:ml-auto lg:max-w-none">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/criativo-metodo.png"
              alt=""
              className="aspect-[4/5] w-full object-cover object-center sm:aspect-[5/6]"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  'linear-gradient(to top, rgba(10,31,68,0.55) 0%, transparent 45%)',
              }}
              aria-hidden
            />
            <p className="absolute bottom-5 left-5 right-5 text-[14px] leading-snug text-white/90 sm:text-[15px]">
              Acompanhamento que acompanha a vida — não só o horário do consultório.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

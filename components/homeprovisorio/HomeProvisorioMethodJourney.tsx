'use client';

import { useEffect, useState } from 'react';

const STEPS = [
  { n: '01', label: 'Avaliação' },
  { n: '02', label: 'Planejamento' },
  { n: '03', label: 'Acompanhamento' },
  { n: '04', label: 'Ajustes' },
  { n: '05', label: 'Continuidade' },
] as const;

const ROTATION_MS = 3200;

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioMethodJourney({ accentColor, pageBg }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % STEPS.length);
    }, ROTATION_MS);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section id="metodo" className="drprov-rise py-1">
      <div className="text-center">
        <h2 className="text-[22px] font-bold tracking-tight text-gray-900 sm:text-[24px]">
          Não é apenas uma consulta.
        </h2>
        <p className="mt-1 text-[15px] font-semibold sm:text-base" style={{ color: pageBg }}>
          É acompanhamento.
        </p>
      </div>

      {/* Compact horizontal stepper */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white px-3 py-5 shadow-sm sm:px-5 sm:py-6">
        <div className="relative mx-auto flex max-w-lg items-center justify-between px-1">
          <div
            className="absolute left-[8%] right-[8%] top-[14px] h-[2px] rounded-full bg-gray-100"
            aria-hidden
          />
          <div
            className="absolute left-[8%] top-[14px] h-[2px] rounded-full transition-[width] duration-500 ease-out"
            style={{
              width: `${(active / (STEPS.length - 1)) * 84}%`,
              backgroundColor: accentColor,
            }}
            aria-hidden
          />
          {STEPS.map((step, i) => {
            const isActive = i === active;
            const isPast = i < active;
            return (
              <button
                key={step.n}
                type="button"
                onClick={() => setActive(i)}
                className="relative z-[1] flex flex-col items-center"
                aria-current={isActive ? 'step' : undefined}
                aria-label={`${step.n} ${step.label}`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold transition-colors sm:h-8 sm:w-8 sm:text-[11px] ${
                    isActive || isPast ? 'text-[#0A1F44]' : 'bg-white text-gray-400'
                  }`}
                  style={{
                    backgroundColor: isActive || isPast ? accentColor : '#fff',
                    boxShadow:
                      isActive
                        ? `0 0 0 4px ${accentColor}33`
                        : '0 0 0 2px #E5E7EB',
                  }}
                >
                  {step.n.replace('0', '')}
                </span>
              </button>
            );
          })}
        </div>

        <div
          key={active}
          className="homeprov-tab-panel mt-5 text-center"
          aria-live="polite"
        >
          <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            {STEPS[active]!.n}
          </p>
          <p className="mt-1 text-[16px] font-bold text-gray-900 sm:text-[18px]">
            {STEPS[active]!.label}
          </p>
        </div>
      </div>
    </section>
  );
}

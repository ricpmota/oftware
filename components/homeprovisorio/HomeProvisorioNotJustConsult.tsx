'use client';

const STEPS = ['Avaliação', 'Plano', 'Acompanhamento', 'Ajustes', 'Continuidade'] as const;

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioNotJustConsult({ accentColor, pageBg }: Props) {
  return (
    <section id="metodo" className="drprov-rise px-0.5 py-1">
      <div className="text-center">
        <h2 className="text-[1.35rem] font-bold tracking-tight text-gray-900 sm:text-[1.75rem]">
          Não é apenas uma consulta.
        </h2>
        <p className="mt-1 text-[15px] font-semibold sm:text-lg" style={{ color: pageBg }}>
          É acompanhamento.
        </p>
      </div>

      {/* Mobile timeline */}
      <ol className="relative mx-auto mt-6 max-w-sm space-y-0 sm:hidden">
        <div
          className="absolute bottom-2 left-[11px] top-2 w-px"
          style={{ background: `linear-gradient(${accentColor}, ${pageBg}33)` }}
          aria-hidden
        />
        {STEPS.map((step, i) => (
          <li key={step} className="relative flex items-center gap-3 py-2.5 pl-1">
            <span
              className="relative z-[1] flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0A1F44]"
              style={{ backgroundColor: accentColor }}
            >
              {i + 1}
            </span>
            <span className="text-[14px] font-medium text-gray-800">{step}</span>
          </li>
        ))}
      </ol>

      {/* Desktop flow */}
      <div className="mt-8 hidden items-center justify-center gap-1 sm:flex md:gap-2">
        {STEPS.map((step, i) => (
          <div key={step} className="flex items-center gap-1 md:gap-2">
            <div className="rounded-full border border-gray-200 bg-white px-3 py-2 text-center shadow-sm md:px-4">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                {String(i + 1).padStart(2, '0')}
              </p>
              <p className="text-[13px] font-semibold text-gray-900 md:text-sm">{step}</p>
            </div>
            {i < STEPS.length - 1 ? (
              <span className="text-gray-300" aria-hidden>
                →
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

'use client';

type Props = {
  accentColor: string;
  pageBg: string;
};

const STEPS = [
  { n: '01', title: 'Avaliação médica' },
  { n: '02', title: 'Planejamento individual' },
  { n: '03', title: 'Acompanhamento integrado' },
  { n: '04', title: 'Monitoramento contínuo' },
  { n: '05', title: 'Reavaliação' },
] as const;

export default function HomeProvisorioHowItWorks({ accentColor, pageBg }: Props) {
  return (
    <section id="como-funciona" className="drprov-rise">
      <h2 className="text-center text-[1.25rem] font-bold tracking-tight text-gray-900 sm:text-[1.6rem]">
        Como o Método funciona
      </h2>
      <p className="mx-auto mt-2 max-w-md text-center text-[13px] text-gray-500 sm:text-[14px]">
        Um fluxo claro do primeiro contato à continuidade.
      </p>

      <ol className="mx-auto mt-6 max-w-2xl divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 bg-white">
        {STEPS.map(({ n, title }, i) => (
          <li
            key={n}
            className="drprov-rise flex items-center gap-3.5 px-4 py-3.5 sm:gap-4 sm:px-5 sm:py-4"
            style={{ animationDelay: `${120 + i * 50}ms` }}
          >
            <span
              className="w-9 shrink-0 text-[13px] font-bold tabular-nums sm:w-10 sm:text-sm"
              style={{ color: accentColor }}
            >
              {n}
            </span>
            <span className="text-[14px] font-semibold text-gray-900 sm:text-[15px]">{title}</span>
            <span
              className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: i === 2 ? accentColor : `${pageBg}33` }}
              aria-hidden
            />
          </li>
        ))}
      </ol>
    </section>
  );
}

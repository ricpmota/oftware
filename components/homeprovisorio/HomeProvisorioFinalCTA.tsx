'use client';

import { ArrowRight } from 'lucide-react';

type Props = {
  accentColor: string;
  pageBg: string;
  onPrimaryCta: () => void;
  onSecondaryCta: () => void;
};

export default function HomeProvisorioFinalCTA({
  accentColor,
  pageBg,
  onPrimaryCta,
  onSecondaryCta,
}: Props) {
  return (
    <section
      id="contato"
      className="homeprov-bleed py-20 md:py-28"
      style={{ backgroundColor: pageBg }}
    >
      <div className="homeprov-inner max-w-3xl text-center md:text-left">
        <h2 className="homeprov-display text-[2.15rem] font-medium leading-[1.1] text-white sm:text-[2.75rem]">
          Seu acompanhamento pode ser diferente.
        </h2>
        <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-white/65">
          Escolha um médico verificado e comece uma jornada com método, equipe e continuidade.
        </p>
        <div className="mt-9 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={onPrimaryCta}
            className="inline-flex h-[54px] items-center justify-center gap-2 rounded-full px-8 text-[15px] font-semibold text-[#0A1F44]"
            style={{ backgroundColor: accentColor }}
          >
            Encontrar um médico
            <ArrowRight className="h-4 w-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={onSecondaryCta}
            className="hidden h-[54px] items-center justify-center rounded-full border border-white/25 px-7 text-[14px] font-medium text-white/80 transition-colors hover:bg-white/8 sm:inline-flex"
          >
            Conhecer o Método
          </button>
        </div>
      </div>
    </section>
  );
}

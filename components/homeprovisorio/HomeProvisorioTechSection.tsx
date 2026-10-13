'use client';

import type { ReactNode } from 'react';

type Props = {
  accentColor: string;
  children: ReactNode;
};

export default function HomeProvisorioTechSection({ accentColor, children }: Props) {
  return (
    <section id="demonstracao" className="homeprov-bleed bg-white py-16 md:py-24">
      <div className="homeprov-inner">
        <div className="mb-8 max-w-2xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            Plataforma
          </p>
          <h2 className="homeprov-display mt-3 text-[2rem] font-medium leading-[1.12] text-[var(--homeprov-ink)] sm:text-[2.4rem]">
            Tecnologia que acompanha você
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--homeprov-muted)]">
            Organização da jornada — meta, exames e etapas — em um ambiente único. Demonstração de
            recursos, sem resultados clínicos.
          </p>
        </div>
        <div className="homeprov-tech-embed overflow-hidden border-y border-[var(--homeprov-navy)]/10 md:rounded-2xl md:border">
          {children}
        </div>
      </div>
    </section>
  );
}

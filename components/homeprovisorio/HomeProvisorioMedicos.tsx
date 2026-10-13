'use client';

import { useEffect, useRef, useState } from 'react';
import { CheckCircle, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

export type MedicoHomeItem = {
  id: string;
  nome: string;
  genero: 'M' | 'F';
  fotoPerfilUrl: string;
  slug: string;
};

type Props = {
  accentColor: string;
  pageBg?: string;
};

export default function HomeProvisorioMedicos({ accentColor }: Props) {
  const [medicosHome, setMedicosHome] = useState<MedicoHomeItem[]>([]);
  const [loadingMedicosHome, setLoadingMedicosHome] = useState(true);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    setLoadingMedicosHome(true);
    fetch('/api/medicos-home')
      .then((res) => (res.ok ? res.json() : { medicos: [] }))
      .then((data: { medicos: MedicoHomeItem[] }) => setMedicosHome(data.medicos || []))
      .catch(() => setMedicosHome([]))
      .finally(() => setLoadingMedicosHome(false));
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const update = () => {
      const maxLeft = el.scrollWidth - el.clientWidth;
      setCanScrollLeft(el.scrollLeft > 8);
      setCanScrollRight(maxLeft - el.scrollLeft > 8);
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [medicosHome]);

  const scroll = (direction: 'left' | 'right') => {
    const el = trackRef.current;
    if (!el) return;
    const amount = Math.max(200, Math.round(el.clientWidth * 0.65));
    el.scrollBy({ left: direction === 'left' ? -amount : amount, behavior: 'smooth' });
  };

  return (
    <section id="medicos" className="homeprov-bleed bg-[var(--homeprov-paper)] py-16 md:py-24">
      <div className="homeprov-inner">
        <div className="max-w-2xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            Comece por aqui
          </p>
          <h2 className="homeprov-display mt-3 text-[2rem] font-medium leading-[1.12] text-[var(--homeprov-ink)] sm:text-[2.4rem]">
            Encontre um médico
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-[var(--homeprov-muted)]">
            Perfis verificados para iniciar seu acompanhamento com método e continuidade.
          </p>
        </div>
      </div>

      {loadingMedicosHome ? (
        <div className="homeprov-inner flex items-center py-12">
          <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} />
          <span className="ml-3 text-sm text-[var(--homeprov-muted)]">Carregando médicos...</span>
        </div>
      ) : medicosHome.length === 0 ? (
        <p className="homeprov-inner py-8 text-sm text-[var(--homeprov-muted)]">
          Nenhum médico disponível no momento.
        </p>
      ) : (
        <div className="relative mt-10">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="absolute left-3 top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--homeprov-navy)]/15 bg-white text-[var(--homeprov-ink)] shadow-sm disabled:opacity-30 md:flex"
            aria-label="Ver médicos anteriores"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="absolute right-3 top-[38%] z-10 hidden h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--homeprov-navy)]/15 bg-white text-[var(--homeprov-ink)] shadow-sm disabled:opacity-30 md:flex"
            aria-label="Ver próximos médicos"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <div
            ref={trackRef}
            className="overflow-x-auto scrollbar-hide"
            style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}
          >
            <div className="flex w-max snap-x snap-mandatory gap-8 pl-[max(1.25rem,calc((100vw-1120px)/2+1.25rem))] pr-16 md:gap-10 md:pr-20">
              {medicosHome.map((medico) => (
                <a
                  key={medico.id}
                  href={`/dr/${medico.slug}`}
                  className="group w-[130px] shrink-0 snap-start text-center sm:w-[160px]"
                >
                  <div className="relative mx-auto h-[120px] w-[120px] sm:h-[148px] sm:w-[148px]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={medico.fotoPerfilUrl}
                      alt={`${medico.genero === 'F' ? 'Dra.' : 'Dr.'} ${medico.nome}`}
                      className="h-full w-full rounded-full object-cover transition-transform group-hover:scale-[1.02]"
                      style={{
                        boxShadow: `0 8px 28px rgba(10,31,68,0.12), 0 0 0 3px #fff, 0 0 0 5px ${accentColor}55`,
                      }}
                    />
                  </div>
                  <p className="mt-3 text-[14px] font-semibold leading-tight text-[var(--homeprov-ink)]">
                    {medico.genero === 'F' ? 'Dra.' : 'Dr.'} {medico.nome}
                  </p>
                  <p
                    className="mt-1 inline-flex items-center gap-1 text-[11px]"
                    style={{ color: accentColor }}
                  >
                    <CheckCircle size={12} />
                    Verificado
                  </p>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

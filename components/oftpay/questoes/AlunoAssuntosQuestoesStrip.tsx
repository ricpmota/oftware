'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { OftpayQuestaoMatchable } from '@/types/oftpayQuestaoCatalog';
import { computeSubjectGroupsFromPublicadas } from '@/types/oftpaySimulados';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

interface AlunoAssuntosQuestoesStripProps {
  publicadas: OftpayQuestaoMatchable[];
  loading?: boolean;
}

const CARD_CLASS = 'w-[104px] min-h-[132px] h-[132px]';

export default function AlunoAssuntosQuestoesStrip({
  publicadas,
  loading = false,
}: AlunoAssuntosQuestoesStripProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const subjects = useMemo(
    () =>
      computeSubjectGroupsFromPublicadas(publicadas)
        .filter((g) => g.totalPublicadas > 0)
        .sort((a, b) => b.totalPublicadas - a.totalPublicadas),
    [publicadas]
  );

  const totalQuestoes = useMemo(
    () => subjects.reduce((sum, s) => sum + s.totalPublicadas, 0),
    [subjects]
  );

  const updateScrollHints = () => {
    const el = scrollRef.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 4);
  };

  useEffect(() => {
    updateScrollHints();
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateScrollHints());
    ro.observe(el);
    return () => ro.disconnect();
  }, [subjects.length, loading]);

  const scrollBy = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const step = Math.max(220, Math.floor(el.clientWidth * 0.75));
    el.scrollBy({ left: direction === 'left' ? -step : step, behavior: 'smooth' });
    window.setTimeout(updateScrollHints, 280);
  };

  if (loading) {
    return (
      <div className="mt-6 pt-5 border-t border-white/15">
        <div className="flex items-center gap-2 text-sm text-blue-100/90 mb-3">
          <Loader2 className="w-4 h-4 animate-spin" />
          Carregando banco de questões…
        </div>
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className={`${CARD_CLASS} shrink-0 rounded-xl bg-white/10 animate-pulse`}
            />
          ))}
        </div>
      </div>
    );
  }

  if (subjects.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 pt-5 border-t border-white/15">
      <p className="text-xs sm:text-sm text-blue-100/90 mb-3">
        <span className="font-semibold text-white tabular-nums">{totalQuestoes}</span>{' '}
        {totalQuestoes === 1 ? 'questão publicada' : 'questões publicadas'} em{' '}
        <span className="font-semibold text-white tabular-nums">{subjects.length}</span>{' '}
        {subjects.length === 1 ? 'assunto' : 'assuntos'}
      </p>

      <div className="relative">
        {canScrollLeft && (
          <button
            type="button"
            onClick={() => scrollBy('left')}
            className="absolute left-0 top-1/2 z-10 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-indigo-700 shadow-md hover:bg-white"
            aria-label="Ver assuntos anteriores"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
        )}
        {canScrollRight && (
          <button
            type="button"
            onClick={() => scrollBy('right')}
            className="absolute right-0 top-1/2 z-10 -translate-y-1/2 hidden sm:flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-indigo-700 shadow-md hover:bg-white"
            aria-label="Ver próximos assuntos"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollHints}
          className="flex gap-2.5 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-1 -mx-1 px-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
        >
          {subjects.map((subject) => (
            <div
              key={subject.key}
              className={`snap-start shrink-0 ${CARD_CLASS} rounded-xl border border-white/25 bg-white/12 backdrop-blur-sm p-3 flex flex-col shadow-sm`}
              title={`${subject.label} — ${subject.totalPublicadas} questões`}
            >
              <p className="flex-1 min-h-0 text-[11px] font-medium text-white leading-[1.35] line-clamp-3 overflow-hidden">
                {subject.label}
              </p>
              <div className="shrink-0 pt-2 mt-auto border-t border-white/10">
                <p className="text-xl font-bold text-white tabular-nums leading-none">
                  {subject.totalPublicadas}
                </p>
                <p className="text-[10px] text-blue-100/75 mt-0.5">
                  {subject.totalPublicadas === 1 ? 'questão' : 'questões'}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-2 text-[10px] text-blue-100/60 sm:hidden">
          Deslize para o lado para ver todos os assuntos
        </p>
      </div>
    </div>
  );
}

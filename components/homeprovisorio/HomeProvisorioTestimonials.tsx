'use client';

import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';

const MEDICO_EMAIL_DEPOIMENTOS = 'ricpmota.med@gmail.com';

type DepoimentoItem = {
  pacienteId: string;
  cidadeEstado: string | null;
  depoimento: string;
};

type Props = {
  accentColor: string;
  pageBg: string;
};

export default function HomeProvisorioTestimonials({ accentColor, pageBg }: Props) {
  const [items, setItems] = useState<DepoimentoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/depoimentos-medico?medicoEmail=${encodeURIComponent(MEDICO_EMAIL_DEPOIMENTOS)}`)
      .then((res) => (res.ok ? res.json() : { depoimentos: [] }))
      .then((data: { depoimentos: DepoimentoItem[] }) => {
        setItems(data.depoimentos || []);
        setIndex(0);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (items.length <= 1 || paused) return;
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const t = window.setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 9000);
    return () => window.clearInterval(t);
  }, [items.length, paused]);

  const current = items[index];

  return (
    <section className="homeprov-bleed py-16 md:py-24" style={{ backgroundColor: pageBg }}>
      <div className="homeprov-inner">
        <div className="max-w-2xl">
          <p
            className="text-[12px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: accentColor }}
          >
            Vozes
          </p>
          <h2 className="homeprov-display mt-3 text-[2rem] font-medium leading-[1.12] text-white sm:text-[2.4rem]">
            Experiências compartilhadas
          </h2>
          <p className="mt-3 text-[15px] text-white/60">
            Relatos individuais e espontâneos — sem promessa de resultado igual.
          </p>
        </div>

        <div
          className="relative mt-10 max-w-3xl"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
        >
          {loading ? (
            <div className="flex items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin" style={{ color: accentColor }} />
              <span className="ml-3 text-sm text-white/60">Carregando relatos...</span>
            </div>
          ) : items.length === 0 ? (
            <p className="py-8 text-white/55">Nenhuma experiência publicada ainda.</p>
          ) : (
            <>
              <blockquote key={index} className="homeprov-fade-up">
                <p className="homeprov-display text-[1.35rem] font-medium leading-[1.35] text-white sm:text-[1.65rem]">
                  &ldquo;{current?.depoimento}&rdquo;
                </p>
                <footer className="mt-6 text-[13px] text-white/50">
                  Relato compartilhado
                  {current?.cidadeEstado ? ` · ${current.cidadeEstado}` : ''}
                </footer>
              </blockquote>

              {items.length > 1 ? (
                <div className="mt-8 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-white/10"
                    aria-label="Relato anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIndex((i) => (i + 1) % items.length)}
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-white/20 text-white/70 hover:bg-white/10"
                    aria-label="Próximo relato"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <span className="ml-2 text-[12px] tabular-nums text-white/40">
                    {index + 1} / {items.length}
                  </span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </div>
    </section>
  );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { BRAND } from '@/rafaela-albuquerque/siteConfig';
import { getIndicadores } from '@/rafaela-albuquerque/landingCopy';

type Item = ReturnType<typeof getIndicadores>['items'][number];

const EASE_OUT = [0.22, 1, 0.36, 1] as const;
const COUNT_MS = 1250;

function IndicadorCell({
  item,
  active,
  reduceMotion,
}: {
  item: Item;
  active: boolean;
  reduceMotion: boolean | null;
}) {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!active) {
      setN(0);
      return;
    }
    if (reduceMotion) {
      setN(item.target);
      return;
    }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - (1 - t) ** 2.35;
      setN(Math.min(item.target, Math.floor(eased * item.target + 1e-6)));
      if (t < 1) raf = requestAnimationFrame(tick);
      else setN(item.target);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, item.target, reduceMotion]);

  return (
    <div
      className="rounded-2xl border bg-white px-4 py-5 text-center shadow-sm transition-all duration-200 ease-out hover:-translate-y-1 hover:shadow-md sm:px-5 sm:py-6"
      style={{ borderColor: BRAND.border }}
    >
      <p
        className="text-2xl font-semibold tabular-nums tracking-tight sm:text-3xl md:text-4xl"
        style={{ color: BRAND.primary }}
      >
        {n}
        {item.suffix}
      </p>
      <p className="mt-2 text-xs leading-snug sm:text-sm" style={{ color: BRAND.textMuted }}>
        {item.label}
      </p>
    </div>
  );
}

type Props = {
  data: ReturnType<typeof getIndicadores>;
  reduceMotion: boolean | null;
};

export default function RafaelaIndicadoresSection({ data, reduceMotion }: Props) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  const [runCount, setRunCount] = useState(false);

  useEffect(() => {
    if (inView) setRunCount(true);
  }, [inView]);

  return (
    <motion.section
      ref={ref}
      id="indicadores"
      className="scroll-mt-24 border-b py-12 md:py-16"
      style={{ backgroundColor: BRAND.bgAlt, borderColor: BRAND.border }}
      initial={reduceMotion ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
      animate={{ opacity: reduceMotion || inView ? 1 : 0, y: reduceMotion || inView ? 0 : 20 }}
      transition={{ duration: reduceMotion ? 0 : 0.45, ease: EASE_OUT }}
    >
      <div className="mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8">
        <p
          className="mb-2 text-center text-[11px] font-medium uppercase tracking-[0.2em]"
          style={{ color: BRAND.textSoft }}
        >
          {data.eyebrow}
        </p>
        <h2 className="mb-8 text-center text-2xl font-bold sm:text-3xl" style={{ color: BRAND.textStrong }}>
          {data.title}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4 lg:gap-6">
          {data.items.map((item) => (
            <IndicadorCell key={item.label} item={item} active={runCount} reduceMotion={reduceMotion} />
          ))}
        </div>
      </div>
    </motion.section>
  );
}

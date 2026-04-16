'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, useInView } from 'framer-motion';

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

type Props = {
  end: number;
  suffix?: string;
  prefix?: string;
  duration?: number;
  decimals?: number;
};

export default function AnimatedCounter({
  end,
  suffix = '',
  prefix = '',
  duration = 1500,
  decimals = 0,
}: Props) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });

  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutCubic(progress);
      const current = startVal + (end - startVal) * eased;
      const rounded =
        decimals > 0
          ? Math.round(current * Math.pow(10, decimals)) / Math.pow(10, decimals)
          : Math.round(current);
      setValue(rounded);
      if (progress < 1) requestAnimationFrame(tick);
    };

    const id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, [end, duration, decimals, inView]);

  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={inView ? { opacity: 1, scale: 1 } : {}}
      transition={{ duration: 0.4 }}
      className="tabular-nums"
    >
      {prefix}
      {decimals > 0 ? value.toFixed(decimals) : value.toLocaleString('pt-BR')}
      {suffix}
    </motion.span>
  );
}

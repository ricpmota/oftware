'use client';

import React, { useState, useEffect, useRef } from 'react';
import { TrendingDown, Activity, Users, FileText } from 'lucide-react';

export type IndicadoresData = {
  kgReducaoTotal: number;
  mgAplicacoesTotal: number;
  pacientesEmAcompanhamento: number;
  registrosEvolucao: number;
};

const PLACEHOLDERS: IndicadoresData = {
  kgReducaoTotal: 0,
  mgAplicacoesTotal: 0,
  pacientesEmAcompanhamento: 0,
  registrosEvolucao: 0,
};

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function useCountUp(
  end: number,
  durationMs: number,
  startAnimation: boolean,
  decimals = 0
): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!startAnimation) return;

    const start = performance.now();
    const startVal = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / durationMs, 1);
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
  }, [end, durationMs, startAnimation, decimals]);

  return value;
}

type MetricCardProps = {
  icon: React.ElementType;
  label: string;
  value: number;
  suffix?: string;
  decimals?: number;
  startAnimation: boolean;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  decimals = 0,
  startAnimation,
}: MetricCardProps) {
  const displayValue = useCountUp(value, 1800, startAnimation, decimals);
  return (
    <div className="group flex flex-col p-6 rounded-2xl bg-[#0A1F44]/80 backdrop-blur-sm border border-white/10 hover:border-[#2F8FA3]/40 transition-all duration-300">
      <Icon className="w-8 h-8 text-[#4CCB7A]/90 mb-4" aria-hidden />
      <span
        className="text-3xl md:text-4xl font-bold text-[#E8EDED] tabular-nums tracking-tight"
        aria-live="polite"
      >
        {decimals > 0 ? displayValue.toFixed(decimals) : displayValue.toLocaleString('pt-BR')}
        {suffix && <span className="ml-1 text-base md:text-lg align-baseline">{suffix}</span>}
      </span>
      <span className="text-[#E8EDED]/60 text-sm mt-2 font-medium">{label}</span>
    </div>
  );
}

export default function IndicadoresPlataforma() {
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    fetch('/api/indicadores-plataforma')
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true);
      },
      { threshold: 0.2, rootMargin: '0px 0px -80px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const metrics = data ?? PLACEHOLDERS;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-white/5"
      aria-labelledby="indicadores-titulo"
    >
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="indicadores-titulo" className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">
          Resultados Conquistados
        </h2>
        <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
          Dados reais consolidados da plataforma. Baseados em pacientes em acompanhamento.
        </p>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-[#0A1F44]/60 border border-white/10 animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <MetricCard
              icon={TrendingDown}
              label="Redução total (kg)"
              value={metrics.kgReducaoTotal}
              suffix=" kg"
              decimals={1}
              startAnimation={inView}
            />
            <MetricCard
              icon={Activity}
              label="Volume Aplicado (mg)"
              value={metrics.mgAplicacoesTotal}
              suffix=" mg"
              decimals={1}
              startAnimation={inView}
            />
            <MetricCard
              icon={Users}
              label="Pacientes ativos"
              value={metrics.pacientesEmAcompanhamento}
              startAnimation={inView}
            />
            <MetricCard
              icon={FileText}
              label="Ajustes clínicos"
              value={metrics.registrosEvolucao}
              startAnimation={inView}
            />
          </div>
        )}

        {error && (
          <p className="text-[#E8EDED]/50 text-center mt-4 text-sm">
            Indicadores temporariamente indisponíveis.
          </p>
        )}
      </div>
    </section>
  );
}

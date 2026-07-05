'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CheckCircle,
  Users,
  FileText,
  Scale,
  Syringe,
  Flame,
  UserCheck,
  ClipboardList,
  Activity,
  Layers,
  Route,
} from 'lucide-react';

export type IndicadoresData = {
  kgReducaoTotal: number;
  mgAplicadaTotal: number;
  caloriasPerdidasTotal: number;
  totalPacientes: number;
  pacientesConcluidos: number;
  pacientesEmAcompanhamento: number;
  registrosEvolucao: number;
  profissionaisConectados?: number;
  registrosClinicos?: number;
  checkInsRealizados?: number;
  aplicacoesRegistradas?: number;
  jornadasAtivas?: number;
  protocolosAtivos?: number;
};

const PLACEHOLDERS: IndicadoresData = {
  kgReducaoTotal: 0,
  mgAplicadaTotal: 0,
  caloriasPerdidasTotal: 0,
  totalPacientes: 0,
  pacientesConcluidos: 0,
  pacientesEmAcompanhamento: 0,
  registrosEvolucao: 0,
  profissionaisConectados: 0,
  registrosClinicos: 0,
  checkInsRealizados: 0,
  aplicacoesRegistradas: 0,
  jornadasAtivas: 0,
  protocolosAtivos: 0,
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
  formatter?: (value: number) => string;
};

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  decimals = 0,
  startAnimation,
  formatter,
}: MetricCardProps) {
  const displayValue = useCountUp(value, 1800, startAnimation, decimals);
  const formattedValue = formatter
    ? formatter(displayValue)
    : decimals > 0
      ? displayValue.toFixed(decimals)
      : displayValue.toLocaleString('pt-BR');

  return (
    <div className="group flex flex-col p-6 rounded-2xl bg-[#0A1F44]/80 backdrop-blur-sm border border-white/10 hover:border-[#22C55E]/40 transition-all duration-300">
      <Icon className="w-8 h-8 text-[#4CCB7A]/90 mb-4" aria-hidden />
      <span
        className="text-3xl md:text-4xl font-bold text-[#E8EDED] tabular-nums tracking-tight"
        aria-live="polite"
      >
        {formattedValue}
        {suffix && <span className="ml-1 text-base md:text-lg align-baseline">{suffix}</span>}
      </span>
      <span className="text-[#E8EDED]/60 text-sm mt-2 font-medium">{label}</span>
    </div>
  );
}

type IndicadoresPlataformaProps = {
  hideWeightLossMetrics?: boolean;
  variant?: 'default' | 'institutional';
};

export default function IndicadoresPlataforma({
  hideWeightLossMetrics = false,
  variant = 'default',
}: IndicadoresPlataformaProps) {
  const [data, setData] = useState<IndicadoresData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [inView, setInView] = useState(false);
  const sectionRef = useRef<HTMLElement>(null);

  const isInstitutional = variant === 'institutional';

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

  const skeletonCount = isInstitutional ? 6 : hideWeightLossMetrics ? 4 : 7;

  return (
    <section
      ref={sectionRef}
      className="py-16 md:py-24 bg-white/5"
      aria-labelledby="indicadores-titulo"
    >
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <h2 id="indicadores-titulo" className="text-3xl md:text-4xl font-bold text-[#E8EDED] text-center mb-4">
          {isInstitutional ? 'Indicadores da plataforma' : 'Indicadores de acompanhamento'}
        </h2>
        <p className="text-[#E8EDED]/70 text-center max-w-2xl mx-auto mb-12">
          {isInstitutional
            ? 'Dados consolidados de uso da infraestrutura Oftware em operação.'
            : 'Dados consolidados da plataforma. Baseados em pacientes em acompanhamento estruturado.'}
        </p>

        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {Array.from({ length: skeletonCount }, (_, i) => i + 1).map((i) => (
              <div
                key={i}
                className="h-40 rounded-2xl bg-[#0A1F44]/60 border border-white/10 animate-pulse"
                aria-hidden
              />
            ))}
          </div>
        ) : isInstitutional ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <MetricCard
              icon={UserCheck}
              label="Pacientes acompanhados"
              value={metrics.pacientesEmAcompanhamento}
              startAnimation={inView}
            />
            <MetricCard
              icon={Users}
              label="Profissionais conectados"
              value={metrics.profissionaisConectados ?? 0}
              startAnimation={inView}
            />
            <MetricCard
              icon={FileText}
              label="Registros clínicos"
              value={metrics.registrosClinicos ?? metrics.registrosEvolucao}
              startAnimation={inView}
              formatter={(v) => v.toLocaleString('pt-BR')}
            />
            <MetricCard
              icon={ClipboardList}
              label="Check-ins realizados"
              value={metrics.checkInsRealizados ?? 0}
              startAnimation={inView}
              formatter={(v) => v.toLocaleString('pt-BR')}
            />
            <MetricCard
              icon={Activity}
              label="Aplicações registradas"
              value={metrics.aplicacoesRegistradas ?? 0}
              startAnimation={inView}
              formatter={(v) => v.toLocaleString('pt-BR')}
            />
            <MetricCard
              icon={Route}
              label="Jornadas ativas"
              value={metrics.jornadasAtivas ?? metrics.pacientesEmAcompanhamento}
              startAnimation={inView}
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <MetricCard
              icon={Users}
              label="Pacientes em acompanhamento"
              value={metrics.pacientesEmAcompanhamento}
              startAnimation={inView}
            />
            <MetricCard
              icon={Users}
              label="Total de pacientes na plataforma"
              value={metrics.totalPacientes}
              startAnimation={inView}
            />
            {!hideWeightLossMetrics && (
              <>
                <MetricCard
                  icon={Scale}
                  label="Peso perdido pelos pacientes"
                  value={metrics.kgReducaoTotal}
                  suffix="kg"
                  decimals={1}
                  startAnimation={inView}
                />
                <MetricCard
                  icon={Syringe}
                  label="Mg aplicada (protocolos injetáveis)"
                  value={metrics.mgAplicadaTotal}
                  suffix="mg"
                  startAnimation={inView}
                  formatter={(v) => v.toLocaleString('pt-BR')}
                />
                <MetricCard
                  icon={Flame}
                  label="Calorias equivalentes ao peso perdido"
                  value={metrics.caloriasPerdidasTotal}
                  suffix="kcal"
                  startAnimation={inView}
                  formatter={(v) => v.toLocaleString('pt-BR')}
                />
              </>
            )}
            <MetricCard
              icon={CheckCircle}
              label="Acompanhamentos concluídos"
              value={metrics.pacientesConcluidos}
              startAnimation={inView}
            />
            <MetricCard
              icon={Layers}
              label="Registros de monitoramento"
              value={metrics.registrosEvolucao}
              startAnimation={inView}
              formatter={(v) => v.toLocaleString('pt-BR')}
            />
          </div>
        )}

        <p className="text-[#E8EDED]/45 text-center mt-5 text-xs max-w-xl mx-auto leading-relaxed">
          {isInstitutional
            ? 'Métricas agregadas de uso da plataforma. Não representam promessa de resposta clínica individual.'
            : hideWeightLossMetrics
              ? 'Métricas agregadas de uso da plataforma. Não representam promessa de resposta clínica individual.'
              : 'Métricas agregadas de uso da plataforma. Calorias estimadas com base no peso perdido registrado (~7.700 kcal/kg). Não representam promessa de resposta clínica individual.'}
        </p>

        {error && (
          <p className="text-[#E8EDED]/50 text-center mt-4 text-sm">
            Indicadores temporariamente indisponíveis.
          </p>
        )}
      </div>
    </section>
  );
}

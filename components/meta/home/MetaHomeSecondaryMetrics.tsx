'use client';

import { useState, type CSSProperties, type ReactNode } from 'react';
import { Percent, Ruler, Scale, Syringe, type LucideIcon } from 'lucide-react';
import { MetaHomeMetricEvolucaoModal } from '@/components/meta/MetaHomeMetricEvolucaoModal';
import type { BioImpedanciaRegistro } from '@/types/bioImpedancia';
import type { PacienteCompleto } from '@/types/obesidade';
import { getBioMainMetrics } from '@/utils/bioImpedanciaMetrics';
import type { MetaHomeMetricId } from '@/utils/metaHomeMetricEvolution';
import {
  organizationPatientDashboardPaint,
  type OrganizationPatientDashboardPaint,
  type OrganizationShellChrome,
} from '@/lib/organization/resolveOrganizationShellChrome';
import {
  apresentacaoCircunferencia,
  apresentacaoGordura,
  apresentacaoPerdaPeso,
  formatDiaMesPtBr,
  formatWeekdayPtBr,
  type ProximaAplicacaoHome,
} from '@/utils/metaHomeSecondaryMetrics';

export interface MetaHomeSecondaryMetricsProps {
  paciente: PacienteCompleto | null;
  perdaPesoKg: number | null;
  circunferenciaCm: number | null;
  circunferenciaInicialCm: number | null | undefined;
  registroBio: BioImpedanciaRegistro | null;
  registroBioAnterior: BioImpedanciaRegistro | null;
  proximaAplicacao: ProximaAplicacaoHome | null;
  /** Chrome autenticado. No Método os cards conservam navy e verde atuais. */
  chrome?: OrganizationShellChrome | null;
}

function SecondaryCard({
  icon: Icon,
  iconWrapClass,
  title,
  value,
  unit,
  children,
  onClick,
  paint,
}: {
  icon: LucideIcon;
  iconWrapClass: string;
  title: string;
  value: string;
  unit?: string | null;
  children?: ReactNode;
  onClick?: () => void;
  paint: OrganizationPatientDashboardPaint | null;
}) {
  const interactive = Boolean(onClick);
  const focusRingClass = paint
    ? 'focus-visible:ring-[color:var(--meta-home-focus-ring)]'
    : 'focus-visible:ring-[#4CCB7A]/30';
  const cardStyle = paint ? ({ '--meta-home-focus-ring': paint.focusRing } as CSSProperties) : undefined;
  return (
    <article
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`flex h-full min-h-[132px] flex-col rounded-[18px] border border-gray-200/90 bg-white p-3.5 sm:p-4 ${
        interactive
          ? `cursor-pointer hover:border-gray-300 focus:outline-none focus-visible:ring-2 ${focusRingClass}`
          : ''
      }`}
      style={cardStyle}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <p className="text-[11px] font-medium leading-tight text-gray-500 sm:text-xs">{title}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${iconWrapClass}`}>
          <Icon className="h-4 w-4" strokeWidth={2} />
        </span>
      </div>
      <div className="mt-auto flex items-baseline gap-1">
        <span
          className="text-[26px] font-extrabold leading-none tabular-nums text-[#0A1F44] sm:text-[30px] lg:text-[32px]"
          style={paint ? { color: paint.ink } : undefined}
        >
          {value}
        </span>
        {unit ? <span className="text-sm font-semibold text-gray-400">{unit}</span> : null}
      </div>
      {children}
    </article>
  );
}

export function MetaHomeSecondaryMetrics({
  paciente,
  perdaPesoKg,
  circunferenciaCm,
  circunferenciaInicialCm,
  registroBio,
  registroBioAnterior,
  proximaAplicacao,
  chrome,
}: MetaHomeSecondaryMetricsProps) {
  const [metricModal, setMetricModal] = useState<MetaHomeMetricId | null>(null);
  const paint = organizationPatientDashboardPaint(chrome);
  const perda = apresentacaoPerdaPeso(perdaPesoKg);
  const circ = apresentacaoCircunferencia(circunferenciaCm, circunferenciaInicialCm);
  const gorduraAtual = registroBio ? getBioMainMetrics(registroBio).percentualGordura : null;
  const gorduraAnterior = registroBioAnterior
    ? getBioMainMetrics(registroBioAnterior).percentualGordura
    : null;
  const gordura = apresentacaoGordura(gorduraAtual, gorduraAnterior);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-4 xl:gap-5">
        <SecondaryCard
          paint={paint}
          icon={Scale}
          iconWrapClass="bg-emerald-50 text-emerald-600"
          title={perda.title}
          value={perda.value}
          unit={perda.unit}
          onClick={() => setMetricModal('perdaPeso')}
        >
          <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{perda.hint}</p>
        </SecondaryCard>

        <SecondaryCard
          paint={paint}
          icon={Ruler}
          iconWrapClass="bg-teal-50 text-teal-600"
          title="Circunferência abdominal"
          value={circ.value}
          unit={circ.unit}
          onClick={() => setMetricModal('circunferencia')}
        >
          {circ.deltaLabel ? (
            <p
              className={`mt-1.5 text-[11px] font-medium leading-snug ${
                circ.tone === 'down' ? 'text-emerald-600' : circ.tone === 'up' ? 'text-amber-600' : 'text-gray-400'
              }`}
            >
              {circ.deltaLabel}
              <span className="block font-normal text-gray-400">{circ.hint}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{circ.hint || '\u00a0'}</p>
          )}
        </SecondaryCard>

        <SecondaryCard
          paint={paint}
          icon={Percent}
          iconWrapClass="bg-violet-50 text-violet-600"
          title="% Gordura"
          value={gordura.value}
          unit={gordura.unit}
          onClick={() => setMetricModal('gordura')}
        >
          {gordura.deltaLabel ? (
            <p
              className={`mt-1.5 text-[11px] font-medium leading-snug ${
                gordura.tone === 'down'
                  ? 'text-emerald-600'
                  : gordura.tone === 'up'
                    ? 'text-amber-600'
                    : 'text-gray-400'
              }`}
            >
              {gordura.deltaLabel}
              <span className="block font-normal text-gray-400">{gordura.hint}</span>
            </p>
          ) : (
            <p className="mt-1.5 text-[11px] leading-snug text-gray-400">{gordura.hint || '\u00a0'}</p>
          )}
        </SecondaryCard>

        <SecondaryCard
          paint={paint}
          icon={Syringe}
          iconWrapClass="bg-amber-50 text-amber-600"
          title="Próxima aplicação"
          value={proximaAplicacao ? formatDiaMesPtBr(proximaAplicacao.data) : '—'}
        >
          {proximaAplicacao ? (
            <div className="mt-1.5 space-y-1">
              <p className="text-[11px] leading-snug text-gray-500">
                {formatWeekdayPtBr(proximaAplicacao.data)}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {proximaAplicacao.isHoje ? (
                  <span
                    className="inline-flex rounded-full bg-[#4CCB7A]/15 px-2 py-0.5 text-[10px] font-semibold text-[#16a34a]"
                    style={paint ? { backgroundColor: paint.badgeBackground, color: paint.badgeText } : undefined}
                  >
                    Hoje
                  </span>
                ) : null}
                {proximaAplicacao.semana > 0 ? (
                  <span className="text-[10px] text-gray-400">Semana {proximaAplicacao.semana}</span>
                ) : null}
              </div>
              <p className="text-[10px] text-gray-400">Agenda atual</p>
            </div>
          ) : (
            <p className="mt-1.5 text-[11px] leading-snug text-gray-400">Sem próxima aplicação</p>
          )}
        </SecondaryCard>
      </div>

      <MetaHomeMetricEvolucaoModal
        open={metricModal != null}
        metricId={metricModal}
        paciente={paciente}
        onClose={() => setMetricModal(null)}
      />
    </>
  );
}

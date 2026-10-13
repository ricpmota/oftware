'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PacienteVisivelPersonal } from '@/services/pacientePersonalTrainerService';
import { loadPersonalHistoryAnalytics } from '@/services/personalHistoryAnalyticsService';
import {
  emptyHistoryAnalytics,
  type HistoryAnalyticsResult,
  type HistoryTableFilter,
} from '@/lib/metapersonal/historicoAnalytics';
import {
  HISTORY_DEFAULT_PERIOD_DAYS,
  HISTORY_PERIOD_LABELS,
  HISTORY_PERIOD_OPTIONS,
  type HistoryPeriodDays,
} from '@/lib/metapersonal/historicoThresholds';
import { HistoricoKpis, HistoricoKpisSkeleton } from './HistoricoKpis';
import { HistoricoAttentionPanel } from './HistoricoAttentionPanel';
import { HistoricoAdherenceChart } from './HistoricoAdherenceChart';
import { HistoricoPortfolioDistribution } from './HistoricoPortfolioDistribution';
import { HistoricoPatientsTable } from './HistoricoPatientsTable';
import { HistoricoPatientPanel } from './HistoricoPatientPanel';

type Props = {
  personalName: string;
  pacientesVisiveis: PacienteVisivelPersonal[];
  loadingPacientes: boolean;
  patientPhotoByUserId?: Record<string, string | null>;
};

export default function MetapersonalHistoricoPage({
  personalName,
  pacientesVisiveis,
  loadingPacientes,
  patientPhotoByUserId = {},
}: Props) {
  const [periodDays, setPeriodDays] = useState<HistoryPeriodDays>(HISTORY_DEFAULT_PERIOD_DAYS);
  const [data, setData] = useState<HistoryAnalyticsResult>(() =>
    emptyHistoryAnalytics(HISTORY_DEFAULT_PERIOD_DAYS)
  );
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [filter, setFilter] = useState<HistoryTableFilter>('todos');
  const [search, setSearch] = useState('');
  const [selectedPatientKey, setSelectedPatientKey] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<'visao' | 'historico' | 'evolucao' | 'exercicios'>('visao');
  const requestIdRef = useRef(0);

  const pacientesAtivos = useMemo(
    () => pacientesVisiveis.filter((item) => item.status === 'ativo'),
    [pacientesVisiveis]
  );

  useEffect(() => {
    if (loadingPacientes) {
      setStatus('loading');
      return;
    }
    const requestId = ++requestIdRef.current;
    const signal = { cancelled: false };
    setStatus('loading');
    void loadPersonalHistoryAnalytics({
      pacientes: pacientesAtivos,
      personalName,
      periodDays,
      photoByUserId: patientPhotoByUserId,
      signal,
    })
      .then((result) => {
        if (signal.cancelled || requestId !== requestIdRef.current) return;
        setData(result);
        setStatus('success');
      })
      .catch(() => {
        if (signal.cancelled || requestId !== requestIdRef.current) return;
        setStatus('error');
      });
    return () => {
      signal.cancelled = true;
    };
  }, [loadingPacientes, pacientesAtivos, periodDays, personalName, patientPhotoByUserId]);

  const selected = data.patients.find((item) => item.patientKey === selectedPatientKey) ?? null;
  const hasPatients = pacientesAtivos.length > 0;
  const hasHistory = data.patients.some((item) => item.adherence.expected > 0);

  return (
    <div className="min-w-0 w-full space-y-4 md:-mx-1 xl:-mx-2 2xl:-mx-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Histórico & Estatísticas</h1>
          <p className="mt-1 text-sm text-gray-600">
            Acompanhe a adesão, evolução e desempenho dos seus pacientes.
          </p>
        </div>
        <label className="flex items-center gap-2 text-[13px] text-gray-600">
          <span className="sr-only">Período</span>
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value) as HistoryPeriodDays)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-[13px] font-semibold text-gray-800 shadow-sm outline-none focus:ring-2 focus:ring-gray-100"
          >
            {HISTORY_PERIOD_OPTIONS.map((days) => (
              <option key={days} value={days}>
                {HISTORY_PERIOD_LABELS[days]}
              </option>
            ))}
          </select>
        </label>
      </header>

      {status === 'loading' || loadingPacientes ? <HistoricoKpisSkeleton /> : <HistoricoKpis kpis={data.kpis} />}

      {status === 'error' ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          Não foi possível carregar o histórico. Tente novamente.
        </div>
      ) : null}

      {!loadingPacientes && status !== 'loading' && !hasPatients ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-10 text-center text-sm text-gray-600">
          Você ainda não possui pacientes vinculados.
        </div>
      ) : null}

      {!loadingPacientes && status === 'success' && hasPatients && !hasHistory ? (
        <div className="rounded-2xl border border-gray-200 bg-white px-4 py-8 text-center text-sm text-gray-600">
          Ainda não há treinos suficientes para gerar estatísticas.
        </div>
      ) : null}

      {hasPatients ? (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(260px,1.05fr)_minmax(0,1.4fr)_minmax(220px,0.9fr)]">
          {status === 'loading' ? (
            <>
              <div className="h-[220px] animate-pulse rounded-2xl bg-white" />
              <div className="h-[220px] animate-pulse rounded-2xl bg-white" />
              <div className="h-[220px] animate-pulse rounded-2xl bg-white" />
            </>
          ) : (
            <>
              <HistoricoAttentionPanel
                items={data.attention}
                onSelect={(patientKey) => {
                  setSelectedPatientKey(patientKey);
                  setPanelTab('visao');
                }}
              />
              <HistoricoAdherenceChart points={data.chart} />
              <HistoricoPortfolioDistribution distribution={data.distribution} />
            </>
          )}
        </div>
      ) : null}

      {hasPatients ? (
        <div className={`grid grid-cols-1 gap-3 ${selected ? 'xl:grid-cols-[minmax(0,1.6fr)_minmax(340px,1fr)]' : ''}`}>
          {status === 'loading' ? (
            <div className="h-[360px] animate-pulse rounded-2xl bg-white" />
          ) : (
            <HistoricoPatientsTable
              patients={data.patients}
              filter={filter}
              search={search}
              selectedPatientKey={selectedPatientKey}
              today={data.today}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              onSelect={(patientKey) => {
                setSelectedPatientKey(patientKey);
                setPanelTab('visao');
              }}
            />
          )}
          {selected ? (
            <HistoricoPatientPanel
              patient={selected}
              today={data.today}
              tab={panelTab}
              onTabChange={setPanelTab}
              onClose={() => setSelectedPatientKey(null)}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

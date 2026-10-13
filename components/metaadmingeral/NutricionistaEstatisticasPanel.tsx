'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ClipboardList,
  Loader2,
  Minus,
  Search,
  Stethoscope,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from 'lucide-react';
import { profissionalEstaAtivo } from '@/components/metaadmin/ProfissionalVinculoStats';
import type { NutricionistaDoc } from '@/features/metaNutri/metaNutri.types';
import {
  loadCardapioResumo,
  mapPool,
  type CardapioResumo,
} from '@/lib/metaadmin/profissionalPacienteResumo';
import {
  buildWeeklyNutritionPortfolioSummary,
  isActiveWeeklyNutritionPortfolioStatus,
  mergeEligiblePatientsWithPortfolioRows,
  type WeeklyNutritionPortfolioClassification,
  type WeeklyNutritionPortfolioSummary,
} from '@/lib/nutri/checkInSemanalNutriPortfolio';
import {
  listWeeklyNutritionPortfolioSummariesByNutritionist,
  portfolioSummaryToPatient,
} from '@/lib/nutri/checkInSemanalNutriPortfolioSummaryStore';
import { loadWeeklyNutritionCheckInsForPatientsInWeekRange } from '@/lib/nutri/checkInSemanalNutriScheduleStore';
import {
  formatNutritionWeekShortLabel,
  getNutritionCheckInReferenceWeek,
} from '@/lib/nutri/checkInSemanalNutriWeek';
import {
  PacienteNutricionistaService,
  type PacienteVisivelNutri,
} from '@/services/pacienteNutricionistaService';

type Props = {
  nutricionistas: NutricionistaDoc[];
};

type NutriStatsCache = {
  patients: PacienteVisivelNutri[];
  cardapios: Record<string, CardapioResumo>;
  checkInFilledIds: string[];
  portfolio: WeeklyNutritionPortfolioSummary;
  portfolioByPatient: Record<string, WeeklyNutritionPortfolioClassification>;
};

const STATUS_TRATAMENTO: Record<string, { label: string; className: string }> = {
  pendente: { label: 'Pendente', className: 'bg-amber-500/15 text-amber-200 ring-amber-400/25' },
  em_tratamento: { label: 'Em tratamento', className: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25' },
  concluido: { label: 'Concluído', className: 'bg-sky-500/15 text-sky-200 ring-sky-400/25' },
  abandono: { label: 'Abandono', className: 'bg-rose-500/15 text-rose-200 ring-rose-400/25' },
};

const PORTFOLIO_LABEL: Record<WeeklyNutritionPortfolioClassification, { label: string; className: string }> = {
  improving: { label: 'Evoluindo', className: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25' },
  stable: { label: 'Estável', className: 'bg-slate-500/20 text-[#E8EDED]/70 ring-white/15' },
  attention: { label: 'Atenção', className: 'bg-rose-500/15 text-rose-200 ring-rose-400/25' },
  insufficient_data: { label: 'Sem dados', className: 'bg-white/5 text-[#E8EDED]/45 ring-white/10' },
};

function nutriKey(nutri: NutricionistaDoc): string {
  return (nutri.userId || nutri.id || '').trim();
}

function patientName(item: PacienteVisivelNutri): string {
  return item.paciente.dadosIdentificacao?.nomeCompleto || item.paciente.nome || 'Paciente sem nome';
}

function medicoLabel(genero: 'M' | 'F' | undefined, nome: string): string {
  const prefix = genero === 'F' ? 'Dra.' : 'Dr.';
  return `${prefix} ${nome}`;
}

function MetricCard({
  label,
  value,
  hint,
  loading,
}: {
  label: string;
  value: string | number;
  hint?: string;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">{label}</p>
      <p className="mt-2 text-2xl font-bold tabular-nums text-[#E8EDED]">
        {loading ? <Loader2 className="inline h-6 w-6 animate-spin text-[#4CCB7A]" /> : value}
      </p>
      {hint ? <p className="mt-1 text-xs text-[#E8EDED]/45">{hint}</p> : null}
    </div>
  );
}

function StatusChip({ label, ok }: { label: string; ok: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${
        ok
          ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30'
          : 'bg-white/5 text-[#E8EDED]/40 ring-white/10'
      }`}
    >
      {ok ? <Check className="h-2.5 w-2.5" strokeWidth={2.5} /> : <Minus className="h-2.5 w-2.5" />}
      {label}
    </span>
  );
}

function CardapioChips({
  cardapio,
  loading,
}: {
  cardapio?: CardapioResumo;
  loading?: boolean;
}) {
  if (loading && !cardapio) {
    return <span className="text-[10px] text-[#E8EDED]/40">Carregando cardápio…</span>;
  }
  return (
    <>
      <StatusChip label="Anamnese" ok={Boolean(cardapio?.anamneseRealizada)} />
      {(cardapio?.refeicoes ?? []).map((refeicao) => (
        <StatusChip key={refeicao.key} label={refeicao.label} ok={refeicao.preenchida} />
      ))}
    </>
  );
}

export default function NutricionistaEstatisticasPanel({ nutricionistas }: Props) {
  const sortedNutris = useMemo(
    () =>
      [...nutricionistas].sort((a, b) => {
        if (a.status !== b.status) return a.status === 'ativo' ? -1 : 1;
        return a.nome.localeCompare(b.nome, 'pt-BR');
      }),
    [nutricionistas]
  );

  const [buscaNutri, setBuscaNutri] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [patients, setPatients] = useState<PacienteVisivelNutri[]>([]);
  const [cardapios, setCardapios] = useState<Record<string, CardapioResumo>>({});
  const [checkInFilled, setCheckInFilled] = useState<Set<string>>(new Set());
  const [portfolio, setPortfolio] = useState<WeeklyNutritionPortfolioSummary | null>(null);
  const [portfolioByPatient, setPortfolioByPatient] = useState<
    Record<string, WeeklyNutritionPortfolioClassification>
  >({});
  const [expandedMedicoIds, setExpandedMedicoIds] = useState<Set<string>>(new Set());
  const cacheRef = useRef(new Map<string, NutriStatsCache>());
  const requestSeqRef = useRef(0);

  const referenceWeek = useMemo(() => getNutritionCheckInReferenceWeek(), []);

  const nutrisFiltrados = useMemo(() => {
    const q = buscaNutri.trim().toLowerCase();
    if (!q) return sortedNutris;
    return sortedNutris.filter((nutri) => {
      const hay = `${nutri.nome} ${nutri.email} ${nutri.registroNumero}`.toLowerCase();
      return hay.includes(q);
    });
  }, [buscaNutri, sortedNutris]);

  useEffect(() => {
    if (sortedNutris.length === 0) {
      setSelectedId(null);
      return;
    }
    const stillThere = selectedId ? sortedNutris.some((n) => nutriKey(n) === selectedId) : false;
    if (!stillThere) {
      const firstActive = sortedNutris.find((n) => n.status === 'ativo') ?? sortedNutris[0];
      setSelectedId(nutriKey(firstActive));
    }
  }, [selectedId, sortedNutris]);

  const selectedNutri = useMemo(
    () => sortedNutris.find((n) => nutriKey(n) === selectedId) ?? null,
    [selectedId, sortedNutris]
  );

  const loadStats = useCallback(async (nutritionistId: string) => {
    const seq = requestSeqRef.current + 1;
    requestSeqRef.current = seq;
    const stillCurrent = () => requestSeqRef.current === seq;

    const cached = cacheRef.current.get(nutritionistId);
    if (cached) {
      if (!stillCurrent()) return;
      setPatients(cached.patients);
      setCardapios(cached.cardapios);
      setCheckInFilled(new Set(cached.checkInFilledIds));
      setPortfolio(cached.portfolio);
      setPortfolioByPatient(cached.portfolioByPatient);
      setExpandedMedicoIds(new Set(cached.patients.map((p) => p.medicoId)));
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setPatients([]);
    setCardapios({});
    setCheckInFilled(new Set());
    setPortfolio(null);
    setPortfolioByPatient({});
    try {
      const visiveis = await PacienteNutricionistaService.listPacientesVisiveisByNutri(nutritionistId);
      if (!stillCurrent()) return;
      const patientIds = visiveis.map((item) => item.pacienteId);
      const week = getNutritionCheckInReferenceWeek();

      const [cardapioEntries, checkIns, summaries] = await Promise.all([
        mapPool(visiveis, 4, async (item) => {
          const data = await loadCardapioResumo(item.pacienteId);
          return [item.pacienteId, data] as const;
        }),
        patientIds.length > 0
          ? loadWeeklyNutritionCheckInsForPatientsInWeekRange(patientIds, week.weekKey, week.weekKey)
          : Promise.resolve([]),
        listWeeklyNutritionPortfolioSummariesByNutritionist(nutritionistId),
      ]);

      const nextCardapios = Object.fromEntries(cardapioEntries);
      const filled = new Set(
        checkIns.filter((row) => row.weekKey === week.weekKey).map((row) => row.pacienteId)
      );
      const eligible = visiveis
        .filter((item) => isActiveWeeklyNutritionPortfolioStatus(item.paciente.statusTratamento))
        .map((item) => ({
          patientId: item.pacienteId,
          patientName: patientName(item),
        }));
      const rows = summaries.map((doc) =>
        portfolioSummaryToPatient(
          doc,
          eligible.find((item) => item.patientId === doc.patientId)?.patientName || 'Paciente'
        )
      );
      const merged = mergeEligiblePatientsWithPortfolioRows({
        eligiblePatients: eligible,
        rows,
      });
      const nextPortfolio = buildWeeklyNutritionPortfolioSummary(merged);
      const nextPortfolioByPatient: Record<string, WeeklyNutritionPortfolioClassification> = {};
      for (const row of merged) {
        nextPortfolioByPatient[row.patientId] = row.classification;
      }

      const snapshot: NutriStatsCache = {
        patients: visiveis,
        cardapios: nextCardapios,
        checkInFilledIds: [...filled],
        portfolio: nextPortfolio,
        portfolioByPatient: nextPortfolioByPatient,
      };
      cacheRef.current.set(nutritionistId, snapshot);
      if (!stillCurrent()) return;
      setPatients(visiveis);
      setCardapios(nextCardapios);
      setCheckInFilled(filled);
      setPortfolio(nextPortfolio);
      setPortfolioByPatient(nextPortfolioByPatient);
      setExpandedMedicoIds(new Set(visiveis.map((p) => p.medicoId)));
    } catch (err) {
      if (!stillCurrent()) return;
      console.error('[nutri-stats] falha ao carregar estatísticas', err);
      setError('Não foi possível carregar as estatísticas deste nutricionista.');
      setPatients([]);
      setCardapios({});
      setCheckInFilled(new Set());
      setPortfolio(null);
      setPortfolioByPatient({});
    } finally {
      if (stillCurrent()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedId) {
      setPatients([]);
      setCardapios({});
      setCheckInFilled(new Set());
      setPortfolio(null);
      setPortfolioByPatient({});
      return;
    }
    void loadStats(selectedId);
  }, [loadStats, selectedId]);

  const cardapiosReady = patients.every((item) =>
    Object.prototype.hasOwnProperty.call(cardapios, item.pacienteId)
  );

  const kpis = useMemo(() => {
    const total = patients.length;
    if (total === 0) {
      return {
        total: 0,
        anamnese: 0,
        ativo: 0,
        pendente: 0,
        checkIn: 0,
        emAcompanhamento: 0,
      };
    }
    let anamnese = 0;
    let ativo = 0;
    let checkIn = 0;
    let emAcompanhamento = 0;
    for (const item of patients) {
      const cardapio = cardapios[item.pacienteId];
      if (cardapio?.anamneseRealizada) anamnese += 1;
      if (profissionalEstaAtivo('nutricionista', cardapio)) ativo += 1;
      if (checkInFilled.has(item.pacienteId)) checkIn += 1;
      if (isActiveWeeklyNutritionPortfolioStatus(item.paciente.statusTratamento)) emAcompanhamento += 1;
    }
    return {
      total,
      anamnese,
      ativo,
      pendente: total - ativo,
      checkIn,
      emAcompanhamento,
    };
  }, [cardapios, checkInFilled, patients]);

  const gruposPorMedico = useMemo(() => {
    const map = new Map<
      string,
      {
        medicoId: string;
        medicoNome: string;
        medicoGenero?: 'M' | 'F';
        patients: PacienteVisivelNutri[];
      }
    >();
    for (const item of patients) {
      const existing = map.get(item.medicoId);
      if (existing) {
        existing.patients.push(item);
        continue;
      }
      map.set(item.medicoId, {
        medicoId: item.medicoId,
        medicoNome: item.medicoNome,
        medicoGenero: item.medicoGenero,
        patients: [item],
      });
    }
    return [...map.values()]
      .map((grupo) => ({
        ...grupo,
        patients: [...grupo.patients].sort((a, b) => patientName(a).localeCompare(patientName(b), 'pt-BR')),
      }))
      .sort((a, b) => a.medicoNome.localeCompare(b.medicoNome, 'pt-BR'));
  }, [patients]);

  const toggleMedico = (medicoId: string) => {
    setExpandedMedicoIds((prev) => {
      const next = new Set(prev);
      if (next.has(medicoId)) next.delete(medicoId);
      else next.add(medicoId);
      return next;
    });
  };

  if (sortedNutris.length === 0) return null;

  const metricsLoading = loading && !cardapiosReady;

  return (
    <section className="space-y-4">
      <div>
        <h3 className="text-lg font-semibold text-[#E8EDED]">Estatísticas dos nutricionistas</h3>
        <p className="mt-1 text-sm text-[#E8EDED]/55">
          Pacientes agrupados por médico, com anamnese, cardápio, status ativo e acompanhamento do
          check-in semanal.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8EDED]/40" />
          <input
            type="search"
            value={buscaNutri}
            onChange={(e) => setBuscaNutri(e.target.value)}
            placeholder="Buscar nutricionista"
            className="w-full rounded-xl border border-white/10 bg-black/20 py-2 pl-9 pr-3 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35 outline-none focus:border-[#4CCB7A]/40"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {nutrisFiltrados.map((nutri) => {
            const id = nutriKey(nutri);
            const active = id === selectedId;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setSelectedId(id)}
                className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                  active
                    ? 'bg-[#4CCB7A] text-[#0B1F17]'
                    : 'bg-white/5 text-[#E8EDED]/70 ring-1 ring-white/10 hover:bg-white/10'
                }`}
              >
                {nutri.nome}
                {nutri.status !== 'ativo' ? (
                  <span className={`ml-1 ${active ? 'opacity-70' : 'text-[#E8EDED]/40'}`}>· inativo</span>
                ) : null}
              </button>
            );
          })}
          {nutrisFiltrados.length === 0 ? (
            <p className="text-xs text-[#E8EDED]/45">Nenhum nutricionista encontrado.</p>
          ) : null}
        </div>
      </div>

      {selectedNutri ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-[#E8EDED]/70">
          <UtensilsCrossed className="h-4 w-4 text-[#4CCB7A]" />
          <span className="font-semibold text-[#E8EDED]">{selectedNutri.nome}</span>
          {selectedNutri.registroNumero ? (
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] ring-1 ring-white/10">
              CRN {selectedNutri.registroNumero}
            </span>
          ) : null}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard label="Pacientes" value={kpis.total} hint="Compartilhados ativos" loading={metricsLoading} />
        <MetricCard
          label="Anamnese"
          value={metricsLoading ? '—' : kpis.anamnese}
          hint="Preenchida"
          loading={metricsLoading}
        />
        <MetricCard
          label="Ativos"
          value={metricsLoading ? '—' : kpis.ativo}
          hint={`${kpis.pendente} pendente${kpis.pendente === 1 ? '' : 's'} · cardápio pronto`}
          loading={metricsLoading}
        />
        <MetricCard
          label="Check-in"
          value={metricsLoading ? '—' : kpis.checkIn}
          hint={`Semana ${formatNutritionWeekShortLabel(referenceWeek)}`}
          loading={metricsLoading}
        />
        <MetricCard
          label="Acompanhamento"
          value={kpis.emAcompanhamento}
          hint="Em tratamento"
          loading={metricsLoading}
        />
      </div>

      {portfolio && kpis.emAcompanhamento > 0 ? (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <MetricCard
            label="Evoluindo"
            value={portfolio.improving}
            hint="Tendência positiva"
            loading={metricsLoading}
          />
          <MetricCard
            label="Estáveis"
            value={portfolio.stable}
            hint="Sem alerta relevante"
            loading={metricsLoading}
          />
          <MetricCard
            label="Precisam de atenção"
            value={portfolio.attention}
            hint="Prioridade do check-in"
            loading={metricsLoading}
          />
          <MetricCard
            label="Sem dados"
            value={portfolio.insufficientData}
            hint="Check-ins insuficientes"
            loading={metricsLoading}
          />
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {error}
        </div>
      ) : null}

      {loading && patients.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-[#4CCB7A]" />
          <p className="mt-3 text-sm text-[#E8EDED]/60">Carregando pacientes e métricas…</p>
        </div>
      ) : null}

      {!loading && !error && selectedNutri && patients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-white/5 px-4 py-8 text-center text-sm text-[#E8EDED]/50">
          Nenhum paciente compartilhado com este nutricionista.
        </div>
      ) : null}

      {gruposPorMedico.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#E8EDED]">
            <Stethoscope className="h-4 w-4 text-[#4CCB7A]" />
            Pacientes por médico
            <span className="text-xs font-medium text-[#E8EDED]/45">({gruposPorMedico.length})</span>
          </div>

          {gruposPorMedico.map((grupo) => {
            const expanded = expandedMedicoIds.has(grupo.medicoId);
            let ativo = 0;
            let anamnese = 0;
            let checkIn = 0;
            for (const item of grupo.patients) {
              const cardapio = cardapios[item.pacienteId];
              if (cardapio?.anamneseRealizada) anamnese += 1;
              if (profissionalEstaAtivo('nutricionista', cardapio)) ativo += 1;
              if (checkInFilled.has(item.pacienteId)) checkIn += 1;
            }
            return (
              <div
                key={grupo.medicoId}
                className="overflow-hidden rounded-2xl border border-white/10 bg-white/5"
              >
                <button
                  type="button"
                  onClick={() => toggleMedico(grupo.medicoId)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5"
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-500/15 text-sky-200">
                    <Stethoscope className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#E8EDED]">
                      {medicoLabel(grupo.medicoGenero, grupo.medicoNome)}
                    </p>
                    <p className="mt-0.5 text-[11px] text-[#E8EDED]/50">
                      {grupo.patients.length} {grupo.patients.length === 1 ? 'paciente' : 'pacientes'}
                      {' · '}
                      {anamnese} anamnese
                      {' · '}
                      {ativo} ativo{ativo === 1 ? '' : 's'}
                      {' · '}
                      {checkIn} check-in
                    </p>
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#E8EDED]/45 transition-transform ${
                      expanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {expanded ? (
                  <div className="space-y-2 border-t border-white/10 px-3 py-3">
                    {grupo.patients.map((item) => {
                      const cardapio = cardapios[item.pacienteId];
                      const st =
                        STATUS_TRATAMENTO[item.paciente.statusTratamento || 'pendente'] ??
                        STATUS_TRATAMENTO.pendente;
                      const ativoPaciente = profissionalEstaAtivo('nutricionista', cardapio);
                      const filled = checkInFilled.has(item.pacienteId);
                      const emAcomp = isActiveWeeklyNutritionPortfolioStatus(
                        item.paciente.statusTratamento
                      );
                      const classification = portfolioByPatient[item.pacienteId];
                      const portfolioChip = classification ? PORTFOLIO_LABEL[classification] : null;
                      return (
                        <article
                          key={item.pacienteId}
                          className="rounded-xl border border-white/10 bg-black/20 px-3 py-2.5"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="min-w-0 truncate text-sm font-semibold text-[#E8EDED]">
                              {patientName(item)}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${st.className}`}
                            >
                              {st.label}
                            </span>
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${
                                ativoPaciente
                                  ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/25'
                                  : 'bg-amber-500/15 text-amber-200 ring-amber-400/25'
                              }`}
                            >
                              {ativoPaciente ? (
                                <Check className="h-2.5 w-2.5" strokeWidth={2.5} />
                              ) : (
                                <Minus className="h-2.5 w-2.5" />
                              )}
                              {ativoPaciente ? 'Ativo' : 'Pendente'}
                            </span>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-1">
                            <CardapioChips cardapio={cardapio} loading={!cardapiosReady} />
                            <span
                              className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${
                                filled
                                  ? 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/30'
                                  : 'bg-white/5 text-[#E8EDED]/40 ring-white/10'
                              }`}
                            >
                              {filled ? (
                                <ClipboardList className="h-2.5 w-2.5" />
                              ) : (
                                <Minus className="h-2.5 w-2.5" />
                              )}
                              Check-in
                            </span>
                            {emAcomp && portfolioChip ? (
                              <span
                                className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ring-1 ${portfolioChip.className}`}
                              >
                                {classification === 'improving' ? (
                                  <TrendingUp className="h-2.5 w-2.5" />
                                ) : classification === 'attention' ? (
                                  <AlertTriangle className="h-2.5 w-2.5" />
                                ) : (
                                  <Users className="h-2.5 w-2.5" />
                                )}
                                {portfolioChip.label}
                              </span>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

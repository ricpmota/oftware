'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Database,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Shield,
  X,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  formatDateTime,
  formatMinutes,
  formatMs,
  formatRate,
  OpsEngineBadge,
  OpsHealthBadge,
  OpsMetricCard,
  OpsPageHeader,
  OpsPanel,
  OPS_CHANNEL_TABS,
  OpsSection,
  type OpsChannelTabId,
} from '@/components/metaadmingeral/automation-ops/automationOpsUi';
import type {
  AutomationOpsDashboardDto,
  AutomationOpsExecutionDetail,
  AutomationOpsSearchResult,
  AutomationOpsTimelineEvent,
} from '@/types/automationOps';
import EmailCutoverControlPanel from '@/components/metaadmingeral/automacoes/EmailCutoverControlPanel';

const REFRESH_MS = 30_000;

async function fetchWithAuth<T>(user: User, path: string): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? 'Erro na requisição');
  return json;
}

function ChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-[#4CCB7A]' : 'text-red-300'}>{ok ? '✓' : '✗'}</span>
      <span className="text-[#E8EDED]/80">{label}</span>
    </div>
  );
}

type AutomacoesOpsPanelProps = {
  user: User;
};

export default function AutomacoesOpsPanel({ user }: AutomacoesOpsPanelProps) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [dashboard, setDashboard] = useState<AutomationOpsDashboardDto | null>(null);
  const [timeline, setTimeline] = useState<AutomationOpsTimelineEvent[]>([]);
  const [activeChannel, setActiveChannel] = useState<OpsChannelTabId>('email');

  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState<AutomationOpsSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  const [executionId, setExecutionId] = useState<string | null>(null);
  const [executionDetail, setExecutionDetail] = useState<AutomationOpsExecutionDetail | null>(null);
  const [executionLoading, setExecutionLoading] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setRefreshing(true);
    setError(null);
    try {
      const dashRes = await fetchWithAuth<{ dashboard: AutomationOpsDashboardDto }>(
        user,
        '/api/metaadmingeral/automation/ops-dashboard',
      );
      setDashboard(dashRes.dashboard);

      try {
        const timelineRes = await fetchWithAuth<{ events: AutomationOpsTimelineEvent[] }>(
          user,
          '/api/metaadmingeral/automation/timeline?limit=40',
        );
        setTimeline(timelineRes.events);
      } catch (timelineError) {
        console.error('[AutomationOpsCenter] timeline', timelineError);
        setTimeline([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dados');
      setDashboard(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    void loadData();
    const interval = setInterval(() => void loadData(true), REFRESH_MS);
    return () => clearInterval(interval);
  }, [loadData]);

  const runSearch = useCallback(async () => {
    if (!user || !searchQ.trim()) return;
    setSearching(true);
    try {
      const res = await fetchWithAuth<{ results: AutomationOpsSearchResult[] }>(
        user,
        `/api/metaadmingeral/automation/search?q=${encodeURIComponent(searchQ.trim())}`,
      );
      setSearchResults(res.results);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro na busca');
    } finally {
      setSearching(false);
    }
  }, [user, searchQ]);

  const openExecution = useCallback(
    async (id: string) => {
      if (!user) return;
      setExecutionId(id);
      setExecutionLoading(true);
      setExecutionDetail(null);
      try {
        const res = await fetchWithAuth<{ detail: AutomationOpsExecutionDetail }>(
          user,
          `/api/metaadmingeral/automation/execution?id=${encodeURIComponent(id)}`,
        );
        setExecutionDetail(res.detail);
      } catch {
        setExecutionDetail(null);
      } finally {
        setExecutionLoading(false);
      }
    },
    [user],
  );

  const chartEmails = useMemo(
    () =>
      (dashboard?.charts.emailsSentByHour ?? []).map((p) => ({
        label: p.hour.slice(11, 16),
        count: p.count,
      })),
    [dashboard],
  );

  const chartFirestore = useMemo(() => {
    if (!dashboard) return [];
    return [
      {
        motor: 'Legacy',
        reads: dashboard.charts.firestoreReadsComparison.legacy ?? 0,
        ms: dashboard.charts.avgDurationComparison.legacy ?? 0,
      },
      {
        motor: 'Queue',
        reads: dashboard.charts.firestoreReadsComparison.queue ?? 0,
        ms: dashboard.charts.avgDurationComparison.queue ?? 0,
      },
    ];
  }, [dashboard]);

  if (loading && !dashboard) {
    return (
      <div className="flex items-center gap-2 py-12 text-sm text-[#E8EDED]/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando Operations Center…
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="space-y-6">
        <OpsPageHeader
          title="Automation Operations Center"
          subtitle="NOC operacional do Automation Engine — leitura rápida, alertas e rastreabilidade."
        />
        <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-8 text-center space-y-4">
          <AlertTriangle className="mx-auto h-10 w-10 text-amber-300" />
          <p className="text-sm text-[#E8EDED]/70">{error ?? 'Erro desconhecido ao carregar métricas.'}</p>
          <button
            type="button"
            onClick={() => void loadData()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A]/20 px-4 py-2 text-sm font-medium text-[#4CCB7A]"
          >
            <RefreshCw className="h-4 w-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  const d = dashboard;
  const queueHealth = d.email.queueHealth.status;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <OpsPageHeader
          title="Automation Operations Center"
          subtitle="NOC operacional do Automation Engine — leitura rápida, alertas e rastreabilidade."
        />
        <div className="flex items-center gap-2 pt-1">
          <OpsHealthBadge status={d.health} />
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={refreshing}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

        {error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {d.alerts.length > 0 ? (
          <OpsSection title="Alertas">
            <div className="grid gap-3 sm:grid-cols-2">
              {d.alerts.map((a) => (
                <div
                  key={a.id}
                  className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
                  <div>
                    <p className="text-sm font-medium text-[#E8EDED]">{a.title}</p>
                    <p className="mt-0.5 text-xs text-[#E8EDED]/60">{a.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </OpsSection>
        ) : null}

        {/* Busca */}
        <OpsPanel className="p-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-[240px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#E8EDED]/40" />
              <input
                type="text"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void runSearch()}
                placeholder="leadId, organizationId, email, automationExecutionId…"
                className="w-full rounded-xl border border-white/10 bg-black/20 py-2.5 pl-10 pr-4 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/35"
              />
            </div>
            <button
              type="button"
              onClick={() => void runSearch()}
              disabled={searching}
              className="rounded-xl bg-[#4CCB7A]/20 px-4 py-2 text-sm font-medium text-[#4CCB7A] hover:bg-[#4CCB7A]/30"
            >
              Buscar
            </button>
          </div>
          {searchResults.length > 0 ? (
            <div className="mt-3 space-y-1 border-t border-white/10 pt-3">
              {searchResults.map((r) => (
                <button
                  key={`${r.kind}-${r.id}`}
                  type="button"
                  onClick={() => r.automationExecutionId && void openExecution(r.automationExecutionId)}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-2 text-left text-sm hover:bg-white/5"
                >
                  <span className="text-[#E8EDED]/85">
                    [{r.kind}] {r.summary}
                  </span>
                  <span className="text-xs text-[#E8EDED]/45">{formatDateTime(r.at)}</span>
                </button>
              ))}
            </div>
          ) : null}
        </OpsPanel>

        {/* Channel tabs — preparado para crescimento */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 pb-1">
          {OPS_CHANNEL_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              disabled={!tab.active}
              onClick={() => tab.active && setActiveChannel(tab.id)}
              className={`rounded-t-lg px-4 py-2 text-sm font-medium transition ${
                activeChannel === tab.id ? 'bg-white/10 text-[#4CCB7A]'
                : tab.active ? 'text-[#E8EDED]/60 hover:text-[#E8EDED]'
                : 'cursor-not-allowed text-[#E8EDED]/25'
              }`}
            >
              {tab.label}
              {!tab.active ? ' (em breve)' : ''}
            </button>
          ))}
        </div>

        {activeChannel === 'email' ? (
          <>
            <EmailCutoverControlPanel user={user} />

            {/* Status geral */}
            <OpsSection title="Status geral — Automation Engine">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
                <OpsMetricCard
                  icon={Shield}
                  label="Engine Status"
                  value={`${queueHealth === d.health ? '' : ''}${d.health}`}
                  hint="Agregado e-mail + cron + circuit"
                  tone={d.health === 'healthy' ? 'ok' : d.health === 'warning' ? 'warn' : 'critical'}
                />
                <OpsMetricCard
                  icon={Clock}
                  label="Última execução"
                  value={formatDateTime(d.overview.lastExecutionAt)}
                  hint={
                    d.overview.cronDelayMinutes != null ?
                      `${d.overview.cronDelayMinutes} min atrás`
                    : undefined
                  }
                  tone={d.overview.cronActive ? 'ok' : 'warn'}
                />
                <OpsMetricCard
                  icon={Activity}
                  label="Tempo médio / máx"
                  value={`${formatMs(d.overview.avgDurationMs)} / ${formatMs(d.overview.maxDurationMs)}`}
                />
                <OpsMetricCard
                  icon={Zap}
                  label="Cron ativo"
                  value={d.overview.cronActive ? 'Sim' : 'Atrasado'}
                  tone={d.overview.cronActive ? 'ok' : 'critical'}
                />
                <OpsMetricCard
                  icon={AlertTriangle}
                  label="Circuit Breaker"
                  value={d.overview.circuitBreakersOpen}
                  hint="Organizações pausadas"
                  tone={d.overview.circuitBreakersOpen > 0 ? 'critical' : 'ok'}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <OpsMetricCard icon={Mail} label="Org Queue" value={d.overview.organizationsQueue} />
                <OpsMetricCard icon={Mail} label="Org Legacy" value={d.overview.organizationsLegacy} />
                <OpsMetricCard icon={Mail} label="Org Shadow" value={d.overview.organizationsShadow} />
              </div>
            </OpsSection>

            {/* Email Engine + Queue Health */}
            <OpsSection title="E-mail Engine">
              <div className="mb-3 flex items-center gap-3">
                <span className="text-sm text-[#E8EDED]/60">Queue Health:</span>
                <OpsHealthBadge status={queueHealth} />
                {d.email.queueHealth.rules.length > 0 ? (
                  <span className="text-xs text-[#E8EDED]/45">{d.email.queueHealth.rules.join(' · ')}</span>
                ) : null}
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
                <OpsMetricCard icon={Mail} label="Pending" value={d.email.counts.pending} tone={d.email.counts.pending > 50 ? 'warn' : 'default'} />
                <OpsMetricCard icon={Activity} label="Processing" value={d.email.counts.processing} />
                <OpsMetricCard icon={Zap} label="Sent" value={d.email.counts.sent} tone="ok" />
                <OpsMetricCard icon={AlertTriangle} label="Failed" value={d.email.counts.failed} tone={d.email.counts.failed > 0 ? 'warn' : 'default'} />
                <OpsMetricCard icon={Mail} label="Skipped" value={d.email.counts.skipped} />
                <OpsMetricCard icon={RefreshCw} label="Retries" value={d.email.retries.totalRetries} hint={`média ${d.email.retries.avgRetryCountFailed.toFixed(1)}`} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <OpsMetricCard icon={Clock} label="Due Now" value={d.email.dueNow} tone={d.email.dueNow > 0 ? 'warn' : 'ok'} />
                <OpsMetricCard icon={Clock} label="Oldest Pending" value={formatDateTime(d.email.oldestPendingAt)} />
                <OpsMetricCard icon={Clock} label="Oldest Processing" value={formatDateTime(d.email.oldestProcessingAt)} />
                <OpsMetricCard
                  icon={Clock}
                  label="Queue Age avg / max"
                  value={`${formatMinutes(d.email.avgQueueAgeMinutes)} / ${formatMinutes(d.email.maxQueueAgeMinutes)}`}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <OpsMetricCard icon={Zap} label="Throughput" value={formatRate(d.email.throughput.emailsPerMinute)} />
                <OpsMetricCard icon={Clock} label="Latência média" value={formatMs(d.email.throughput.avgSendLatencyMs)} />
                <OpsMetricCard icon={Clock} label="Latência máx" value={formatMs(d.email.throughput.maxSendLatencyMs)} />
              </div>
            </OpsSection>

            {/* Firestore */}
            <OpsSection title="Firestore">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <OpsMetricCard icon={Database} label="Reads (última run)" value={d.email.firestore.reads ?? '—'} />
                <OpsMetricCard icon={Database} label="Writes (última run)" value={d.email.firestore.writes ?? '—'} />
                <OpsMetricCard icon={Clock} label="Tempo execução" value={formatMs(d.email.firestore.avgDurationMs)} />
                <OpsMetricCard
                  icon={Database}
                  label="Economia reads"
                  value={
                    d.email.firestore.readsReductionPct != null ?
                      `${d.email.firestore.readsReductionPct}%`
                    : '—'
                  }
                  hint={
                    d.email.firestore.estimatedReadsSaved != null ?
                      `~${d.email.firestore.estimatedReadsSaved} reads/run`
                    : 'Aguarda runs queue + legacy'
                  }
                  tone="ok"
                />
              </div>
            </OpsSection>

            {/* SLA */}
            <OpsSection title="SLA (scheduledFor → sentAt)">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                <OpsMetricCard icon={BarChart3} label="Amostra" value={d.email.sla.sampleSize} />
                <OpsMetricCard icon={BarChart3} label="P50" value={formatMs(d.email.sla.p50Ms)} />
                <OpsMetricCard icon={BarChart3} label="P95" value={formatMs(d.email.sla.p95Ms)} />
                <OpsMetricCard icon={BarChart3} label="P99" value={formatMs(d.email.sla.p99Ms)} />
                <OpsMetricCard icon={Clock} label="Média / Máx" value={`${formatMs(d.email.sla.avgMs)} / ${formatMs(d.email.sla.maxMs)}`} />
              </div>
            </OpsSection>

            {/* Shadow */}
            <OpsSection title="Shadow Validation">
              <div className="grid gap-4 lg:grid-cols-2">
                <OpsPanel className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#E8EDED]">Ready For Cutover</span>
                    <OpsHealthBadge status={d.shadow.readyForCutover ? 'healthy' : 'warning'} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <OpsMetricCard icon={Shield} label="Match Rate" value={`${d.shadow.matchRate}%`} tone={d.shadow.matchRate >= 99.9 ? 'ok' : 'warn'} />
                    <OpsMetricCard icon={Activity} label="Comparações" value={d.shadow.comparisons} />
                  </div>
                  <p className="text-xs text-[#E8EDED]/50">
                    Último mismatch: {formatDateTime(d.shadow.lastMismatchAt)} · Crítico:{' '}
                    {formatDateTime(d.shadow.lastCriticalMismatchAt)} · Dias sem crítico:{' '}
                    {d.shadow.consecutiveDaysWithoutCriticalMismatch}
                  </p>
                </OpsPanel>
                <OpsPanel className="p-5 space-y-2">
                  <p className="text-sm font-medium text-[#E8EDED] mb-2">Checklist operacional</p>
                  <ChecklistRow ok={d.shadow.operationalChecklist.matchRateAtLeast999} label="Match rate ≥ 99.9%" />
                  <ChecklistRow ok={d.shadow.operationalChecklist.comparisonsAtLeast500} label="≥ 500 comparações" />
                  <ChecklistRow ok={d.shadow.operationalChecklist.zeroCriticalMismatchLast72h} label="Zero crítico 72h" />
                  <ChecklistRow ok={d.shadow.operationalChecklist.shadowValidationEnabled} label="Shadow validation ON" />
                  <ChecklistRow ok={d.shadow.operationalChecklist.rebuildQueuePopulated} label="Fila populada" />
                  <ChecklistRow ok={d.shadow.operationalChecklist.engineIsLegacy} label="Engine legacy (pré-cutover)" />
                </OpsPanel>
              </div>
            </OpsSection>

            {/* Gráficos */}
            <OpsSection title="Performance">
              <div className="grid gap-6 lg:grid-cols-2">
                <OpsPanel className="p-4 h-72">
                  <p className="mb-3 text-sm font-medium text-[#E8EDED]">E-mails enviados por hora (24h)</p>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartEmails}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="label" tick={{ fill: '#E8EDED80', fontSize: 10 }} />
                      <YAxis tick={{ fill: '#E8EDED80', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Bar dataKey="count" fill="#4CCB7A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </OpsPanel>
                <OpsPanel className="p-4 h-72">
                  <p className="mb-3 text-sm font-medium text-[#E8EDED]">Legacy vs Queue — Firestore reads</p>
                  <ResponsiveContainer width="100%" height="85%">
                    <BarChart data={chartFirestore}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="motor" tick={{ fill: '#E8EDED80', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#E8EDED80', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Legend />
                      <Bar dataKey="reads" name="Reads" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </OpsPanel>
                <OpsPanel className="p-4 h-72 lg:col-span-2">
                  <p className="mb-3 text-sm font-medium text-[#E8EDED]">
                    Pending snapshot · {formatDateTime(d.charts.pendingSnapshot.at)} — pending:{' '}
                    {d.charts.pendingSnapshot.pending}, due: {d.charts.pendingSnapshot.dueNow}
                  </p>
                  <p className="text-xs text-[#E8EDED]/45 mb-2">
                    Série histórica de pending ao longo do dia será acumulada em produção (ETAPA 3).
                  </p>
                  <ResponsiveContainer width="100%" height="70%">
                    <LineChart
                      data={[
                        {
                          t: 'Agora',
                          pending: d.charts.pendingSnapshot.pending,
                          due: d.charts.pendingSnapshot.dueNow,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                      <XAxis dataKey="t" tick={{ fill: '#E8EDED80' }} />
                      <YAxis tick={{ fill: '#E8EDED80' }} />
                      <Tooltip contentStyle={{ background: '#0A1F44', border: '1px solid rgba(255,255,255,0.1)' }} />
                      <Legend />
                      <Line type="monotone" dataKey="pending" stroke="#4CCB7A" name="Pending" />
                      <Line type="monotone" dataKey="due" stroke="#f59e0b" name="Due Now" />
                    </LineChart>
                  </ResponsiveContainer>
                </OpsPanel>
              </div>
            </OpsSection>

            {/* Organizações */}
            <OpsSection title="Organizações">
              <OpsPanel>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                        {['Nome', 'Engine', 'Pending', 'Processing', 'Failed', 'Due', 'Throughput', 'Última exec.', 'Circuit', ''].map(
                          (h) => (
                            <th key={h} className="px-4 py-3 font-medium whitespace-nowrap">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {d.organizations.map((org) => (
                        <tr key={org.organizationId} className="border-b border-white/5 hover:bg-white/[0.02]">
                          <td className="px-4 py-3 text-[#E8EDED]">{org.organizationName}</td>
                          <td className="px-4 py-3">
                            <OpsEngineBadge engine={org.engine} />
                          </td>
                          <td className="px-4 py-3">{org.pending}</td>
                          <td className="px-4 py-3">{org.processing}</td>
                          <td className="px-4 py-3">{org.failed}</td>
                          <td className="px-4 py-3">{org.dueNow}</td>
                          <td className="px-4 py-3">{formatRate(org.throughputEmailsPerMinute)}</td>
                          <td className="px-4 py-3 text-xs">{formatDateTime(org.lastExecutionAt)}</td>
                          <td className="px-4 py-3">
                            {org.circuitOpen ?
                              <span className="text-red-300 text-xs">Aberto</span>
                            : <span className="text-[#4CCB7A] text-xs">OK</span>}
                          </td>
                          <td className="px-4 py-3">
                            <a
                              href="/metaadmingeral?menu=automacoes-ferramentas"
                              className="text-xs text-[#4CCB7A] hover:underline"
                            >
                              Detalhes
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </OpsPanel>
            </OpsSection>
          </>
        ) : activeChannel === 'whatsapp' ? (
          <OpsSection title="WhatsApp (visão operacional resumida)">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <OpsMetricCard icon={Mail} label="Pending" value={d.channels.whatsapp.pending} />
              <OpsMetricCard icon={Clock} label="Due Now" value={d.channels.whatsapp.dueNow} />
            </div>
            <p className="text-sm text-[#E8EDED]/50">
              Métricas completas de WhatsApp serão expandidas neste NOC nas próximas etapas. Fila e cron já
              aparecem na timeline.
            </p>
          </OpsSection>
        ) : (
          <OpsPanel className="p-8 text-center text-[#E8EDED]/50">
            Canal em breve — estrutura de abas preparada para expansão sem redesign.
          </OpsPanel>
        )}

        {/* Timeline */}
        <OpsSection title="Timeline">
          <OpsPanel>
            <div className="divide-y divide-white/5 max-h-[420px] overflow-y-auto">
              {timeline.map((ev) => (
                <button
                  key={ev.id}
                  type="button"
                  onClick={() => ev.automationExecutionId && void openExecution(ev.automationExecutionId)}
                  className="flex w-full items-start gap-4 px-4 py-3 text-left hover:bg-white/[0.02]"
                >
                  <span className="shrink-0 text-xs text-[#E8EDED]/45 w-28">
                    {formatDateTime(ev.at).split(' ').slice(-1)[0]}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-[#E8EDED]">{ev.title}</p>
                    {ev.subtitle ? <p className="text-xs text-[#E8EDED]/50 truncate">{ev.subtitle}</p> : null}
                  </div>
                  <span className="text-xs text-[#E8EDED]/35 capitalize">{ev.type.replace(/_/g, ' ')}</span>
                </button>
              ))}
            </div>
          </OpsPanel>
        </OpsSection>

      <p className="text-xs text-[#E8EDED]/35">
        Atualizado: {formatDateTime(d.generatedAt)} · refresh automático {REFRESH_MS / 1000}s
      </p>

      {/* Execution drawer */}
      {executionId ? (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50">
          <div className="flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-[#0A1F44] shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <h3 className="text-sm font-semibold text-[#E8EDED]">Automation Execution</h3>
              <button type="button" onClick={() => setExecutionId(null)} className="rounded-lg p-1 hover:bg-white/10">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <p className="break-all text-xs font-mono text-[#4CCB7A]/90">{executionId}</p>
              {executionLoading ? (
                <p className="text-sm text-[#E8EDED]/50">Carregando…</p>
              ) : executionDetail ? (
                <>
                  {(['queueItem', 'ledgerEntries', 'runMetrics', 'zepto'] as const).map((section) => (
                    <div key={section}>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[#E8EDED]/45">
                        {section}
                      </p>
                      <pre className="max-h-48 overflow-auto rounded-lg border border-white/10 bg-black/30 p-3 text-xs text-[#E8EDED]/80">
                        {JSON.stringify(
                          section === 'queueItem' ? executionDetail.queueItem
                          : section === 'ledgerEntries' ? executionDetail.ledgerEntries
                          : section === 'runMetrics' ? executionDetail.runMetrics
                          : executionDetail.zepto,
                          null,
                          2,
                        )}
                      </pre>
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-sm text-[#E8EDED]/50">Nenhum detalhe encontrado para este ID.</p>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

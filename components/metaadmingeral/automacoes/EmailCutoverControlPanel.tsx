'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import {
  AlertTriangle,
  ArrowRightLeft,
  CheckCircle2,
  Cloud,
  Loader2,
  Play,
  RotateCcw,
  Shield,
} from 'lucide-react';
import {
  formatDateTime,
  formatMs,
  OpsEngineBadge,
  OpsPanel,
  OpsSection,
} from '@/components/metaadmingeral/automation-ops/automationOpsUi';
import { computeQueryInsightsDelta } from '@/lib/email/cutoverQueryInsights';
import type {
  EmailCutoverControlDto,
  EmailCutoverRollbackReason,
} from '@/types/emailCutoverControl';
import { EMAIL_CUTOVER_ROLLBACK_REASONS } from '@/types/emailCutoverControl';

const REFRESH_MS = 30_000;
const TARGET_ORG = 'metodo';

async function fetchWithAuth<T>(
  user: User,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = await user.getIdToken();
  const res = await fetch(path, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.ok) throw new Error(json.error ?? 'Erro na requisição');
  return json;
}

const ROLLBACK_LABELS: Record<EmailCutoverRollbackReason, string> = {
  fila_acumulando: 'Fila acumulando',
  falha_envio: 'Falha de envio',
  duplicidade: 'Duplicidade',
  circuit_breaker: 'Circuit breaker',
  isolamento_multi_org: 'Isolamento multi-org',
  outro: 'Outro',
};

function CutoverChecklistRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span className={ok ? 'text-[#4CCB7A]' : 'text-red-300'}>{ok ? '✓' : '✗'}</span>
      <span className="text-[#E8EDED]/80">{label}</span>
    </div>
  );
}

const PREFLIGHT_LABELS: Record<string, string> = {
  queue_populated: 'Fila populada',
  processing_clear: 'Processing = 0',
  circuit_breaker: 'Circuit breaker fechado',
  transport_health: 'SMTP saudável',
  multi_org_isolation: 'Isolamento multi-organização',
  clinica_remains_legacy: 'Clínica Exemplo WL permanece legacy',
  cron_active: 'Cron ativo',
  failed_acceptable: 'Failed aceitável na fila',
  queue_index: 'Índice da fila funcional',
  rollback_available: 'Rollback disponível',
};

function statusLabel(status: string | undefined): string {
  switch (status) {
    case 'VALIDATING_LEGACY':
      return 'Validando ciclos legacy';
    case 'READY_FOR_CUTOVER':
      return 'Pronto para cutover';
    case 'MONITORING_QUEUE':
      return 'Monitorando queue';
    case 'ROLLED_BACK':
      return 'Rollback executado';
    default:
      return 'Aguardando preparação';
  }
}

type EmailCutoverControlPanelProps = {
  user: User;
};

export default function EmailCutoverControlPanel({ user }: EmailCutoverControlPanelProps) {
  const [control, setControl] = useState<EmailCutoverControlDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPromoteConfirm, setShowPromoteConfirm] = useState(false);
  const [showRollbackConfirm, setShowRollbackConfirm] = useState(false);
  const [rollbackReason, setRollbackReason] = useState<EmailCutoverRollbackReason>('outro');
  const [rollbackDetail, setRollbackDetail] = useState('');
  const [qiBaselineReads, setQiBaselineReads] = useState('');
  const [qiBaselineExec, setQiBaselineExec] = useState('');
  const [qi30Reads, setQi30Reads] = useState('');
  const [qi30Exec, setQi30Exec] = useState('');
  const [qi60Reads, setQi60Reads] = useState('');
  const [qi60Exec, setQi60Exec] = useState('');

  const load = useCallback(async () => {
    setError(null);
    try {
      const res = await fetchWithAuth<{ control: EmailCutoverControlDto }>(
        user,
        '/api/metaadmingeral/automation/cutover/email',
      );
      setControl(res.control);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar cutover control');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
    const interval = setInterval(() => void load(), REFRESH_MS);
    return () => clearInterval(interval);
  }, [load]);

  const session = control?.session;
  const metodo = control?.organizations.find((o) => o.organizationId === TARGET_ORG);

  const allChecks = useMemo(
    () => [...(session?.preflightChecks ?? metodo?.preflightChecks ?? []), ...(session?.extendedChecks ?? [])],
    [session, metodo],
  );

  const criticalBlocked = useMemo(() => {
    const critical = new Set([
      'queue_populated',
      'processing_clear',
      'circuit_breaker',
      'transport_health',
      'clinica_remains_legacy',
      'cron_active',
      'failed_acceptable',
    ]);
    return allChecks.some((c) => critical.has(c.id) && !c.ok);
  }, [allChecks]);

  const qiDelta30 = useMemo(
    () =>
      computeQueryInsightsDelta(
        session?.externalQueryInsightsBaseline ?? null,
        session?.externalQueryInsights30m ?? null,
      ),
    [session],
  );

  const qiDelta60 = useMemo(
    () =>
      computeQueryInsightsDelta(
        session?.externalQueryInsightsBaseline ?? null,
        session?.externalQueryInsights60m ?? null,
      ),
    [session],
  );

  const runPrepare = async () => {
    setActionLoading('prepare');
    setError(null);
    try {
      const res = await fetchWithAuth<{ control: EmailCutoverControlDto }>(
        user,
        '/api/metaadmingeral/automation/cutover/email/prepare',
        {
          method: 'POST',
          body: JSON.stringify({
            organizationId: TARGET_ORG,
            externalQueryInsightsBaseline:
              qiBaselineReads || qiBaselineExec
                ? {
                    reads24h: qiBaselineReads ? Number(qiBaselineReads) : undefined,
                    executions24h: qiBaselineExec ? Number(qiBaselineExec) : undefined,
                  }
                : undefined,
          }),
        },
      );
      setControl(res.control);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao preparar cutover');
    } finally {
      setActionLoading(null);
    }
  };

  const runPromote = async () => {
    setActionLoading('promote');
    setError(null);
    try {
      const res = await fetchWithAuth<{ control: EmailCutoverControlDto }>(
        user,
        '/api/metaadmingeral/automation/cutover/email/promote',
        { method: 'POST', body: JSON.stringify({ organizationId: TARGET_ORG }) },
      );
      setControl(res.control);
      setShowPromoteConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao promover para queue');
    } finally {
      setActionLoading(null);
    }
  };

  const runRollback = async () => {
    setActionLoading('rollback');
    setError(null);
    try {
      const res = await fetchWithAuth<{ control: EmailCutoverControlDto }>(
        user,
        '/api/metaadmingeral/automation/cutover/email/rollback',
        {
          method: 'POST',
          body: JSON.stringify({
            organizationId: TARGET_ORG,
            reason: rollbackReason,
            reasonDetail: rollbackReason === 'outro' ? rollbackDetail : undefined,
          }),
        },
      );
      setControl(res.control);
      setShowRollbackConfirm(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro no rollback');
    } finally {
      setActionLoading(null);
    }
  };

  const saveQueryInsights = async (window: 'baseline' | '30m' | '60m') => {
    setActionLoading(`qi-${window}`);
    setError(null);
    const reads =
      window === 'baseline' ? qiBaselineReads
      : window === '30m' ? qi30Reads
      : qi60Reads;
    const exec =
      window === 'baseline' ? qiBaselineExec
      : window === '30m' ? qi30Exec
      : qi60Exec;
    try {
      const res = await fetchWithAuth<{ control: EmailCutoverControlDto }>(
        user,
        '/api/metaadmingeral/automation/cutover/email/query-insights',
        {
          method: 'POST',
          body: JSON.stringify({
            organizationId: TARGET_ORG,
            window,
            reads24h: reads ? Number(reads) : undefined,
            executions24h: exec ? Number(exec) : undefined,
          }),
        },
      );
      setControl(res.control);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar Query Insights');
    } finally {
      setActionLoading(null);
    }
  };

  if (loading && !control) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-[#E8EDED]/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Carregando Cutover Control…
      </div>
    );
  }

  return (
    <OpsSection title="Cutover Control — E-mail">
      {error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      ) : null}

      {session?.alerts && session.alerts.length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {session.alerts.map((a) => (
            <div
              key={a.id}
              className={`rounded-xl border px-4 py-3 ${
                a.severity === 'critical'
                  ? 'border-red-500/30 bg-red-500/10'
                  : 'border-amber-500/25 bg-amber-500/10'
              }`}
            >
              <p className="text-sm font-medium text-[#E8EDED]">{a.title}</p>
              <p className="mt-1 text-xs text-[#E8EDED]/65">{a.message}</p>
              {a.recommendation ? (
                <p className="mt-2 text-xs text-[#4CCB7A]/90">{a.recommendation}</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <OpsPanel className="p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-[#E8EDED]">Sessão de cutover</p>
            <p className="text-xs text-[#E8EDED]/55 mt-0.5">{statusLabel(session?.status)}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {control?.canPrepare && metodo?.engine === 'legacy' && (!session || session.status === 'ROLLED_BACK') ? (
              <button
                type="button"
                disabled={actionLoading === 'prepare'}
                onClick={() => void runPrepare()}
                className="inline-flex items-center gap-2 rounded-xl bg-sky-500/20 px-4 py-2 text-sm font-medium text-sky-200 hover:bg-sky-500/30 disabled:opacity-50"
              >
                {actionLoading === 'prepare' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                Preparar cutover
              </button>
            ) : null}
            {control?.canPromote ? (
              <button
                type="button"
                disabled={actionLoading === 'promote' || criticalBlocked}
                onClick={() => setShowPromoteConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl bg-[#4CCB7A]/25 px-4 py-2 text-sm font-medium text-[#4CCB7A] hover:bg-[#4CCB7A]/35 disabled:opacity-50"
              >
                <ArrowRightLeft className="h-4 w-4" />
                Promover Método Emagrecer para Queue
              </button>
            ) : null}
            {control?.canRollback ? (
              <button
                type="button"
                onClick={() => setShowRollbackConfirm(true)}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-2 text-sm font-medium text-amber-200 hover:bg-amber-500/20"
              >
                <RotateCcw className="h-4 w-4" />
                Rollback para Legacy
              </button>
            ) : null}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                {[
                  'Organização',
                  'Engine',
                  'Fila',
                  'Pending',
                  'Due',
                  'Processing',
                  'Failed',
                  'Circuit',
                  'Último cron',
                  'Transport',
                  'Pré-flight',
                ].map((h) => (
                  <th key={h} className="px-3 py-2 font-medium whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(control?.organizations ?? []).map((org) => (
                <tr key={org.organizationId} className="border-b border-white/5">
                  <td className="px-3 py-2">
                    <div className="text-[#E8EDED]">{org.organizationName}</div>
                    <div className="text-xs text-[#E8EDED]/40">{org.organizationId}</div>
                  </td>
                  <td className="px-3 py-2">
                    <OpsEngineBadge engine={org.engine} />
                  </td>
                  <td className="px-3 py-2">{org.queuePopulated ? 'Sim' : 'Não'}</td>
                  <td className="px-3 py-2">{org.pending}</td>
                  <td className="px-3 py-2">{org.dueNow}</td>
                  <td className="px-3 py-2">{org.processing}</td>
                  <td className="px-3 py-2">{org.failed}</td>
                  <td className="px-3 py-2">
                    {org.circuitOpen ? (
                      <span className="text-red-300">Aberto</span>
                    ) : (
                      <span className="text-[#4CCB7A]">Fechado</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-xs">{formatDateTime(org.lastCronAt)}</td>
                  <td className="px-3 py-2 text-xs">{org.transportHealth.lastKnownStatus ?? '—'}</td>
                  <td className="px-3 py-2">
                    {org.organizationId === TARGET_ORG ? (
                      org.preflightOk ? (
                        <span className="text-[#4CCB7A]">OK</span>
                      ) : (
                        <span className="text-amber-300">Bloqueado</span>
                      )
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allChecks.length > 0 ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium text-[#E8EDED]">Checklist pré-flight</p>
              <div className="space-y-1">
                {allChecks.map((c) => (
                  <CutoverChecklistRow key={c.id} ok={c.ok} label={PREFLIGHT_LABELS[c.id] ?? c.detail} />
                ))}
              </div>
              {criticalBlocked ? (
                <p className="mt-2 text-xs text-red-300">
                  Item crítico falhou — botão de cutover bloqueado até correção.
                </p>
              ) : null}
            </div>

            {session ? (
              <div>
                <p className="mb-2 text-sm font-medium text-[#E8EDED]">Observação de ciclos legacy</p>
                {[1, 2].map((n) => {
                  const cycle = session.legacyCycles.find((c) => c.cycleNumber === n);
                  return (
                    <div key={n} className="mb-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                      <div className="flex items-center gap-2 text-sm">
                        {cycle ? (
                          <CheckCircle2 className="h-4 w-4 text-[#4CCB7A]" />
                        ) : (
                          <Loader2 className="h-4 w-4 animate-spin text-[#E8EDED]/40" />
                        )}
                        <span>Ciclo {n}</span>
                        <span className="text-[#E8EDED]/50">{cycle ? 'concluído' : 'aguardando cron'}</span>
                      </div>
                      {cycle ? (
                        <p className="mt-1 text-xs text-[#E8EDED]/55">
                          reads={cycle.readsEstimated} · email_envios queries={cycle.emailEnviosQueries} · docs=
                          {cycle.emailEnviosDocsLidos} · {formatMs(cycle.durationMs)} · sent={cycle.sent} failed=
                          {cycle.failed}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                {session.status === 'MONITORING_QUEUE' ? (
                  <>
                    <p className="mb-2 mt-4 text-sm font-medium text-[#E8EDED]">Ciclos queue pós-cutover</p>
                    {[1, 2].map((n) => {
                      const cycle = session.queueCycles.find((c) => c.cycleNumber === n);
                      return (
                        <div key={n} className="mb-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
                          <div className="flex items-center gap-2 text-sm">
                            {cycle ? (
                              <CheckCircle2 className="h-4 w-4 text-[#4CCB7A]" />
                            ) : (
                              <Loader2 className="h-4 w-4 animate-spin text-[#E8EDED]/40" />
                            )}
                            <span>Ciclo queue {n}</span>
                          </div>
                          {cycle ? (
                            <p className="mt-1 text-xs text-[#E8EDED]/55">
                              email_envios queries={cycle.emailEnviosQueries} (meta: 0) · docs=
                              {cycle.emailEnviosDocsLidos} · reads={cycle.readsEstimated}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {session?.isolationRows && session.isolationRows.length > 0 ? (
          <div>
            <p className="mb-2 text-sm font-medium text-[#E8EDED]">Isolamento multi-organização</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {session.isolationRows.map((row) => (
                <div
                  key={row.organizationId}
                  className={`rounded-xl border px-4 py-3 ${
                    row.ok ? 'border-[#4CCB7A]/25 bg-[#4CCB7A]/5' : 'border-red-500/30 bg-red-500/10'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#E8EDED]">{row.organizationName}</span>
                    <OpsEngineBadge engine={row.engine} />
                  </div>
                  <p className="mt-1 text-xs text-[#E8EDED]/55">
                    Último ciclo: {row.lastCycleStatus ?? '—'} · {formatDateTime(row.lastCycleAt)}
                  </p>
                  {!row.ok && session.isolationFailure ? (
                    <p className="mt-2 text-xs font-semibold text-red-300">
                      CRITICAL — MULTI-ORG ISOLATION FAILURE
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {session?.comparison ? (
          <div>
            <p className="mb-3 text-sm font-medium text-[#E8EDED]">Comparativo Legacy vs Queue</p>
            <div className="grid gap-4 lg:grid-cols-3">
              <OpsPanel className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-[#E8EDED]/45">Antes — Legacy</p>
                <p className="text-sm">Reads/run: {session.comparison.beforeLegacy.readsPerRun ?? '—'}</p>
                <p className="text-sm">
                  email_envios queries/run: {session.comparison.beforeLegacy.emailEnviosQueriesPerRun ?? '—'}
                </p>
                <p className="text-sm">
                  email_envios docs/run: {session.comparison.beforeLegacy.emailEnviosDocsLidosPerRun ?? '—'}
                </p>
                <p className="text-sm">Duration/run: {formatMs(session.comparison.beforeLegacy.durationPerRun)}</p>
              </OpsPanel>
              <OpsPanel className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-[#E8EDED]/45">Depois — Queue</p>
                <p className="text-sm">Reads/run: {session.comparison.afterQueue.readsPerRun ?? '—'}</p>
                <p className="text-sm">
                  email_envios queries/run: {session.comparison.afterQueue.emailEnviosQueriesPerRun ?? '—'}
                </p>
                <p className="text-sm">
                  email_envios docs/run: {session.comparison.afterQueue.emailEnviosDocsLidosPerRun ?? '—'}
                </p>
                <p className="text-sm">Duration/run: {formatMs(session.comparison.afterQueue.durationPerRun)}</p>
              </OpsPanel>
              <OpsPanel className="p-4 space-y-2">
                <p className="text-xs font-semibold uppercase text-[#4CCB7A]/70">Economia</p>
                <p className="text-sm">
                  Redução reads: {session.comparison.savings.readsReduction ?? '—'}
                  {session.comparison.savings.readsReductionPct != null
                    ? ` (${session.comparison.savings.readsReductionPct}%)`
                    : ''}
                </p>
                <p className="text-sm">
                  Redução duração: {formatMs(session.comparison.savings.durationReductionMs)}
                  {session.comparison.savings.durationReductionPct != null
                    ? ` (${session.comparison.savings.durationReductionPct}%)`
                    : ''}
                </p>
              </OpsPanel>
            </div>
            <p className="mt-2 text-xs text-[#E8EDED]/45">
              Critério de sucesso: para metodo em queue, emailEnviosQueries = 0 e emailEnviosDocsLidos = 0 no motor
              de decisão do Automation Engine (ledger pode continuar com outras leituras legítimas).
            </p>
          </div>
        ) : null}
      </OpsPanel>

      <OpsPanel className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <Cloud className="mt-0.5 h-5 w-5 text-sky-300" />
          <div>
            <p className="text-sm font-semibold text-[#E8EDED]">Confirmação externa no Google Cloud</p>
            <p className="mt-1 text-xs text-[#E8EDED]/60">
              Firestore → Query Insights · Consulta monitorada:{' '}
              <code className="text-[#E8EDED]/80">COLLECTION /email_envios WHERE leadId = ? AND emailTipo IN [...]</code>
            </p>
            <p className="mt-2 text-xs text-[#E8EDED]/50">
              Baseline observado anteriormente: ~21–23 milhões reads/24h · ~11 mil execuções/24h. Após o cutover, a
              janela acumulada não cai imediatamente — o que deve cair é a velocidade de crescimento.
            </p>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {(
            [
              { window: 'baseline' as const, label: 'Baseline (opcional)', reads: qiBaselineReads, exec: qiBaselineExec, saved: session?.externalQueryInsightsBaseline },
              { window: '30m' as const, label: '30 min após cutover', reads: qi30Reads, exec: qi30Exec, saved: session?.externalQueryInsights30m, delta: qiDelta30 },
              { window: '60m' as const, label: '60 min após cutover', reads: qi60Reads, exec: qi60Exec, saved: session?.externalQueryInsights60m, delta: qiDelta60 },
            ] as const
          ).map((block) => (
            <div key={block.window} className="rounded-xl border border-white/10 bg-black/20 p-4 space-y-2">
              <p className="text-xs font-semibold text-[#E8EDED]/70">{block.label}</p>
              {block.saved ? (
                <p className="text-xs text-[#E8EDED]/55">
                  Salvo: reads={block.saved.reads24h ?? '—'} exec={block.saved.executions24h ?? '—'} ·{' '}
                  {formatDateTime(block.saved.capturedAt)}
                </p>
              ) : null}
              {'delta' in block && block.delta && block.delta.readsDelta != null ? (
                <p className="text-xs text-[#4CCB7A]/80">
                  Δ reads: {block.delta.readsDelta} · Δ exec: {block.delta.executionsDelta ?? '—'}
                </p>
              ) : null}
              <input
                type="number"
                placeholder="reads (24h janela)"
                value={block.window === 'baseline' ? qiBaselineReads : block.window === '30m' ? qi30Reads : qi60Reads}
                onChange={(e) => {
                  if (block.window === 'baseline') setQiBaselineReads(e.target.value);
                  else if (block.window === '30m') setQi30Reads(e.target.value);
                  else setQi60Reads(e.target.value);
                }}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED]"
              />
              <input
                type="number"
                placeholder="executions (24h janela)"
                value={block.window === 'baseline' ? qiBaselineExec : block.window === '30m' ? qi30Exec : qi60Exec}
                onChange={(e) => {
                  if (block.window === 'baseline') setQiBaselineExec(e.target.value);
                  else if (block.window === '30m') setQi30Exec(e.target.value);
                  else setQi60Exec(e.target.value);
                }}
                className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED]"
              />
              <button
                type="button"
                disabled={actionLoading === `qi-${block.window}`}
                onClick={() => void saveQueryInsights(block.window)}
                className="w-full rounded-lg bg-white/10 py-2 text-xs font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
              >
                {actionLoading === `qi-${block.window}` ? 'Salvando…' : 'Registrar'}
              </button>
            </div>
          ))}
        </div>
      </OpsPanel>

      {control?.timeline && control.timeline.length > 0 ? (
        <OpsPanel>
          <p className="border-b border-white/10 px-4 py-3 text-sm font-medium text-[#E8EDED]">Timeline do cutover</p>
          <div className="max-h-64 overflow-y-auto divide-y divide-white/5">
            {control.timeline.map((ev) => (
              <div key={ev.id} className="px-4 py-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm text-[#E8EDED]">{ev.title}</p>
                  <span className="text-xs text-[#E8EDED]/40">{formatDateTime(ev.at)}</span>
                </div>
                {ev.detail ? <p className="mt-0.5 text-xs text-[#E8EDED]/50">{ev.detail}</p> : null}
                <p className="mt-0.5 text-[10px] uppercase tracking-wide text-[#E8EDED]/30">{ev.type}</p>
              </div>
            ))}
          </div>
        </OpsPanel>
      ) : null}

      {showPromoteConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-6 shadow-2xl">
            <Shield className="h-8 w-8 text-[#4CCB7A] mb-3" />
            <h3 className="text-lg font-semibold text-[#E8EDED]">Confirmar cutover</h3>
            <p className="mt-3 text-sm text-[#E8EDED]/70">
              Você está prestes a alterar somente a organização Método Emagrecer de Legacy para Queue.
            </p>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              A Clínica Exemplo WL continuará em Legacy. O rollback permanecerá disponível sem deploy.
            </p>
            <p className="mt-2 text-sm font-medium text-[#E8EDED]">Deseja continuar?</p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowPromoteConfirm(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading === 'promote'}
                onClick={() => void runPromote()}
                className="rounded-xl bg-[#4CCB7A]/25 px-4 py-2 text-sm font-medium text-[#4CCB7A] disabled:opacity-50"
              >
                {actionLoading === 'promote' ? 'Promovendo…' : 'Confirmar cutover'}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showRollbackConfirm ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#0A1F44] p-6 shadow-2xl">
            <AlertTriangle className="h-8 w-8 text-amber-300 mb-3" />
            <h3 className="text-lg font-semibold text-[#E8EDED]">Confirmar rollback</h3>
            <p className="mt-2 text-sm text-[#E8EDED]/70">
              Reverter Método Emagrecer para Legacy. Rollback permitido mesmo com pré-flight falhando.
            </p>
            <label className="mt-4 block text-xs text-[#E8EDED]/55">Motivo</label>
            <select
              value={rollbackReason}
              onChange={(e) => setRollbackReason(e.target.value as EmailCutoverRollbackReason)}
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED]"
            >
              {EMAIL_CUTOVER_ROLLBACK_REASONS.map((r) => (
                <option key={r} value={r}>
                  {ROLLBACK_LABELS[r]}
                </option>
              ))}
            </select>
            {rollbackReason === 'outro' ? (
              <input
                type="text"
                placeholder="Detalhe do motivo"
                value={rollbackDetail}
                onChange={(e) => setRollbackDetail(e.target.value)}
                className="mt-2 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[#E8EDED]"
              />
            ) : null}
            <div className="mt-6 flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setShowRollbackConfirm(false)}
                className="rounded-xl border border-white/15 px-4 py-2 text-sm text-[#E8EDED]/70"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={actionLoading === 'rollback'}
                onClick={() => void runRollback()}
                className="rounded-xl bg-amber-500/20 px-4 py-2 text-sm font-medium text-amber-200 disabled:opacity-50"
              >
                {actionLoading === 'rollback' ? 'Revertendo…' : 'Confirmar rollback'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </OpsSection>
  );
}

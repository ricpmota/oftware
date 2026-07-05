'use client';

import { useCallback, useState } from 'react';
import type { User } from 'firebase/auth';
import { AlertTriangle, Database, Play, Search } from 'lucide-react';
import {
  ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE,
} from '@/lib/migrations/organizationBackfillConstants';
import type { MigrationDryRunReport, MigrationExecuteReport } from '@/lib/migrations/types';

type OrganizationBackfillPanelProps = {
  user: User;
  documentsWithoutOrganizationId?: number;
  onExecuteComplete?: () => void;
};

type ExecuteApiResponse = {
  report: MigrationExecuteReport | null;
  message: string;
  error?: string;
};

export default function OrganizationBackfillPanel({
  user,
  documentsWithoutOrganizationId,
  onExecuteComplete,
}: OrganizationBackfillPanelProps) {
  const [dryRunReport, setDryRunReport] = useState<MigrationDryRunReport | null>(null);
  const [executeResult, setExecuteResult] = useState<ExecuteApiResponse | null>(null);
  const [confirmation, setConfirmation] = useState('');
  const [dryRunning, setDryRunning] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [error, setError] = useState('');

  const confirmationOk = confirmation.trim() === ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE;

  const runDryRun = useCallback(async () => {
    setDryRunning(true);
    setError('');
    setExecuteResult(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/migrations/organization-backfill/dry-run', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Falha no dry-run');
      setDryRunReport(data as MigrationDryRunReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro no dry-run');
      setDryRunReport(null);
    } finally {
      setDryRunning(false);
    }
  }, [user]);

  const runExecute = useCallback(async () => {
    if (!confirmationOk || !dryRunReport) return;
    setExecuting(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/migrations/organization-backfill/execute', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ confirmation: confirmation.trim() }),
      });
      const data = (await res.json()) as ExecuteApiResponse & { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha na execução');
      setExecuteResult(data);
      onExecuteComplete?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro na execução');
    } finally {
      setExecuting(false);
    }
  }, [confirmation, confirmationOk, dryRunReport, onExecuteComplete, user]);

  const pendingCount =
    dryRunReport?.totals.wouldUpdate ?? documentsWithoutOrganizationId ?? null;

  return (
    <section className="space-y-4 rounded-2xl border border-amber-500/20 bg-amber-500/[0.04] p-5">
      <div className="flex items-start gap-3">
        <Database className="mt-0.5 h-5 w-5 shrink-0 text-amber-300" />
        <div>
          <h3 className="text-lg font-semibold text-[#E8EDED]">Organization Backfill</h3>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Adiciona{' '}
            <span className="font-mono text-[#4CCB7A]">organizationId: &quot;metodo&quot;</span> em
            documentos legados. Idempotente — não sobrescreve valores existentes.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">
            Sem organizationId
          </p>
          <p className="mt-2 text-2xl font-bold text-amber-300">
            {pendingCount != null ? pendingCount : '—'}
          </p>
          {dryRunReport ? (
            <p className="mt-1 text-xs text-[#E8EDED]/50">{dryRunReport.message}</p>
          ) : (
            <p className="mt-1 text-xs text-[#E8EDED]/50">Rode o dry-run para quantidade exata</p>
          )}
        </div>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void runDryRun()}
          disabled={dryRunning || executing}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
        >
          <Search className={`h-4 w-4 ${dryRunning ? 'animate-pulse' : ''}`} />
          {dryRunning ? 'Rodando dry-run…' : 'Rodar Dry Run'}
        </button>
      </div>

      {dryRunReport ? (
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                <th className="px-4 py-2 font-medium">Coleção</th>
                <th className="px-4 py-2 font-medium">Seriam atualizados</th>
              </tr>
            </thead>
            <tbody>
              {dryRunReport.collections
                .filter((c) => (c.wouldUpdate ?? 0) > 0)
                .map((c) => (
                  <tr key={c.collection} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 text-[#E8EDED]/85">{c.collection}</td>
                    <td className="px-4 py-2 text-amber-200">{c.wouldUpdate ?? 0}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : null}

      <div className="space-y-3 border-t border-white/10 pt-4">
        <label className="block text-sm text-[#E8EDED]/70">
          Confirmação (digite exatamente{' '}
          <span className="font-mono text-[#4CCB7A]">{ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE}</span>
          ):
        </label>
        <input
          type="text"
          value={confirmation}
          onChange={(e) => setConfirmation(e.target.value)}
          disabled={executing}
          placeholder={ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE}
          className="w-full max-w-md rounded-lg border border-white/15 bg-[#0A1F44]/80 px-3 py-2 text-sm text-[#E8EDED] placeholder:text-[#E8EDED]/30 focus:border-[#4CCB7A]/50 focus:outline-none"
          autoComplete="off"
          spellCheck={false}
        />
        <button
          type="button"
          onClick={() => void runExecute()}
          disabled={!dryRunReport || !confirmationOk || executing || dryRunning}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-500/40 bg-amber-500/20 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-500/30 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          {executing ? 'Executando backfill…' : 'Executar Backfill'}
        </button>
        {!dryRunReport ? (
          <p className="text-xs text-[#E8EDED]/45">Execute o dry-run antes de habilitar a migração.</p>
        ) : (
          <p className="text-xs text-[#E8EDED]/45">
            A execução pode levar 1–3 minutos. Não feche a aba.
          </p>
        )}
      </div>

      {executeResult?.report ? (
        <div className="space-y-3 border-t border-[#4CCB7A]/20 pt-4">
          <p className="text-sm font-medium text-[#4CCB7A]">{executeResult.message}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-[#E8EDED]/50">Atualizados</p>
              <p className="text-xl font-bold text-[#4CCB7A]">
                {executeResult.report.totals.documentsUpdated}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-[#E8EDED]/50">Ignorados</p>
              <p className="text-xl font-bold text-[#E8EDED]">
                {executeResult.report.totals.documentsIgnored}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-[#E8EDED]/50">Outra organização</p>
              <p className="text-xl font-bold text-[#E8EDED]">
                {executeResult.report.totals.documentsWithOtherOrganizationId}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
              <p className="text-xs text-[#E8EDED]/50">Erros</p>
              <p className="text-xl font-bold text-[#E8EDED]">{executeResult.report.totals.errors}</p>
            </div>
          </div>
          <p className="text-xs text-[#E8EDED]/40">
            Tempo total: {Math.round(executeResult.report.durationMs / 1000)}s · concluído em{' '}
            {new Date(executeResult.report.finishedAt).toLocaleString('pt-BR')}
          </p>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-white/5">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
                  <th className="px-4 py-2 font-medium">Coleção</th>
                  <th className="px-4 py-2 font-medium">Atualizados</th>
                  <th className="px-4 py-2 font-medium">Ignorados</th>
                  <th className="px-4 py-2 font-medium">Outra org</th>
                  <th className="px-4 py-2 font-medium">Erros</th>
                </tr>
              </thead>
              <tbody>
                {executeResult.report.collections.map((row) => (
                  <tr key={row.collection} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-2 text-[#E8EDED]/85">{row.collection}</td>
                    <td className="px-4 py-2 text-[#4CCB7A]">{row.documentsUpdated}</td>
                    <td className="px-4 py-2">{row.documentsIgnored}</td>
                    <td className="px-4 py-2">{row.documentsWithOtherOrganizationId}</td>
                    <td className="px-4 py-2">{row.errors.length}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {executeResult && !executeResult.report ? (
        <p className="text-sm text-[#E8EDED]/70">{executeResult.message}</p>
      ) : null}
    </section>
  );
}

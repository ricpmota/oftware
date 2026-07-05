'use client';

import { useCallback, useEffect, useState } from 'react';
import type { User } from 'firebase/auth';
import { RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';
import type { PlatformHealthReport } from '@/lib/platform-audit/types';
import OrganizationBackfillPanel from '@/components/metaadmingeral/OrganizationBackfillPanel';

type PlatformHealthAuditPanelProps = {
  user: User;
};

function MetricCard({
  label,
  value,
  hint,
  tone = 'default',
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: 'default' | 'warn' | 'ok';
}) {
  const valueClass =
    tone === 'warn'
      ? 'text-amber-300'
      : tone === 'ok'
        ? 'text-[#4CCB7A]'
        : 'text-[#E8EDED]';

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-[#E8EDED]/50">{label}</p>
      <p className={`mt-2 text-2xl font-bold ${valueClass}`}>{value}</p>
      {hint ? <p className="mt-1 text-xs text-[#E8EDED]/50">{hint}</p> : null}
    </div>
  );
}

function SectionTable({
  title,
  headers,
  rows,
}: {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
      <div className="border-b border-white/10 px-4 py-3">
        <h3 className="text-sm font-semibold text-[#E8EDED]">{title}</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-white/10 text-left text-[#E8EDED]/50">
              {headers.map((h) => (
                <th key={h} className="px-4 py-2 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b border-white/5 last:border-0">
                {row.map((cell, j) => (
                  <td key={j} className="px-4 py-2 text-[#E8EDED]/85">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function PlatformHealthAuditPanel({ user }: PlatformHealthAuditPanelProps) {
  const [report, setReport] = useState<PlatformHealthReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/metaadmingeral/audit/platform-health', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao carregar auditoria');
      }
      setReport(data as PlatformHealthReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro desconhecido');
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-[#22C55E]" />
            <h2 className="text-2xl font-bold text-[#E8EDED]">Saúde da Plataforma</h2>
          </div>
          <p className="mt-1 text-sm text-[#E8EDED]/60">
            Auditoria somente leitura — nenhum dado é alterado
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm font-medium text-[#E8EDED] hover:bg-white/15 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      {loading && !report ? (
        <div className="flex justify-center py-16">
          <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-[#22C55E]" />
        </div>
      ) : null}

      {report ? (
        <>
          <p className="text-xs text-[#E8EDED]/40">
            Gerado em {new Date(report.generatedAt).toLocaleString('pt-BR')} ·{' '}
            {Math.round(report.durationMs / 1000)}s · org alvo: {report.organizationId}
          </p>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Auditoria de Organização</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard label="Documentos verificados" value={report.organization.totalDocuments} />
              <MetricCard
                label="Cobertura metodo"
                value={`${report.organization.coveragePercent}%`}
                tone={report.organization.coveragePercent >= 95 ? 'ok' : 'warn'}
              />
              <MetricCard
                label="Sem organizationId"
                value={report.organization.withoutOrganizationId}
                tone={report.organization.withoutOrganizationId > 0 ? 'warn' : 'ok'}
              />
              <MetricCard
                label="Outra organização"
                value={report.organization.withOtherOrganizationId}
                tone={report.organization.withOtherOrganizationId > 0 ? 'warn' : 'default'}
              />
            </div>
            <SectionTable
              title="Por coleção"
              headers={['Coleção', 'Total', 'Com org', 'Sem org', 'Outra org']}
              rows={report.organization.collections.map((c) => [
                c.collection,
                c.total,
                c.withOrganizationId,
                c.withoutOrganizationId,
                c.withOtherOrganizationId,
              ])}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Auditoria de Pacientes</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard label="Total" value={report.patients.total} />
              <MetricCard label="Sem médico responsável" value={report.patients.withoutMedicoResponsavelId} />
              <MetricCard label="Médico válido" value={report.patients.withValidMedicoResponsavelId} tone="ok" />
              <MetricCard
                label="Médico inexistente"
                value={report.patients.withInvalidMedicoResponsavelId}
                tone={report.patients.withInvalidMedicoResponsavelId > 0 ? 'warn' : 'default'}
              />
              <MetricCard
                label="Sem userId"
                value={report.patients.withoutUserId}
                tone={report.patients.withoutUserId > 0 ? 'warn' : 'default'}
              />
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Auditoria de Equipe</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <MetricCard
                label="Profissionais sem org"
                value={report.team.professionalsWithoutOrganizationId}
                tone={report.team.professionalsWithoutOrganizationId > 0 ? 'warn' : 'ok'}
              />
              <MetricCard label="Vínculos médico ↔ nutri" value={report.team.medicoNutriVinculos} />
              <MetricCard label="Vínculos médico ↔ personal" value={report.team.medicoPersonalVinculos} />
            </div>
            <SectionTable
              title="Membros da equipe"
              headers={['Tipo', 'Total', 'Sem organizationId']}
              rows={report.team.members.map((m) => [m.label, m.total, m.withoutOrganizationId])}
            />
          </section>

          <section className="space-y-3">
            <h3 className="text-lg font-semibold text-[#E8EDED]">Auditoria de Links Públicos</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard label="Total de links" value={report.publicLinks.total} />
              <MetricCard
                label="Sem organizationId"
                value={report.publicLinks.withoutOrganizationId}
                tone={report.publicLinks.withoutOrganizationId > 0 ? 'warn' : 'ok'}
              />
            </div>
            <SectionTable
              title="Por coleção"
              headers={['Coleção', 'Total', 'Sem organizationId']}
              rows={report.publicLinks.collections.map((c) => [
                c.collection,
                c.total,
                c.withoutOrganizationId,
              ])}
            />
          </section>

          <OrganizationBackfillPanel
            user={user}
            documentsWithoutOrganizationId={report.organization.withoutOrganizationId}
            onExecuteComplete={() => void load()}
          />
        </>
      ) : null}
    </div>
  );
}

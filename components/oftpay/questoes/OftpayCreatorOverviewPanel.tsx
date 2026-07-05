'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  buildApostilaQuestoesOverviews,
  computeApostilaOverviewTotals,
  countQuestoesPublicadasForTopic,
  listAllApostilaTopics,
} from '@/services/oftreviewApostilaTopicService';
import { listOftreviewContent } from '@/services/oftreviewContentService';
import type { OftpayQuestaoDoc } from '@/services/oftpayQuestoesService';
import {
  TOPIC_STATUS_BADGE,
  TOPIC_STATUS_LABEL,
  type ApostilaQuestoesOverview,
} from '@/types/oftreviewApostilaTopic';
import {
  AlertCircle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  FileText,
  Layers,
  Loader2,
  RefreshCw,
} from 'lucide-react';

interface OftpayCreatorOverviewPanelProps {
  userEmail: string;
  adminQuestoes: OftpayQuestaoDoc[];
}

function coverageBarColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500';
  if (percent >= 50) return 'bg-blue-500';
  if (percent > 0) return 'bg-amber-500';
  return 'bg-gray-200';
}

function formatPages(pages?: number[]): string {
  if (!pages?.length) return '—';
  if (pages.length <= 5) return pages.join(', ');
  return `${pages[0]}–${pages[pages.length - 1]} (${pages.length} p.)`;
}

export default function OftpayCreatorOverviewPanel({
  userEmail,
  adminQuestoes,
}: OftpayCreatorOverviewPanelProps) {
  const [rows, setRows] = useState<ApostilaQuestoesOverview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedAp, setExpandedAp] = useState<string | null>(null);
  const [filter, setFilter] = useState<'todas' | 'mapeadas' | 'pendentes'>('mapeadas');

  const loadOverview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [topics, contentList, apostilasRes] = await Promise.all([
        listAllApostilaTopics(),
        listOftreviewContent(userEmail).catch(() => []),
        fetch('/api/oftpay/list-apostilas?courseId=oftreview').then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) return [] as string[];
          const list = Array.isArray(data.apostilas)
            ? (data.apostilas as { name?: string }[])
            : [];
          return list.map((a) => String(a.name ?? '').trim()).filter(Boolean);
        }),
      ]);

      const contentExtractedTitles = new Set(contentList.map((c) => c.apostilaTitulo.trim()));

      const overviews = buildApostilaQuestoesOverviews({
        apostilaTitulos: apostilasRes,
        topics,
        questoes: adminQuestoes,
        contentExtractedTitles,
      });

      setRows(overviews);
    } catch (e) {
      console.error('[criador-overview]', e);
      setRows([]);
      setError('Não foi possível carregar o levantamento. Tente atualizar.');
    } finally {
      setLoading(false);
    }
  }, [userEmail, adminQuestoes]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  const totals = useMemo(() => computeApostilaOverviewTotals(rows), [rows]);

  const filteredRows = useMemo(() => {
    if (filter === 'mapeadas') return rows.filter((r) => r.topicsMapped > 0);
    if (filter === 'pendentes') {
      return rows.filter(
        (r) => r.topicsMapped === 0 || r.coveragePercent < 100
      );
    }
    return rows;
  }, [rows, filter]);

  return (
    <section
      className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
      aria-labelledby="criador-overview-heading"
    >
      <div className="px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-slate-50 to-white flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <BarChart3 className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 id="criador-overview-heading" className="text-base font-semibold text-gray-900">
              Levantamento por apostila
            </h3>
            <p className="text-sm text-gray-600 mt-0.5">
              Tópicos mapeados, capacidade estimada e questões publicadas — visão geral para monitorar o
              banco.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void loadOverview()}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="mx-5 mt-4 flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 flex flex-col items-center gap-2 text-gray-500">
          <Loader2 className="w-7 h-7 animate-spin text-indigo-600" />
          <span className="text-sm">Carregando levantamento…</span>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 p-5 border-b border-gray-100">
            <StatCard label="Apostilas" value={totals.apostilas} sub={`${totals.apostilasComConteudo} com texto extraído`} />
            <StatCard label="Mapeadas" value={totals.apostilasMapeadas} sub="com tópicos IA" />
            <StatCard label="Tópicos" value={totals.topicsMapped} sub="no total" />
            <StatCard label="Capacidade" value={totals.totalCapacity} sub="questões possíveis" />
            <StatCard label="Publicadas" value={totals.questoesPublicadas} sub={`de ${totals.questoesTotal} cadastradas`} />
            <StatCard
              label="Cobertura"
              value={`${totals.coveragePercent}%`}
              sub="publicadas / capacidade"
              highlight
            />
          </div>

          <div className="px-5 py-3 flex flex-wrap items-center gap-2 border-b border-gray-100">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Filtrar</span>
            {(
              [
                ['todas', 'Todas'],
                ['mapeadas', 'Com tópicos'],
                ['pendentes', 'Pendentes'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setFilter(key)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === key
                    ? 'bg-indigo-100 text-indigo-800'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="text-xs text-gray-400 ml-auto">{filteredRows.length} apostila(s)</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <th className="px-5 py-3 w-8" />
                  <th className="px-3 py-3">Apostila</th>
                  <th className="px-3 py-3 text-center">Conteúdo</th>
                  <th className="px-3 py-3 text-center">Tópicos</th>
                  <th className="px-3 py-3 text-center">Capacidade</th>
                  <th className="px-3 py-3 text-center">Cadastradas</th>
                  <th className="px-3 py-3 text-center">Publicadas</th>
                  <th className="px-5 py-3 min-w-[140px]">Cobertura</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-gray-500">
                      Nenhuma apostila neste filtro.
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row) => {
                    const key = row.apostilaTitulo;
                    const isExpanded = expandedAp === key;
                    return (
                      <ApostilaOverviewRow
                        key={key}
                        row={row}
                        adminQuestoes={adminQuestoes}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedAp(isExpanded ? null : key)}
                      />
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  highlight,
}: {
  label: string;
  value: number | string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-3 py-2.5 ${
        highlight ? 'border-indigo-200 bg-indigo-50/60' : 'border-gray-100 bg-gray-50/50'
      }`}
    >
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-xl font-semibold tabular-nums ${highlight ? 'text-indigo-700' : 'text-gray-900'}`}>
        {value}
      </p>
      <p className="text-[11px] text-gray-400 mt-0.5 leading-tight">{sub}</p>
    </div>
  );
}

function ApostilaOverviewRow({
  row,
  adminQuestoes,
  isExpanded,
  onToggle,
}: {
  row: ApostilaQuestoesOverview;
  adminQuestoes: OftpayQuestaoDoc[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const barWidth = Math.min(100, row.coveragePercent);

  return (
    <>
      <tr className="hover:bg-gray-50/80">
        <td className="px-5 py-3">
          <button
            type="button"
            onClick={onToggle}
            disabled={row.topicsMapped === 0}
            className="p-0.5 rounded text-gray-400 hover:text-gray-700 disabled:opacity-30 disabled:cursor-default"
            aria-expanded={isExpanded}
            title={row.topicsMapped > 0 ? 'Ver tópicos' : 'Sem tópicos mapeados'}
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>
        </td>
        <td className="px-3 py-3 font-medium text-gray-900 max-w-[220px]">
          <span className="line-clamp-2" title={row.apostilaTitulo}>
            {row.apostilaTitulo}
          </span>
        </td>
        <td className="px-3 py-3 text-center">
          {row.hasContentExtracted ? (
            <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <FileText className="w-3 h-3" />
              Extraído
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>
        <td className="px-3 py-3 text-center tabular-nums">
          {row.topicsMapped > 0 ? (
            <span className="inline-flex items-center gap-1 text-gray-800">
              <Layers className="w-3.5 h-3.5 text-indigo-500" />
              {row.topicsMapped}
            </span>
          ) : (
            <span className="text-amber-600 text-xs font-medium">Não mapeada</span>
          )}
        </td>
        <td className="px-3 py-3 text-center tabular-nums text-gray-700">{row.totalCapacity || '—'}</td>
        <td className="px-3 py-3 text-center tabular-nums">
          <span className="text-gray-800">{row.questoesTotal}</span>
          {(row.questoesRascunho > 0 || row.questoesRevisao > 0) && (
            <span className="block text-[10px] text-gray-400">
              {row.questoesRascunho > 0 && `${row.questoesRascunho} rasc.`}
              {row.questoesRascunho > 0 && row.questoesRevisao > 0 && ' · '}
              {row.questoesRevisao > 0 && `${row.questoesRevisao} rev.`}
            </span>
          )}
        </td>
        <td className="px-3 py-3 text-center tabular-nums font-medium text-emerald-700">
          {row.questoesPublicadas}
        </td>
        <td className="px-5 py-3">
          <div className="flex items-center gap-2 min-w-[120px]">
            <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${coverageBarColor(row.coveragePercent)}`}
                style={{ width: `${barWidth}%` }}
              />
            </div>
            <span className="text-xs tabular-nums text-gray-600 w-10 text-right">
              {row.totalCapacity > 0 ? `${row.coveragePercent}%` : '—'}
            </span>
          </div>
        </td>
      </tr>
      {isExpanded && row.topics.length > 0 && (
        <tr className="bg-slate-50/80">
          <td colSpan={8} className="px-5 py-4">
            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="min-w-full text-xs">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="px-3 py-2 font-medium">Tópico</th>
                    <th className="px-3 py-2 font-medium text-center">Páginas</th>
                    <th className="px-3 py-2 font-medium text-center">Capacidade</th>
                    <th className="px-3 py-2 font-medium text-center">Geradas</th>
                    <th className="px-3 py-2 font-medium text-center">Publicadas</th>
                    <th className="px-3 py-2 font-medium text-center">Status</th>
                    <th className="px-3 py-2 font-medium min-w-[100px]">Cobertura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {row.topics.map((topic) => {
                    const publicadas = countQuestoesPublicadasForTopic(topic, adminQuestoes);
                    return (
                    <tr key={topic.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-gray-800 max-w-xs">
                        <span className="line-clamp-2" title={topic.topicTitle}>
                          {topic.topicTitle}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center text-gray-500 tabular-nums">
                        {formatPages(topic.pages)}
                      </td>
                      <td className="px-3 py-2 text-center tabular-nums">{topic.estimatedQuestionCapacity}</td>
                      <td className="px-3 py-2 text-center tabular-nums">{topic.generatedQuestionCount}</td>
                      <td className="px-3 py-2 text-center tabular-nums font-medium text-emerald-700">
                        {publicadas}
                      </td>
                      <td className="px-3 py-2 text-center">
                        <span
                          className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${TOPIC_STATUS_BADGE[topic.status]}`}
                        >
                          {TOPIC_STATUS_LABEL[topic.status]}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5">
                          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${coverageBarColor(topic.coveragePercent)}`}
                              style={{ width: `${Math.min(100, topic.coveragePercent)}%` }}
                            />
                          </div>
                          <span className="tabular-nums text-gray-500 w-8 text-right">
                            {topic.coveragePercent}%
                          </span>
                        </div>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

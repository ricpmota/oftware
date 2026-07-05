'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { RICARDO_MOTA_EMAIL } from '@/lib/instagram/instagramBioStatsConstants';
import type { InstagramBioStatsApiResponse, InstagramBioStatsProfileKey } from '@/types/instagramBioStats';

type Props = {
  open: boolean;
  onClose: () => void;
  medicoEmail?: string;
};

type DistributionRow = {
  key: InstagramBioStatsProfileKey;
  emoji: string;
  label: string;
  count: number;
  percent: number;
};

function KpiCard({
  emoji,
  label,
  value,
  suffix = '',
}: {
  emoji: string;
  label: string;
  value: string | number;
  suffix?: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/60 p-4">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
        {emoji} {label}
      </p>
      <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white tabular-nums">
        {value}
        {suffix}
      </p>
    </div>
  );
}

function buildDistribution(
  stats: InstagramBioStatsApiResponse,
  isRicardo: boolean,
): DistributionRow[] {
  const rows: Omit<DistributionRow, 'percent'>[] = [
    { key: 'emagrecer', emoji: '❤️', label: 'Quero Emagrecer', count: stats.byProfile.emagrecer },
    { key: 'nutricionista', emoji: '🥗', label: 'Nutricionista', count: stats.byProfile.nutricionista },
    { key: 'personal', emoji: '🏋️', label: 'Personal', count: stats.byProfile.personal },
    {
      key: 'fundador',
      emoji: '💬',
      label: isRicardo ? 'Falar com Dr. Ricardo' : 'Falar com Médico',
      count: stats.byProfile.fundador,
    },
  ];

  if (isRicardo) {
    rows.push({
      key: 'medico',
      emoji: '👨‍⚕️',
      label: 'Sou Médico',
      count: stats.byProfile.medico,
    });
  }

  const total = rows.reduce((sum, row) => sum + row.count, 0);
  return rows.map((row) => ({
    ...row,
    percent: total > 0 ? Math.round((row.count / total) * 100) : 0,
  }));
}

function MiniBarChart({ stats }: { stats: InstagramBioStatsApiResponse }) {
  const maxValue = Math.max(
    1,
    ...stats.chart.flatMap((point) => [point.views, point.clicks, point.whatsapp]),
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3 text-[11px] text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-sky-400" />
          Visualizações
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-violet-400" />
          Cliques
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-sm bg-emerald-400" />
          WhatsApps
        </span>
      </div>
      <div className="grid grid-cols-7 gap-2 items-end h-36">
        {stats.chart.map((point) => (
          <div key={point.date} className="flex flex-col items-center gap-1 min-w-0">
            <div className="flex items-end justify-center gap-0.5 h-24 w-full">
              <div
                className="w-1.5 rounded-t bg-sky-400/90"
                style={{ height: `${Math.max(4, (point.views / maxValue) * 100)}%` }}
                title={`${point.views} visualizações`}
              />
              <div
                className="w-1.5 rounded-t bg-violet-400/90"
                style={{ height: `${Math.max(4, (point.clicks / maxValue) * 100)}%` }}
                title={`${point.clicks} cliques`}
              />
              <div
                className="w-1.5 rounded-t bg-emerald-400/90"
                style={{ height: `${Math.max(4, (point.whatsapp / maxValue) * 100)}%` }}
                title={`${point.whatsapp} WhatsApps`}
              />
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-400">{point.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function InstagramBioStatsModal({ open, onClose, medicoEmail }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<InstagramBioStatsApiResponse | null>(null);

  const isRicardo = medicoEmail?.trim().toLowerCase() === RICARDO_MOTA_EMAIL;

  const loadStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const user = auth.currentUser;
      if (!user) throw new Error('Faça login novamente para ver o desempenho.');
      const token = await user.getIdToken();
      const res = await fetch('/api/instagram-bio/analytics', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const json = (await res.json()) as InstagramBioStatsApiResponse & { error?: string };
      if (!res.ok) throw new Error(json.error || 'Erro ao carregar estatísticas.');
      setStats(json);
    } catch (err) {
      setStats(null);
      setError(err instanceof Error ? err.message : 'Erro ao carregar estatísticas.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    void loadStats();
  }, [open, loadStats]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  const distribution = useMemo(
    () => (stats ? buildDistribution(stats, isRicardo) : []),
    [stats, isRicardo],
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-bio-stats-title"
        className="relative z-[101] flex max-h-[92dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 dark:border-gray-800 px-5 py-4 sm:px-6">
          <div>
            <h2 id="instagram-bio-stats-title" className="text-lg font-bold text-gray-900 dark:text-white">
              📊 Funil Digital
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Acompanhe o desempenho do seu Link da Bio.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 dark:border-gray-700 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-900"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto px-5 py-5 sm:px-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500 dark:text-gray-400">
              <Loader2 className="h-5 w-5 animate-spin" />
              Carregando métricas…
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : stats ? (
            <>
              <div>
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Últimos 7 dias
                </p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <KpiCard emoji="👁️" label="Visualizações" value={stats.last7Days.views.toLocaleString('pt-BR')} />
                  <KpiCard emoji="👆" label="Cliques" value={stats.last7Days.clicks.toLocaleString('pt-BR')} />
                  <KpiCard
                    emoji="💬"
                    label="Conversas iniciadas"
                    value={stats.last7Days.whatsappClicks.toLocaleString('pt-BR')}
                  />
                  <KpiCard
                    emoji="📈"
                    label="Taxa de Conversão"
                    value={stats.last7Days.conversionRate.toLocaleString('pt-BR')}
                    suffix="%"
                  />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Distribuição dos cliques
                </h3>
                <div className="space-y-2">
                  {distribution.map((row) => (
                    <div
                      key={row.key}
                      className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 px-4 py-3"
                    >
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium text-gray-800 dark:text-gray-100">
                          {row.emoji} {row.label}
                        </span>
                        <span className="tabular-nums text-gray-600 dark:text-gray-300">
                          {row.count.toLocaleString('pt-BR')} · {row.percent}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-200 dark:bg-gray-800 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${row.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
                  Últimos 7 dias
                </h3>
                <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/40 p-4">
                  <MiniBarChart stats={stats} />
                </div>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">Insights automáticos</h3>
                <ul className="space-y-2">
                  {stats.insights.map((insight) => (
                    <li
                      key={insight}
                      className="rounded-xl border border-emerald-100 dark:border-emerald-900/40 bg-emerald-50/70 dark:bg-emerald-950/20 px-4 py-3 text-sm text-emerald-900 dark:text-emerald-100"
                    >
                      {insight}
                    </li>
                  ))}
                </ul>
              </div>

              <p className="text-[11px] text-gray-400 dark:text-gray-500">
                Totais históricos: {stats.totals.views.toLocaleString('pt-BR')} visualizações ·{' '}
                {stats.totals.clicks.toLocaleString('pt-BR')} cliques ·{' '}
                {stats.totals.whatsappClicks.toLocaleString('pt-BR')} conversas.
              </p>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}

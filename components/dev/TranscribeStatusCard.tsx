'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Play, Pause, RefreshCw, Loader2, ChevronDown, ChevronRight } from 'lucide-react';

interface Progress {
  total: number;
  done: number;
  running: number;
  queued: number;
  skipped: number;
  failed: number;
}

interface SubjectStats {
  total: number;
  done: number;
  running: number;
  queued: number;
  failed: number;
  skipped: number;
  percent: number;
}

interface ManifestItem {
  objectName: string;
  status: string;
  error?: { message?: string };
}

interface StatusResponse {
  ok?: boolean;
  batchId?: string;
  progress?: Progress;
  done?: boolean;
  bySubject?: Record<string, SubjectStats>;
  runningPreview?: Array<{ objectName: string; subject: string; state: string }>;
  failedPreview?: Array<{ objectName: string; subject: string; errorMessage: string }>;
  itemsBySubject?: Record<string, ManifestItem[]>;
  error?: string;
}

function getVideoTitle(objectName: string): string {
  const name = objectName.split('/').pop() || objectName;
  const ext = name.lastIndexOf('.');
  return ext > 0 ? name.slice(0, ext) : name;
}

interface TranscribeStatusCardProps {
  batchId: string;
  onBatchIdChange?: (id: string) => void;
}

export default function TranscribeStatusCard({ batchId: propBatchId, onBatchIdChange }: TranscribeStatusCardProps) {
  const [batchId, setBatchId] = useState(propBatchId);
  const [status, setStatus] = useState<StatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoMode, setAutoMode] = useState(false);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (propBatchId) setBatchId(propBatchId);
  }, [propBatchId]);

  const fetchStatus = useCallback(async (signal?: AbortSignal): Promise<StatusResponse | null> => {
    if (!batchId.trim()) return null;
    const res = await fetch(
      `/api/transcribe-oftreview/status?batchId=${encodeURIComponent(batchId.trim())}`,
      { signal }
    );
    const data: StatusResponse = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || res.statusText || `HTTP ${res.status}`);
    return data;
  }, [batchId]);

  const fetchContinue = useCallback(
    async (maxToProcess: number, signal?: AbortSignal): Promise<void> => {
      if (!batchId.trim()) return;
      const res = await fetch('/api/transcribe-oftreview/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batchId: batchId.trim(), maxToProcess }),
        signal,
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error || res.statusText || `HTTP ${res.status}`);
    },
    [batchId]
  );

  const runTick = useCallback(async () => {
    if (!batchId.trim()) return;
    abortRef.current = new AbortController();
    const signal = abortRef.current.signal;
    try {
      const statusData = await fetchStatus(signal);
      if (!statusData?.ok) return;

      setStatus(statusData);
      setError(null);

      if (statusData.done) {
        setAutoMode(false);
        return;
      }

      const progress = statusData.progress;
      if (!progress) return;

      const { queued, running } = progress;
      if (queued > 0 && running < 2) {
        const toStart = Math.min(2 - running, queued, 2);
        await fetchContinue(toStart, signal);
        const updatedStatus = await fetchStatus(signal);
        if (updatedStatus?.ok) setStatus(updatedStatus);
      }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return;
      const msg = e instanceof Error ? e.message : 'Erro na operação';
      setError(msg);
      setAutoMode(false);
    }
  }, [batchId, fetchStatus, fetchContinue]);

  const handleRefresh = useCallback(async () => {
    if (!batchId.trim()) {
      setError('Informe o batchId');
      return;
    }
    setLoading(true);
    setError(null);
    abortRef.current = new AbortController();
    try {
      const data = await fetchStatus(abortRef.current.signal);
      if (data) setStatus(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro ao atualizar';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [batchId, fetchStatus]);

  useEffect(() => {
    if (!autoMode || !batchId.trim()) return;
    runTick();
    const interval = setInterval(runTick, 10000);
    return () => {
      clearInterval(interval);
      abortRef.current?.abort();
    };
  }, [autoMode, batchId, runTick]);

  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const toggleSubject = (subj: string) => {
    setExpandedSubjects((prev) => {
      const next = new Set(prev);
      if (next.has(subj)) next.delete(subj);
      else next.add(subj);
      return next;
    });
  };

  const progress = status?.progress;
  const percentTotal = progress && progress.total > 0
    ? Math.round(((progress.done + progress.skipped) / progress.total) * 100)
    : 0;

  return (
    <div className="bg-white shadow rounded-xl border border-blue-200 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-blue-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          Status de Transcrição
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Progresso em tempo real e modo automático (2 em 2)
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">BatchId</label>
          <input
            type="text"
            value={batchId}
            onChange={(e) => {
              setBatchId(e.target.value);
              onBatchIdChange?.(e.target.value);
            }}
            placeholder="Cole ou use o batchId do card acima"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-400 focus:border-blue-400"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            onClick={() => setAutoMode(true)}
            disabled={!batchId.trim() || autoMode || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Iniciar Auto
          </button>
          <button
            type="button"
            onClick={() => setAutoMode(false)}
            disabled={!autoMode}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            <Pause className="w-4 h-4" />
            Pausar
          </button>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={!batchId.trim() || loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Atualizar agora
          </button>
          {autoMode && (
            <span className="text-xs text-green-600 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Auto ativo (tick a cada 10s)
            </span>
          )}
        </div>

        {error && (
          <div
            className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700"
            role="alert"
          >
            {error}
          </div>
        )}

        {progress && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-7 gap-2 text-sm">
              <div className="px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-gray-500 block text-xs">Total</span>
                <span className="font-semibold">{progress.total}</span>
              </div>
              <div className="px-3 py-2 bg-green-50 rounded-lg">
                <span className="text-green-600 block text-xs">Done</span>
                <span className="font-semibold text-green-700">{progress.done}</span>
              </div>
              <div className="px-3 py-2 bg-blue-50 rounded-lg">
                <span className="text-blue-600 block text-xs">Running</span>
                <span className="font-semibold text-blue-700">{progress.running}</span>
              </div>
              <div className="px-3 py-2 bg-amber-50 rounded-lg">
                <span className="text-amber-600 block text-xs">Queued</span>
                <span className="font-semibold text-amber-700">{progress.queued}</span>
              </div>
              <div className="px-3 py-2 bg-gray-50 rounded-lg">
                <span className="text-gray-600 block text-xs">Skipped</span>
                <span className="font-semibold">{progress.skipped}</span>
              </div>
              <div className="px-3 py-2 bg-red-50 rounded-lg">
                <span className="text-red-600 block text-xs">Failed</span>
                <span className="font-semibold text-red-700">{progress.failed}</span>
              </div>
              <div className="px-3 py-2 bg-indigo-50 rounded-lg col-span-2 md:col-span-1">
                <span className="text-indigo-600 block text-xs">% Concluído</span>
                <span className="font-semibold text-indigo-700">{percentTotal}%</span>
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-indigo-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${percentTotal}%` }}
              />
            </div>
          </>
        )}

        {status?.bySubject && Object.keys(status.bySubject).length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Por Assunto</h4>
            <div className="space-y-2">
              {Object.entries(status.bySubject)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([subj, stats]) => (
                  <div key={subj} className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      type="button"
                      onClick={() => toggleSubject(subj)}
                      className="w-full px-3 py-2 flex items-center justify-between text-left hover:bg-gray-50"
                    >
                      <span className="flex items-center gap-2 text-sm font-medium">
                        {expandedSubjects.has(subj) ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {subj}
                      </span>
                      <span className="text-sm text-gray-500">
                        {stats.done + stats.skipped}/{stats.total} ({stats.percent}%)
                      </span>
                    </button>
                    <div className="w-full bg-gray-100 h-1.5">
                      <div
                        className="bg-indigo-500 h-1.5 transition-all"
                        style={{ width: `${stats.percent}%` }}
                      />
                    </div>
                    {expandedSubjects.has(subj) && status.itemsBySubject?.[subj] && (
                      <div className="px-3 py-2 bg-gray-50 border-t border-gray-200 text-xs space-y-1 max-h-40 overflow-auto">
                        {status.itemsBySubject[subj].map((item) => (
                          <div key={item.objectName} className="flex justify-between gap-2">
                            <span className="truncate">{getVideoTitle(item.objectName)}</span>
                            <span
                              className={`shrink-0 font-medium ${
                                item.status === 'done'
                                  ? 'text-green-600'
                                  : item.status === 'running'
                                    ? 'text-blue-600'
                                    : item.status === 'failed'
                                      ? 'text-red-600'
                                      : item.status === 'skipped'
                                        ? 'text-gray-500'
                                        : 'text-amber-600'
                              }`}
                            >
                              {item.status === 'running' ? 'em processamento…' : item.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          </div>
        )}

        {status?.runningPreview && status.runningPreview.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-2">Em andamento agora</h4>
            <ul className="space-y-1 text-sm">
              {status.runningPreview.map((r) => (
                <li key={r.objectName} className="flex justify-between gap-2 text-gray-600">
                  <span className="truncate">{getVideoTitle(r.objectName)}</span>
                  <span className="text-blue-600 shrink-0">({r.subject}) em processamento…</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {status?.failedPreview && status.failedPreview.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-red-600 mb-2">Falhas recentes</h4>
            <ul className="space-y-1 text-sm">
              {status.failedPreview.map((r) => (
                <li key={r.objectName} className="flex flex-col gap-0.5 text-gray-600">
                  <span className="truncate font-medium">{getVideoTitle(r.objectName)}</span>
                  <span className="text-xs text-red-600 truncate" title={r.errorMessage}>
                    {r.errorMessage}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!status && !loading && batchId.trim() && (
          <p className="text-sm text-gray-500">Clique em &quot;Atualizar agora&quot; ou &quot;Iniciar Auto&quot; para carregar.</p>
        )}
      </div>
    </div>
  );
}

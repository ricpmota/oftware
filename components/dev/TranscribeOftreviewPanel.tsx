'use client';

import { useState, useEffect } from 'react';
import { Play, RotateCcw, BarChart3, Loader2 } from 'lucide-react';

interface StartResponse {
  ok?: boolean;
  batchId?: string;
  totalFound?: number;
  queued?: number;
  skippedExisting?: number;
  manifestGcsUri?: string;
  error?: string;
}

interface ContinueResponse {
  ok?: boolean;
  batchId?: string;
  started?: number;
  skipped?: number;
  manifestGcsUri?: string;
  error?: string;
}

interface Progress {
  total?: number;
  done?: number;
  running?: number;
  queued?: number;
  skipped?: number;
  failed?: number;
}

interface StatusResponse {
  ok?: boolean;
  batchId?: string;
  progress?: Progress;
  done?: boolean;
  manifestGcsUri?: string;
  samplePreview?: string;
  error?: string;
}

interface TranscribeOftreviewPanelProps {
  batchId?: string;
  onBatchIdChange?: (id: string) => void;
}

export default function TranscribeOftreviewPanel({
  batchId: propBatchId = '',
  onBatchIdChange,
}: TranscribeOftreviewPanelProps) {
  const [internalBatchId, setInternalBatchId] = useState(propBatchId || '');
  useEffect(() => {
    if (propBatchId) setInternalBatchId(propBatchId);
  }, [propBatchId]);
  const batchId = internalBatchId;
  const setBatchId = (id: string) => {
    setInternalBatchId(id);
    onBatchIdChange?.(id);
  };
  const [log, setLog] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingStart, setLoadingStart] = useState(false);
  const [loadingContinue, setLoadingContinue] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState(false);

  const appendLog = (data: unknown) => {
    setLog(data);
    setError(null);
  };

  const setLogError = (msg: string) => {
    setError(msg);
    setLog(null);
  };

  const handleStart = async () => {
    setLoadingStart(true);
    setLog(null);
    setError(null);
    try {
      const res = await fetch('/api/transcribe-oftreview/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maxFiles: 500, force: false }),
      });
      const data: StartResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      appendLog(data);
      if (data.batchId) setBatchId(data.batchId);
    } catch (e) {
      setLogError(e instanceof Error ? e.message : 'Erro ao iniciar');
    } finally {
      setLoadingStart(false);
    }
  };

  const handleContinue = async () => {
    if (!batchId.trim()) {
      setLogError('Informe o batchId');
      return;
    }
    setLoadingContinue(true);
    setLog(null);
    setError(null);
    try {
      const res = await fetch('/api/transcribe-oftreview/continue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batchId.trim(),
          maxToProcess: 2,
        }),
      });
      const data: ContinueResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      appendLog(data);
    } catch (e) {
      setLogError(e instanceof Error ? e.message : 'Erro ao continuar');
    } finally {
      setLoadingContinue(false);
    }
  };

  const handleStatus = async () => {
    if (!batchId.trim()) {
      setLogError('Informe o batchId');
      return;
    }
    setLoadingStatus(true);
    setLog(null);
    setError(null);
    try {
      const res = await fetch(
        `/api/transcribe-oftreview/status?batchId=${encodeURIComponent(batchId.trim())}`
      );
      const data: StatusResponse = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || res.statusText);
      appendLog(data);
    } catch (e) {
      setLogError(e instanceof Error ? e.message : 'Erro ao obter status');
    } finally {
      setLoadingStatus(false);
    }
  };

  return (
    <div className="bg-white shadow rounded-xl border border-amber-200 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-amber-200">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <span>🧠</span> Transcrição OFTREVIEW (Dev)
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          Painel de teste do pipeline de transcrição — só visível em desenvolvimento
        </p>
      </div>
      <div className="p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">batchId</label>
          <input
            type="text"
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            placeholder="UUID do batch (preenchido ao clicar em Start)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleStart}
            disabled={loadingStart || loadingContinue || loadingStatus}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 text-white hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loadingStart ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Batch
          </button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={loadingStart || loadingContinue || loadingStatus}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loadingContinue ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
            Continue
          </button>
          <button
            type="button"
            onClick={handleStatus}
            disabled={loadingStart || loadingContinue || loadingStatus}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
          >
            {loadingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <BarChart3 className="w-4 h-4" />}
            Status
          </button>
        </div>
        {(log !== null || error) && (
          <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
            <div className="px-3 py-2 bg-gray-100 border-b border-gray-200 text-xs font-medium text-gray-600">
              Log / Resposta
            </div>
            <div className="p-3 max-h-64 overflow-auto">
              {error ? (
                <pre className="text-sm text-red-600 whitespace-pre-wrap break-words font-mono">
                  {error}
                </pre>
              ) : (
                <pre className="text-xs text-gray-800 whitespace-pre-wrap break-all font-mono">
                  {JSON.stringify(log, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

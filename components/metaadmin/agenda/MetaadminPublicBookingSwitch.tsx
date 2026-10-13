'use client';

import { useCallback, useEffect, useState } from 'react';
import { medicoAgendaAuthFetch } from '@/lib/metaadmin/agenda/medicoAgendaAuthFetch';

export default function MetaadminPublicBookingSwitch() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/settings');
      const data = (await res.json()) as { settings?: { publicBookingEnabled?: boolean }; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar.');
      setEnabled(data.settings?.publicBookingEnabled === true);
    } catch (error) {
      console.error('[agenda] switch agendamento público', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = useCallback(async () => {
    if (saving || loading) return;
    const next = !enabled;
    setEnabled(next);
    setSaving(true);
    try {
      const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/settings', {
        method: 'PATCH',
        body: JSON.stringify({ publicBookingEnabled: next }),
      });
      const data = (await res.json()) as { settings?: { publicBookingEnabled?: boolean }; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setEnabled(data.settings?.publicBookingEnabled === true);
    } catch (error) {
      setEnabled(!next);
      console.error('[agenda] switch agendamento público', error);
    } finally {
      setSaving(false);
    }
  }, [enabled, loading, saving]);

  const busy = loading || saving;

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white px-3 py-2 shadow-sm">
      <div className="min-w-0 hidden sm:block">
        <p className="text-sm font-semibold text-gray-900 leading-tight">Agendar após anamnese</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-xs font-semibold ${enabled ? 'text-gray-400' : 'text-gray-800'}`}>
          Desligado
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={enabled ? 'Agendamento ligado' : 'Agendamento desligado'}
          disabled={busy}
          onClick={() => void toggle()}
          className={`relative inline-flex h-7 w-12 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500 disabled:cursor-not-allowed disabled:opacity-50 ${
            enabled ? 'bg-green-600' : 'bg-gray-300'
          }`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow mt-1 transition duration-200 ${
              enabled ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className={`text-xs font-semibold ${enabled ? 'text-green-700' : 'text-gray-400'}`}>
          Ligado
        </span>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Loader2, Save, Settings2 } from 'lucide-react';
import WhiteLabelGoogleCalendarConnect from '@/components/metaadmingeral/WhiteLabelGoogleCalendarConnect';
import {
  WHITELABEL_ALLOWED_DAYS_OPTIONS,
  WHITELABEL_BUFFER_OPTIONS,
  WHITELABEL_DURATION_OPTIONS,
  type WhiteLabelAgendaSettings,
} from '@/types/whiteLabelAgenda';

async function authFetch(url: string, init?: RequestInit) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login novamente.');
  const token = await user.getIdToken();
  return fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
}

const inputCls =
  'w-full bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60';

export default function WhiteLabelAgendaSettingsPanel() {
  const [settings, setSettings] = useState<WhiteLabelAgendaSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/settings');
      const data = (await res.json()) as { settings?: WhiteLabelAgendaSettings; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar.');
      setSettings(data.settings || null);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = useCallback(async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      });
      const data = (await res.json()) as { error?: string; settings?: WhiteLabelAgendaSettings };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar.');
      setSettings(data.settings || settings);
      setMessage({ type: 'ok', text: 'Configurações salvas. Os slots futuros serão recalculados automaticamente.' });
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [settings]);

  if (loading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#4CCB7A]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <WhiteLabelGoogleCalendarConnect />

    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 className="w-5 h-5 text-[#4CCB7A]" />
        <div>
          <h3 className="text-lg font-bold text-[#E8EDED]">Configurações da Agenda White Label</h3>
          <p className="text-sm text-[#E8EDED]/60">Define como os horários são gerados automaticamente</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-red-500/15 text-red-300 border border-red-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Duração padrão da reunião</label>
          <select
            value={settings.defaultDurationMinutes}
            onChange={(e) =>
              setSettings((s) => s && { ...s, defaultDurationMinutes: Number(e.target.value) as WhiteLabelAgendaSettings['defaultDurationMinutes'] })
            }
            className={inputCls}
          >
            {WHITELABEL_DURATION_OPTIONS.map((v) => (
              <option key={v} value={v} style={{ backgroundColor: '#0A1F44' }}>
                {v} min
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Buffer entre reuniões</label>
          <select
            value={settings.bufferMinutes}
            onChange={(e) =>
              setSettings((s) => s && { ...s, bufferMinutes: Number(e.target.value) as WhiteLabelAgendaSettings['bufferMinutes'] })
            }
            className={inputCls}
          >
            {WHITELABEL_BUFFER_OPTIONS.map((v) => (
              <option key={v} value={v} style={{ backgroundColor: '#0A1F44' }}>
                {v} min
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Antecedência mínima (horas)</label>
          <input
            type="number"
            min={0}
            max={168}
            value={settings.minAdvanceHours}
            onChange={(e) => setSettings((s) => s && { ...s, minAdvanceHours: Number(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Antecedência máxima (dias)</label>
          <input
            type="number"
            min={1}
            max={90}
            value={settings.maxAdvanceDays}
            onChange={(e) => setSettings((s) => s && { ...s, maxAdvanceDays: Number(e.target.value) })}
            className={inputCls}
          />
        </div>

        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Dias permitidos</label>
          <select
            value={settings.allowedDaysMode}
            onChange={(e) =>
              setSettings((s) => s && { ...s, allowedDaysMode: e.target.value as WhiteLabelAgendaSettings['allowedDaysMode'] })
            }
            className={inputCls}
          >
            {WHITELABEL_ALLOWED_DAYS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0A1F44' }}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <label className="inline-flex items-center gap-2 text-sm text-[#E8EDED]/80 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.slotGenerationEnabled}
              onChange={(e) => setSettings((s) => s && { ...s, slotGenerationEnabled: e.target.checked })}
              className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A]"
            />
            Gerar slots automaticamente pelas regras recorrentes
          </label>
        </div>
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar configurações
      </button>
    </div>
    </div>
  );
}

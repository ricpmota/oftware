'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Loader2, Plus, Repeat, Save, Trash2 } from 'lucide-react';
import {
  WHITELABEL_WEEKDAYS,
  type WhiteLabelAvailabilityPeriod,
  type WhiteLabelAvailabilityRule,
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
  'bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60';

function emptyRule(weekday: number): WhiteLabelAvailabilityRule {
  return { id: String(weekday), weekday, enabled: weekday >= 1 && weekday <= 5, periods: [] };
}

export default function WhiteLabelRecurringRulesEditor() {
  const [rules, setRules] = useState<WhiteLabelAvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/rules');
      const data = (await res.json()) as { rules?: WhiteLabelAvailabilityRule[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar regras.');

      const byWeekday = new Map((data.rules || []).map((r) => [r.weekday, r]));
      setRules(WHITELABEL_WEEKDAYS.map(({ weekday }) => byWeekday.get(weekday) || emptyRule(weekday)));
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const updateRule = (weekday: number, patch: Partial<WhiteLabelAvailabilityRule>) => {
    setRules((prev) => prev.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
  };

  const updatePeriod = (weekday: number, index: number, patch: Partial<WhiteLabelAvailabilityPeriod>) => {
    setRules((prev) =>
      prev.map((r) => {
        if (r.weekday !== weekday) return r;
        const periods = [...r.periods];
        periods[index] = { ...periods[index], ...patch };
        return { ...r, periods };
      })
    );
  };

  const addPeriod = (weekday: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.weekday === weekday
          ? { ...r, enabled: true, periods: [...r.periods, { startTime: '09:00', endTime: '12:00' }] }
          : r
      )
    );
  };

  const removePeriod = (weekday: number, index: number) => {
    setRules((prev) =>
      prev.map((r) =>
        r.weekday === weekday ? { ...r, periods: r.periods.filter((_, i) => i !== index) } : r
      )
    );
  };

  const save = useCallback(async () => {
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar regras.');
      setMessage({ type: 'ok', text: 'Disponibilidade recorrente salva com sucesso.' });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [rules, load]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-[#4CCB7A]" />
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Repeat className="w-5 h-5 text-[#4CCB7A]" />
        <div>
          <h3 className="text-lg font-bold text-[#E8EDED]">Disponibilidade Recorrente</h3>
          <p className="text-sm text-[#E8EDED]/60">Horários fixos por dia da semana — o sistema gera os slots automaticamente</p>
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

      <div className="space-y-3">
        {rules.map((rule) => {
          const meta = WHITELABEL_WEEKDAYS.find((w) => w.weekday === rule.weekday)!;
          return (
            <div
              key={rule.weekday}
              className={`border rounded-xl overflow-hidden transition-colors ${
                rule.enabled ? 'border-white/15 bg-white/[0.03]' : 'border-white/10 bg-transparent opacity-70'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.weekday, { enabled: e.target.checked })}
                    className="rounded border-white/30 bg-[#0A1F44] text-[#4CCB7A]"
                  />
                  <span className="font-semibold text-[#E8EDED]">{meta.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => addPeriod(rule.weekday)}
                  className="inline-flex items-center gap-1 text-xs text-[#4CCB7A] hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Período
                </button>
              </div>

              {rule.enabled && (
                <div className="p-4 space-y-2">
                  {rule.periods.length === 0 ? (
                    <p className="text-xs text-[#E8EDED]/40">Indisponível — adicione um período ou desative o dia</p>
                  ) : (
                    rule.periods.map((period, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updatePeriod(rule.weekday, index, { startTime: e.target.value })}
                          className={`${inputCls} w-32`}
                        />
                        <span className="text-[#E8EDED]/40 text-xs">até</span>
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updatePeriod(rule.weekday, index, { endTime: e.target.value })}
                          className={`${inputCls} w-32`}
                        />
                        <button
                          type="button"
                          onClick={() => removePeriod(rule.weekday, index)}
                          className="p-2 rounded-lg text-red-300 hover:bg-red-500/10"
                          aria-label="Remover período"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar disponibilidade recorrente
      </button>
    </div>
  );
}

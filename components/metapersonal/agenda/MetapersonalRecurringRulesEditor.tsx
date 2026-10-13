'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Plus, Repeat, Save, Trash2 } from 'lucide-react';
import { personalAgendaAuthFetch } from '@/lib/personal/agenda/personalAgendaAuthFetch';
import {
  WHITELABEL_WEEKDAYS,
  type WhiteLabelAvailabilityPeriod,
  type WhiteLabelAvailabilityRule,
} from '@/types/whiteLabelAgenda';

const inputCls =
  'bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500';

function emptyRule(weekday: number): WhiteLabelAvailabilityRule {
  return { id: String(weekday), weekday, enabled: weekday >= 1 && weekday <= 5, periods: [] };
}

export default function MetapersonalRecurringRulesEditor({
  embedded = false,
  onSaved,
}: {
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const [rules, setRules] = useState<WhiteLabelAvailabilityRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/rules');
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
    void load();
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
      const res = await personalAgendaAuthFetch('/api/metapersonal/agenda/rules', {
        method: 'PUT',
        body: JSON.stringify({ rules }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar regras.');
      setMessage({ type: 'ok', text: 'Disponibilidade recorrente salva com sucesso.' });
      await load();
      onSaved?.();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [rules, load, onSaved]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-7 h-7 animate-spin text-green-600" />
      </div>
    );
  }

  return (
    <div className={embedded ? 'space-y-4' : 'bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4'}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
          <Repeat className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-gray-900">Semana típica</h3>
          <p className="text-sm text-gray-500">
            Ligue os dias e defina os períodos. Esses horários alimentam o calendário automaticamente.
          </p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
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
              className={`overflow-hidden rounded-2xl border ${
                rule.enabled ? 'border-green-200 bg-white shadow-sm' : 'border-gray-100 bg-gray-50/70'
              }`}
            >
              <div className="flex items-center justify-between px-4 py-3">
                <label className="inline-flex items-center gap-3 cursor-pointer">
                  <span
                    className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                      rule.enabled ? 'bg-green-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                        rule.enabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                    />
                  </span>
                  <input
                    type="checkbox"
                    checked={rule.enabled}
                    onChange={(e) => updateRule(rule.weekday, { enabled: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="font-semibold text-gray-900">{meta.label}</span>
                </label>
                <button
                  type="button"
                  onClick={() => addPeriod(rule.weekday)}
                  className="inline-flex items-center gap-1 text-xs text-green-700 hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Período
                </button>
              </div>
              {rule.enabled && (
                <div className="border-t border-gray-100 p-4 space-y-2">
                  {rule.periods.length === 0 ? (
                    <p className="text-xs text-gray-400">Indisponível — adicione um período ou desative o dia</p>
                  ) : (
                    rule.periods.map((period, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <input
                          type="time"
                          value={period.startTime}
                          onChange={(e) => updatePeriod(rule.weekday, index, { startTime: e.target.value })}
                          className={inputCls}
                        />
                        <span className="text-gray-400">–</span>
                        <input
                          type="time"
                          value={period.endTime}
                          onChange={(e) => updatePeriod(rule.weekday, index, { endTime: e.target.value })}
                          className={inputCls}
                        />
                        <button
                          type="button"
                          onClick={() => removePeriod(rule.weekday, index)}
                          className="p-2 text-gray-400 hover:text-red-600"
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
        onClick={() => void save()}
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 text-white font-semibold text-sm hover:bg-green-700 disabled:opacity-50 sm:w-auto"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Salvar disponibilidade recorrente
      </button>
    </div>
  );
}

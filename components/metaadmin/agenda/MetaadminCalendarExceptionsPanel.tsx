'use client';

import { useCallback, useEffect, useState } from 'react';
import { Ban, CalendarOff, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import { medicoAgendaAuthFetch } from '@/lib/metaadmin/agenda/medicoAgendaAuthFetch';
import { getBrazilDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { MedicoCalendarException } from '@/types/medicoAgenda';

const inputCls =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500';

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function MetaadminCalendarExceptionsPanel({
  embedded = false,
  onSaved,
}: {
  embedded?: boolean;
  onSaved?: () => void;
}) {
  const [exceptions, setExceptions] = useState<MedicoCalendarException[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [date, setDate] = useState('');
  const [type, setType] = useState<'blocked' | 'extra'>('blocked');
  const [reason, setReason] = useState('');
  const [startTime, setStartTime] = useState('19:00');
  const [endTime, setEndTime] = useState('21:00');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const today = getBrazilDateKey();
      const res = await medicoAgendaAuthFetch(`/api/metaadmin/agenda/exceptions?fromDate=${today}`);
      const data = (await res.json()) as { exceptions?: MedicoCalendarException[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar exceções.');
      setExceptions(data.exceptions || []);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    if (!date) {
      setMessage({ type: 'err', text: 'Informe a data.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await medicoAgendaAuthFetch('/api/metaadmin/agenda/exceptions', {
        method: 'POST',
        body: JSON.stringify({
          date,
          type,
          reason,
          startTime: type === 'extra' ? startTime : undefined,
          endTime: type === 'extra' ? endTime : undefined,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao criar exceção.');
      setMessage({ type: 'ok', text: 'Exceção cadastrada.' });
      setDate('');
      setReason('');
      await load();
      onSaved?.();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [date, type, reason, startTime, endTime, load, onSaved]);

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const res = await medicoAgendaAuthFetch(`/api/metaadmin/agenda/exceptions?id=${id}`, {
          method: 'DELETE',
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao remover.');
        await load();
        onSaved?.();
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [load, onSaved]
  );

  return (
    <div className={embedded ? 'space-y-4' : 'bg-white border border-gray-200 rounded-2xl p-4 md:p-5 space-y-4'}>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-600 text-white">
          <CalendarOff className="w-5 h-5" />
        </span>
        <div>
          <h3 className="text-base font-bold text-gray-900">Exceções</h3>
          <p className="text-sm text-gray-500">Bloqueie um dia ou abra um horário extra pontual.</p>
        </div>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {([
            { id: 'blocked' as const, label: 'Bloquear dia', hint: 'Feriado ou folga' },
            { id: 'extra' as const, label: 'Horário extra', hint: 'Abrir um período' },
          ]).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setType(option.id)}
              className={`rounded-xl border px-3 py-2.5 text-left transition-colors ${
                type === option.id
                  ? 'border-green-600 bg-green-50 text-green-900'
                  : 'border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="block text-sm font-semibold">{option.label}</span>
              <span className="mt-0.5 block text-[11px] text-gray-500">{option.hint}</span>
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Congresso, Feriado, Férias..."
            className={inputCls}
          />
        </div>
        {type === 'extra' && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Fim</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={() => void create()}
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Adicionar exceção
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-green-600" />
        </div>
      ) : exceptions.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-6">Nenhuma exceção cadastrada.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl overflow-hidden">
          {exceptions.map((ex) => (
            <div key={ex.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-900">{formatDate(ex.date)}</p>
                <p className="text-xs text-gray-500">
                  {ex.type === 'blocked' ? (
                    <span className="inline-flex items-center gap-1 text-red-700">
                      <Ban className="w-3 h-3" /> Bloqueio
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-violet-700">
                      <Sparkles className="w-3 h-3" /> Extra {ex.startTime}–{ex.endTime}
                    </span>
                  )}
                  {ex.reason ? ` · ${ex.reason}` : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void remove(ex.id)}
                className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

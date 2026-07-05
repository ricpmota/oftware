'use client';

import { useCallback, useEffect, useState } from 'react';
import { auth } from '@/lib/firebase';
import { Ban, CalendarOff, Loader2, Plus, Sparkles, Trash2 } from 'lucide-react';
import type { WhiteLabelCalendarException } from '@/types/whiteLabelAgenda';

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

function formatDate(date: string): string {
  const d = new Date(`${date}T12:00:00`);
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
}

export default function WhiteLabelCalendarExceptionsPanel() {
  const [exceptions, setExceptions] = useState<WhiteLabelCalendarException[]>([]);
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
      const today = new Date().toISOString().slice(0, 10);
      const res = await authFetch(`/api/metaadmingeral/whitelabel/agenda/exceptions?fromDate=${today}`);
      const data = (await res.json()) as { exceptions?: WhiteLabelCalendarException[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar exceções.');
      setExceptions(data.exceptions || []);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const create = useCallback(async () => {
    if (!date) {
      setMessage({ type: 'err', text: 'Informe a data.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await authFetch('/api/metaadmingeral/whitelabel/agenda/exceptions', {
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
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [date, type, reason, startTime, endTime, load]);

  const remove = useCallback(
    async (id: string) => {
      setSaving(true);
      try {
        const res = await authFetch(`/api/metaadmingeral/whitelabel/agenda/exceptions?id=${id}`, {
          method: 'DELETE',
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao remover.');
        await load();
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
      <div className="flex items-center gap-2">
        <CalendarOff className="w-5 h-5 text-[#4CCB7A]" />
        <div>
          <h3 className="text-lg font-bold text-[#E8EDED]">Exceções de Calendário</h3>
          <p className="text-sm text-[#E8EDED]/60">Feriados, férias, congressos ou horários extras pontuais</p>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-[#0A1F44]/40 border border-white/10 rounded-xl">
        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Data</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Tipo</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'blocked' | 'extra')}
            className={inputCls}
          >
            <option value="blocked" style={{ backgroundColor: '#0A1F44' }}>Bloqueio (dia inteiro)</option>
            <option value="extra" style={{ backgroundColor: '#0A1F44' }}>Horário extra</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs text-[#E8EDED]/50 mb-1">Motivo</label>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex: Congresso, Feriado, Férias..."
            className={inputCls}
          />
        </div>
        {type === 'extra' && (
          <>
            <div>
              <label className="block text-xs text-[#E8EDED]/50 mb-1">Início</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-[#E8EDED]/50 mb-1">Término</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </>
        )}
        <div className="sm:col-span-2">
          <button
            type="button"
            onClick={create}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-violet-600 text-white text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Adicionar exceção
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-[#4CCB7A]" />
        </div>
      ) : exceptions.length === 0 ? (
        <p className="text-sm text-[#E8EDED]/40 text-center py-6">Nenhuma exceção cadastrada.</p>
      ) : (
        <div className="divide-y divide-white/10 border border-white/10 rounded-xl overflow-hidden">
          {exceptions.map((ex) => (
            <div key={ex.id} className="px-4 py-3 flex items-center justify-between gap-3 hover:bg-white/[0.02]">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-[#E8EDED]">{formatDate(ex.date)}</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full border ${
                      ex.type === 'blocked'
                        ? 'bg-red-500/15 text-red-300 border-red-500/30'
                        : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                    }`}
                  >
                    {ex.type === 'blocked' ? (
                      <span className="inline-flex items-center gap-1"><Ban className="w-3 h-3" /> Bloqueado</span>
                    ) : (
                      <span className="inline-flex items-center gap-1"><Sparkles className="w-3 h-3" /> Extra</span>
                    )}
                  </span>
                </div>
                <p className="text-xs text-[#E8EDED]/60 mt-0.5">
                  {ex.reason || '—'}
                  {ex.type === 'extra' && ex.startTime && ex.endTime ? ` · ${ex.startTime}–${ex.endTime}` : ''}
                </p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => remove(ex.id)}
                className="p-2 rounded-lg text-red-300 hover:bg-red-500/10 disabled:opacity-50"
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

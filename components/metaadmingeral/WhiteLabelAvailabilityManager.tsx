'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { auth } from '@/lib/firebase';
import {
  Ban,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Loader2,
  Plus,
  RefreshCw,
  Trash2,
  Unlock,
  Video,
} from 'lucide-react';
import {
  PERIOD_PRESETS,
  SLOT_DURATION_OPTIONS,
  addMonths,
  generateSlotsInRange,
  getMonthCalendarGrid,
  parseDateKey,
  toDateKey,
  type PeriodPresetId,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import WhiteLabelAgendaSettingsPanel from '@/components/metaadmingeral/WhiteLabelAgendaSettingsPanel';
import WhiteLabelCalendarExceptionsPanel from '@/components/metaadmingeral/WhiteLabelCalendarExceptionsPanel';
import WhiteLabelRecurringRulesEditor from '@/components/metaadmingeral/WhiteLabelRecurringRulesEditor';
import type {
  WhiteLabelAvailabilityApiRow,
  WhiteLabelAvailabilityStatus,
} from '@/types/whiteLabelAvailability';

type AgendaSubTab = 'overview' | 'recurring' | 'exceptions' | 'settings';

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

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const inputCls =
  'w-full bg-[#0A1F44] border border-white/20 rounded-lg px-3 py-2 text-sm text-[#E8EDED] focus:outline-none focus:border-[#4CCB7A]/60';

type CreateMode = 'single' | 'period';

function formatDateLong(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  const d = new Date(parsed.year, parsed.month, parsed.day);
  return d.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function StatusBadge({ status }: { status: WhiteLabelAvailabilityStatus }) {
  const config = {
    available: { label: 'Disponível', className: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' },
    reserved: { label: 'Reservado', className: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
    blocked: { label: 'Bloqueado', className: 'bg-red-500/20 text-red-300 border-red-500/30' },
  }[status];

  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${config.className}`}>
      {config.label}
    </span>
  );
}

type DaySummary = {
  total: number;
  available: number;
  reserved: number;
  blocked: number;
};

export default function WhiteLabelAvailabilityManager() {
  const [agendaTab, setAgendaTab] = useState<AgendaSubTab>('overview');
  const today = useMemo(() => toDateKey(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()), []);
  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState(today);
  const [slots, setSlots] = useState<WhiteLabelAvailabilityApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [createMode, setCreateMode] = useState<CreateMode>('period');
  const [periodPreset, setPeriodPreset] = useState<PeriodPresetId>('manha');
  const [periodStart, setPeriodStart] = useState(PERIOD_PRESETS.manha.startTime);
  const [periodEnd, setPeriodEnd] = useState(PERIOD_PRESETS.manha.endTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [singleStart, setSingleStart] = useState('09:00');
  const [singleEnd, setSingleEnd] = useState('10:00');

  const monthRange = useMemo(() => {
    const fromDate = toDateKey(viewYear, viewMonth, 1);
    const lastDay = new Date(viewYear, viewMonth + 1, 0).getDate();
    const toDate = toDateKey(viewYear, viewMonth, lastDay);
    return { fromDate, toDate };
  }, [viewYear, viewMonth]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate: monthRange.fromDate,
        toDate: monthRange.toDate,
      });
      const res = await authFetch(`/api/metaadmingeral/whitelabel/availability/list?${params}`);
      const data = (await res.json()) as { slots?: WhiteLabelAvailabilityApiRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar horários.');
      setSlots(data.slots || []);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [monthRange.fromDate, monthRange.toDate]);

  useEffect(() => {
    if (agendaTab === 'overview') load();
  }, [load, agendaTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    if (params.get('calendar_sync') || params.get('error')) {
      setAgendaTab('settings');
    }
  }, []);

  const daySummaryMap = useMemo(() => {
    const map = new Map<string, DaySummary>();
    for (const slot of slots) {
      const current = map.get(slot.date) || { total: 0, available: 0, reserved: 0, blocked: 0 };
      current.total += 1;
      current[slot.status] += 1;
      map.set(slot.date, current);
    }
    return map;
  }, [slots]);

  const calendarCells = useMemo(
    () => getMonthCalendarGrid(viewYear, viewMonth),
    [viewYear, viewMonth]
  );

  const selectedDaySlots = useMemo(
    () =>
      slots
        .filter((slot) => slot.date === selectedDate)
        .sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots, selectedDate]
  );

  const previewSlots = useMemo(() => {
    if (createMode === 'single') {
      return [{ startTime: singleStart, endTime: singleEnd }];
    }
    return generateSlotsInRange(periodStart, periodEnd, durationMinutes);
  }, [createMode, singleStart, singleEnd, periodStart, periodEnd, durationMinutes]);

  const applyPreset = useCallback((preset: Exclude<PeriodPresetId, 'custom'>) => {
    setPeriodPreset(preset);
    setPeriodStart(PERIOD_PRESETS[preset].startTime);
    setPeriodEnd(PERIOD_PRESETS[preset].endTime);
    setCreateMode('period');
  }, []);

  const goPrevMonth = () => {
    const next = addMonths(viewYear, viewMonth, -1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const goNextMonth = () => {
    const next = addMonths(viewYear, viewMonth, 1);
    setViewYear(next.year);
    setViewMonth(next.month);
  };

  const handleCreate = useCallback(async () => {
    if (!selectedDate) {
      setMessage({ type: 'err', text: 'Selecione uma data no calendário.' });
      return;
    }

    if (previewSlots.length === 0) {
      setMessage({ type: 'err', text: 'Nenhum horário válido para criar. Verifique início, fim e duração.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload =
        createMode === 'single'
          ? { date: selectedDate, startTime: singleStart, endTime: singleEnd }
          : {
              date: selectedDate,
              periodStart,
              periodEnd,
              durationMinutes,
            };

      const res = await authFetch('/api/metaadmingeral/whitelabel/availability/create', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as {
        error?: string;
        message?: string;
        created?: unknown[];
        skipped?: unknown[];
        success?: boolean;
      };

      if (!res.ok && !data.created?.length) {
        throw new Error(data.error || data.message || 'Falha ao criar horários.');
      }

      setMessage({
        type: data.success === false && data.skipped?.length ? 'err' : 'ok',
        text: data.message || `${data.created?.length || 0} horário(s) criado(s).`,
      });
      await load();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }, [
    selectedDate,
    previewSlots.length,
    createMode,
    singleStart,
    singleEnd,
    periodStart,
    periodEnd,
    durationMinutes,
    load,
  ]);

  const handleUpdate = useCallback(
    async (id: string, action: { status?: 'available' | 'blocked'; delete?: boolean }) => {
      setSaving(true);
      setMessage(null);
      try {
        const res = await authFetch('/api/metaadmingeral/whitelabel/availability/update', {
          method: 'POST',
          body: JSON.stringify({ id, ...action }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || 'Falha ao atualizar horário.');
        await load();
      } catch (err) {
        setMessage({ type: 'err', text: (err as Error).message });
      } finally {
        setSaving(false);
      }
    },
    [load]
  );

  const subTabs: { id: AgendaSubTab; label: string }[] = [
    { id: 'overview', label: 'Calendário' },
    { id: 'recurring', label: 'Recorrente' },
    { id: 'exceptions', label: 'Exceções' },
    { id: 'settings', label: 'Configurações' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 p-1 bg-white/5 border border-white/10 rounded-xl">
        {subTabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setAgendaTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all ${
              agendaTab === tab.id
                ? 'bg-white/15 text-[#E8EDED] shadow-sm'
                : 'text-[#E8EDED]/55 hover:text-[#E8EDED] hover:bg-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {agendaTab === 'recurring' && <WhiteLabelRecurringRulesEditor />}
      {agendaTab === 'exceptions' && <WhiteLabelCalendarExceptionsPanel />}
      {agendaTab === 'settings' && <WhiteLabelAgendaSettingsPanel />}

      {agendaTab !== 'overview' ? null : (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-[#E8EDED] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#4CCB7A]" />
            Disponibilidade para Reuniões
          </h3>
          <p className="text-sm text-[#E8EDED]/60 mt-0.5">
            Gerencie dias, períodos e horários para o formulário /whitelabel
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-sm text-[#E8EDED] transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Atualizar
        </button>
      </div>

      {message && (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
              : 'bg-amber-500/15 text-amber-200 border border-amber-500/30'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        {/* Calendário */}
        <div className="xl:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-lg hover:bg-white/10 text-[#E8EDED]/70 transition-colors"
              aria-label="Mês anterior"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h4 className="text-base font-semibold text-[#E8EDED]">
              {MONTHS[viewMonth]} {viewYear}
            </h4>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-lg hover:bg-white/10 text-[#E8EDED]/70 transition-colors"
              aria-label="Próximo mês"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {WEEKDAYS.map((day) => (
              <div key={day} className="text-center text-[10px] font-semibold text-[#E8EDED]/40 uppercase py-1">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {calendarCells.map((dateKey, idx) => {
              if (!dateKey) {
                return <div key={`empty-${idx}`} className="aspect-square" />;
              }

              const summary = daySummaryMap.get(dateKey);
              const isSelected = selectedDate === dateKey;
              const isToday = dateKey === today;
              const isPast = dateKey < today;
              const dayNum = parseDateKey(dateKey)?.day;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDate(dateKey)}
                  className={`aspect-square rounded-xl flex flex-col items-center justify-center gap-0.5 text-sm transition-all relative ${
                    isSelected
                      ? 'bg-[#4CCB7A] text-[#0A1F44] font-bold shadow-lg shadow-[#4CCB7A]/20 scale-105 z-10'
                      : isPast
                        ? 'text-[#E8EDED]/30 hover:bg-white/5'
                        : 'text-[#E8EDED] hover:bg-white/10'
                  } ${isToday && !isSelected ? 'ring-1 ring-[#4CCB7A]/50' : ''}`}
                >
                  <span>{dayNum}</span>
                  {summary && summary.total > 0 && (
                    <div className="flex gap-0.5">
                      {summary.available > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A1F44]/60' : 'bg-emerald-400'}`}
                        />
                      )}
                      {summary.reserved > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A1F44]/40' : 'bg-cyan-400'}`}
                        />
                      )}
                      {summary.blocked > 0 && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-[#0A1F44]/30' : 'bg-red-400'}`}
                        />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-white/10 text-[10px] text-[#E8EDED]/50">
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Disponível</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Reservado</span>
            <span className="inline-flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400" /> Bloqueado</span>
          </div>
        </div>

        {/* Painel do dia */}
        <div className="xl:col-span-7 space-y-4">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5">
            <p className="text-xs uppercase tracking-wider text-[#E8EDED]/40 font-semibold mb-1">Data selecionada</p>
            <h4 className="text-lg font-bold text-[#E8EDED] capitalize">{formatDateLong(selectedDate)}</h4>
          </div>

          {/* Criar horários */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-[#4CCB7A]" />
              <h4 className="text-sm font-semibold text-[#E8EDED]">Adicionar horários</h4>
            </div>

            <div className="flex gap-2">
              {(['period', 'single'] as CreateMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setCreateMode(mode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    createMode === mode
                      ? 'border-[#4CCB7A] bg-[#4CCB7A]/15 text-[#4CCB7A]'
                      : 'border-white/15 text-[#E8EDED]/70 hover:bg-white/5'
                  }`}
                >
                  {mode === 'period' ? 'Período' : 'Horário único'}
                </button>
              ))}
            </div>

            {createMode === 'period' ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {(Object.keys(PERIOD_PRESETS) as Exclude<PeriodPresetId, 'custom'>[]).map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                        periodPreset === preset
                          ? 'border-violet-400 bg-violet-500/20 text-violet-200'
                          : 'border-white/15 text-[#E8EDED]/70 hover:bg-white/5'
                      }`}
                    >
                      {PERIOD_PRESETS[preset].label} ({PERIOD_PRESETS[preset].startTime}–{PERIOD_PRESETS[preset].endTime})
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-[#E8EDED]/50 mb-1">Início do período</label>
                    <input
                      type="time"
                      value={periodStart}
                      onChange={(e) => {
                        setPeriodPreset('custom');
                        setPeriodStart(e.target.value);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#E8EDED]/50 mb-1">Fim do período</label>
                    <input
                      type="time"
                      value={periodEnd}
                      onChange={(e) => {
                        setPeriodPreset('custom');
                        setPeriodEnd(e.target.value);
                      }}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#E8EDED]/50 mb-1">Duração de cada slot</label>
                    <select
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Number(e.target.value))}
                      className={inputCls}
                    >
                      {SLOT_DURATION_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value} style={{ backgroundColor: '#0A1F44' }}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {previewSlots.length > 0 && (
                  <div className="bg-[#0A1F44]/60 border border-white/10 rounded-xl p-3">
                    <p className="text-xs text-[#E8EDED]/50 mb-2">
                      Pré-visualização — {previewSlots.length} horário(s) serão criados:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewSlots.map((slot) => (
                        <span
                          key={`${slot.startTime}-${slot.endTime}`}
                          className="text-[11px] px-2 py-1 rounded-md bg-white/5 text-[#E8EDED]/80 border border-white/10"
                        >
                          {slot.startTime}–{slot.endTime}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#E8EDED]/50 mb-1">Início</label>
                  <input type="time" value={singleStart} onChange={(e) => setSingleStart(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs text-[#E8EDED]/50 mb-1">Término</label>
                  <input type="time" value={singleEnd} onChange={(e) => setSingleEnd(e.target.value)} className={inputCls} />
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={handleCreate}
              disabled={saving || previewSlots.length === 0}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#4CCB7A] text-[#0A1F44] font-semibold text-sm hover:bg-[#45b86d] transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Criar {previewSlots.length > 1 ? `${previewSlots.length} horários` : 'horário'}
            </button>
          </div>

          {/* Eventos do dia */}
          <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#E8EDED]/50" />
                <h4 className="text-sm font-semibold text-[#E8EDED]">
                  Horários do dia ({selectedDaySlots.length})
                </h4>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="w-7 h-7 animate-spin text-[#4CCB7A]" />
              </div>
            ) : selectedDaySlots.length === 0 ? (
              <p className="text-sm text-[#E8EDED]/40 text-center py-12 px-4">
                Nenhum horário cadastrado para este dia. Use o formulário acima para adicionar.
              </p>
            ) : (
              <div className="divide-y divide-white/10 max-h-[420px] overflow-y-auto">
                {selectedDaySlots.map((slot) => (
                  <div key={slot.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:bg-white/[0.02]">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#E8EDED] tabular-nums">
                          {slot.startTime} – {slot.endTime}
                        </span>
                        <StatusBadge status={slot.status} />
                      </div>
                      {slot.status === 'reserved' && (
                        <div className="text-xs text-[#E8EDED]/60 space-y-0.5">
                          <p className="font-medium text-[#E8EDED]/80">{slot.doctorName}</p>
                          <p>{slot.doctorEmail}</p>
                          <p>{slot.doctorPhone}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {slot.googleMeetLink && (
                        <a
                          href={slot.googleMeetLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-600/20 text-cyan-300 border border-cyan-500/30 text-xs hover:bg-cyan-600/30"
                        >
                          <Video className="w-3.5 h-3.5" />
                          Meet
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                      {slot.status === 'available' && (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdate(slot.id, { status: 'blocked' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-red-600/15 text-red-300 border border-red-500/25 text-xs hover:bg-red-600/25 disabled:opacity-50"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            Bloquear
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdate(slot.id, { delete: true })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-[#E8EDED]/70 text-xs hover:bg-white/15 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                      {slot.status === 'blocked' && (
                        <>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdate(slot.id, { status: 'available' })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600/15 text-emerald-300 border border-emerald-500/25 text-xs hover:bg-emerald-600/25 disabled:opacity-50"
                          >
                            <Unlock className="w-3.5 h-3.5" />
                            Liberar
                          </button>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => handleUpdate(slot.id, { delete: true })}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/10 text-[#E8EDED]/70 text-xs hover:bg-white/15 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
      )}
    </div>
  );
}

'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckSquare,
  Clock,
  Loader2,
  Pencil,
  Square,
  Trash2,
  X,
} from 'lucide-react';
import { nutriAgendaAuthFetch } from '@/lib/nutri/agenda/nutriAgendaAuthFetch';
import { deleteNutriAgendaSlot } from '@/lib/nutri/agenda/deleteNutriAgendaSlotClient';
import {
  PERIOD_PRESETS,
  SLOT_DURATION_OPTIONS,
  addDaysToDateKey,
  generateSlotsInRange,
  getBrazilDateKey,
  parseDateKey,
  type PeriodPresetId,
} from '@/lib/whiteLabel/availabilitySlotUtils';
import type { NutriAvailabilityApiRow, NutriAvailabilityStatus } from '@/types/nutriAgenda';
import MetanutriAgendaDayTimelineModal from '@/components/metanutri/agenda/MetanutriAgendaDayTimelineModal';
import EditarConsultaCalendarioModal from '@/components/profissional/EditarConsultaCalendarioModal';
import { useConfirmarApagarConsulta } from '@/components/profissional/ConfirmarApagarConsultaModal';

const inputCls =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500';

type DayRow = {
  date: string;
  slots: NutriAvailabilityApiRow[];
  available: number;
  reserved: number;
  blocked: number;
};

function formatDateLong(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

function monthLabel(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date.slice(0, 7);
  return new Date(parsed.year, parsed.month, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });
}

function StatusDot({ status }: { status: NutriAvailabilityStatus }) {
  const cls = {
    available: 'bg-emerald-500',
    reserved: 'bg-cyan-500',
    blocked: 'bg-red-500',
  }[status];
  return <span className={`inline-block h-1.5 w-1.5 rounded-full ${cls}`} />;
}

type Props = {
  onMutated?: () => void;
};

export default function MetanutriAgendaResumoPanel({ onMutated }: Props) {
  const today = useMemo(() => getBrazilDateKey(), []);
  const { confirmarApagarConsulta, confirmarApagarConsultaModal } = useConfirmarApagarConsulta();
  const [slots, setSlots] = useState<NutriAvailabilityApiRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete'>('idle');
  const [periodPreset, setPeriodPreset] = useState<PeriodPresetId>('manha');
  const [periodStart, setPeriodStart] = useState(PERIOD_PRESETS.manha.startTime);
  const [periodEnd, setPeriodEnd] = useState(PERIOD_PRESETS.manha.endTime);
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [timelineDate, setTimelineDate] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<NutriAvailabilityApiRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [consultaError, setConsultaError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        fromDate: today,
        toDate: addDaysToDateKey(today, 366),
      });
      const res = await nutriAgendaAuthFetch(`/api/metanutri/agenda/availability/list?${params}`);
      const data = (await res.json()) as { slots?: NutriAvailabilityApiRow[]; error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao carregar datas.');
      setSlots(data.slots || []);
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    void load();
  }, [load]);

  const days = useMemo<DayRow[]>(() => {
    const map = new Map<string, DayRow>();
    for (const slot of slots) {
      const current = map.get(slot.date) || {
        date: slot.date,
        slots: [],
        available: 0,
        reserved: 0,
        blocked: 0,
      };
      current.slots.push(slot);
      current[slot.status] += 1;
      map.set(slot.date, current);
    }
    return [...map.values()].sort((a, b) => a.date.localeCompare(b.date));
  }, [slots]);

  const grouped = useMemo(() => {
    const map = new Map<string, DayRow[]>();
    for (const day of days) {
      const key = day.date.slice(0, 7);
      const list = map.get(key) || [];
      list.push(day);
      map.set(key, list);
    }
    return [...map.entries()];
  }, [days]);

  const selectedDates = useMemo(() => days.filter((day) => selected.has(day.date)), [days, selected]);
  const allSelected = days.length > 0 && selectedDates.length === days.length;
  const previewSlots = useMemo(
    () => generateSlotsInRange(periodStart, periodEnd, durationMinutes),
    [periodStart, periodEnd, durationMinutes]
  );

  const toggleDate = (date: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });
    setMode('idle');
  };

  const toggleAll = () => {
    setSelected(allSelected ? new Set() : new Set(days.map((day) => day.date)));
    setMode('idle');
  };

  const deleteSlot = async (slot: NutriAvailabilityApiRow) => {
    setDeletingId(slot.id);
    setMessage(null);
    setConsultaError(null);
    try {
      await deleteNutriAgendaSlot(slot);
      if (editingSlot?.id === slot.id) setEditingSlot(null);
      await load();
      onMutated?.();
    } catch (err) {
      const text = (err as Error).message;
      setMessage({ type: 'err', text });
      setConsultaError(text);
    } finally {
      setDeletingId(null);
    }
  };

  const saveConsulta = async (input: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    observacoes: string;
  }) => {
    setDeletingId(input.id);
    setConsultaError(null);
    try {
      const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/meetings/update', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao salvar consulta.');
      setEditingSlot(null);
      await load();
      onMutated?.();
    } catch (err) {
      setConsultaError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const timelineSlots = timelineDate
    ? days.find((day) => day.date === timelineDate)?.slots || []
    : [];

  const applyBulk = async (action: 'delete' | 'replace') => {
    if (selectedDates.length === 0) {
      setMessage({ type: 'err', text: 'Selecione ao menos uma data.' });
      return;
    }
    setSaving(true);
    setMessage(null);
    try {
      const res = await nutriAgendaAuthFetch('/api/metanutri/agenda/availability/bulk', {
        method: 'POST',
        body: JSON.stringify(
          action === 'delete'
            ? { action: 'delete', dates: [...selected] }
            : {
                action: 'replace',
                dates: [...selected],
                periodStart,
                periodEnd,
                durationMinutes,
              }
        ),
      });
      const data = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || 'Falha ao aplicar a alteração.');
      setMessage({ type: 'ok', text: data.message || 'Alteração aplicada.' });
      setSelected(new Set());
      setMode('idle');
      await load();
      onMutated?.();
    } catch (err) {
      setMessage({ type: 'err', text: (err as Error).message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-4 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h4 className="text-base font-bold text-gray-900">Resumo das datas</h4>
            <p className="mt-0.5 text-sm text-gray-500">
              {days.length === 0
                ? 'Nenhuma data com horário definido à frente.'
                : `${days.length} data(s) com horários · ${slots.length} horário(s)`}
            </p>
          </div>
          {days.length > 0 ? (
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              {allSelected ? <CheckSquare className="h-3.5 w-3.5" /> : <Square className="h-3.5 w-3.5" />}
              {allSelected ? 'Limpar seleção' : 'Selecionar todas'}
            </button>
          ) : null}
        </div>

        {selectedDates.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-green-100 bg-green-50/70 px-3 py-2.5">
            <p className="mr-auto text-sm font-medium text-green-800">
              {selectedDates.length} data(s) selecionada(s)
            </p>
            <button
              type="button"
              disabled={saving}
              onClick={() => setMode(mode === 'edit' ? 'idle' : 'edit')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                mode === 'edit'
                  ? 'bg-green-700 text-white'
                  : 'bg-white text-green-800 border border-green-200 hover:bg-green-50'
              }`}
            >
              <Pencil className="h-3.5 w-3.5" />
              Editar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => setMode(mode === 'delete' ? 'idle' : 'delete')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50 ${
                mode === 'delete'
                  ? 'bg-red-700 text-white'
                  : 'bg-white text-red-700 border border-red-200 hover:bg-red-50'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Apagar
            </button>
          </div>
        ) : null}

        {mode === 'edit' && selectedDates.length > 0 ? (
          <div className="mt-3 space-y-3 rounded-xl border border-green-100 bg-green-50/40 p-3">
            <p className="text-sm font-medium text-gray-900">
              Substituir horários nas {selectedDates.length} data(s) selecionada(s)
            </p>
            <p className="text-xs text-gray-500">
              Os horários livres atuais são apagados. Consultas já agendadas permanecem.
            </p>
            <div className="flex flex-wrap gap-2">
              {(Object.keys(PERIOD_PRESETS) as Array<Exclude<PeriodPresetId, 'custom'>>).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setPeriodPreset(id);
                    setPeriodStart(PERIOD_PRESETS[id].startTime);
                    setPeriodEnd(PERIOD_PRESETS[id].endTime);
                  }}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium ${
                    periodPreset === id
                      ? 'border-green-600 bg-white text-green-700'
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {PERIOD_PRESETS[id].label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-xs text-gray-500">Início</label>
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
                <label className="mb-1 block text-xs text-gray-500">Término</label>
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
                <label className="mb-1 block text-xs text-gray-500">Duração</label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className={inputCls}
                >
                  {SLOT_DURATION_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {previewSlots.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {previewSlots.map((slot) => (
                  <span
                    key={`${slot.startTime}-${slot.endTime}`}
                    className="rounded-md border border-gray-200 bg-white px-2 py-1 text-[11px] text-gray-700"
                  >
                    {slot.startTime}–{slot.endTime}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-amber-700">Nenhum horário válido neste período.</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving || previewSlots.length === 0}
                onClick={() => void applyBulk('replace')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Pencil className="h-3.5 w-3.5" />}
                Aplicar em {selectedDates.length} data(s)
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('idle')}
                className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}

        {mode === 'delete' && selectedDates.length > 0 ? (
          <div className="mt-3 space-y-2 rounded-xl border border-red-100 bg-red-50 px-3 py-3 text-sm text-red-900">
            <p>
              Apagar horários livres de {selectedDates.length} data(s)? Consultas já agendadas são
              mantidas. Datas recorrentes deixam de gerar horário automaticamente.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void applyBulk('delete')}
                className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                Confirmar exclusão
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => setMode('idle')}
                className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {message ? (
        <div
          className={`rounded-xl px-4 py-3 text-sm ${
            message.type === 'ok'
              ? 'border border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border border-amber-200 bg-amber-50 text-amber-800'
          }`}
        >
          {message.text}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-green-600" />
          </div>
        ) : days.length === 0 ? (
          <p className="px-4 py-16 text-center text-sm text-gray-400">
            Ainda não há datas definidas. Crie horários no calendário ou na aba Recorrente.
          </p>
        ) : (
          grouped.map(([monthKey, monthDays]) => (
            <div key={monthKey} className="border-b border-gray-100 last:border-b-0">
              <div className="sticky top-0 z-[1] bg-gray-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                {monthLabel(monthDays[0].date)}
              </div>
              <div className="divide-y divide-gray-100">
                {monthDays.map((day) => {
                  const isChecked = selected.has(day.date);
                  return (
                    <div
                      key={day.date}
                      className={`flex items-start gap-3 px-4 py-3 transition ${
                        isChecked ? 'bg-green-50/60' : 'hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleDate(day.date)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                        aria-label={`Selecionar ${formatDateLong(day.date)}`}
                      />
                      <div className="min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => setTimelineDate(day.date)}
                          className="flex flex-wrap items-center gap-2 text-left"
                        >
                          <span className="text-sm font-semibold capitalize text-gray-900">
                            {formatDateLong(day.date)}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
                            <Clock className="h-3 w-3" />
                            {day.slots.length} horário(s)
                          </span>
                          {day.reserved > 0 ? (
                            <span className="rounded-full border border-cyan-200 bg-cyan-50 px-2 py-0.5 text-[10px] font-medium text-cyan-700">
                              {day.reserved} consulta(s)
                            </span>
                          ) : null}
                        </button>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {day.slots.map((slot) => (
                            <span
                              key={slot.id}
                              className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white py-0.5 pl-1.5 pr-0.5 text-[11px] tabular-nums text-gray-700"
                            >
                              <StatusDot status={slot.status} />
                              <button
                                type="button"
                                className="hover:text-gray-900"
                                onClick={() => setTimelineDate(day.date)}
                                title={
                                  slot.status === 'reserved'
                                    ? slot.pacienteNome || 'Consulta'
                                    : slot.startTime
                                }
                              >
                                {slot.startTime}–{slot.endTime}
                                {slot.status === 'reserved' && slot.pacienteNome
                                  ? ` · ${slot.pacienteNome.split(' ')[0]}`
                                  : ''}
                              </button>
                              <button
                                type="button"
                                title={slot.status === 'reserved' ? 'Apagar consulta' : 'Apagar horário'}
                                aria-label={
                                  slot.status === 'reserved'
                                    ? `Apagar consulta com ${slot.pacienteNome || 'paciente'}`
                                    : `Apagar horário ${slot.startTime}`
                                }
                                disabled={saving || deletingId === slot.id}
                                onClick={() => {
                                  if (slot.status === 'reserved') {
                                    confirmarApagarConsulta(slot.pacienteNome || 'Paciente', () => {
                                      void deleteSlot(slot);
                                    });
                                    return;
                                  }
                                  void deleteSlot(slot);
                                }}
                                className="inline-flex h-4 w-4 items-center justify-center rounded text-gray-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                              >
                                {deletingId === slot.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <X className="h-3 w-3" />
                                )}
                              </button>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {timelineDate ? (
        <MetanutriAgendaDayTimelineModal
          open
          date={timelineDate}
          slots={timelineSlots}
          saving={Boolean(deletingId)}
          onClose={() => setTimelineDate(null)}
          onEdit={(slot) => {
            setConsultaError(null);
            setEditingSlot(slot);
          }}
          onDelete={(slot) => void deleteSlot(slot)}
        />
      ) : null}

      {editingSlot ? (
        <EditarConsultaCalendarioModal
          consulta={{
            id: editingSlot.id,
            date: editingSlot.date,
            startTime: editingSlot.startTime,
            endTime: editingSlot.endTime,
            pacienteNome: editingSlot.pacienteNome || 'Paciente',
            pacienteId: editingSlot.pacienteId,
            observacoes: editingSlot.observacoes,
          }}
          saving={deletingId === editingSlot.id}
          error={consultaError}
          onClose={() => {
            if (deletingId) return;
            setEditingSlot(null);
            setConsultaError(null);
          }}
          onSave={saveConsulta}
          onDelete={(id) => {
            const slot = editingSlot.id === id ? editingSlot : timelineSlots.find((item) => item.id === id);
            if (slot) return deleteSlot(slot);
            return Promise.resolve();
          }}
        />
      ) : null}
      {confirmarApagarConsultaModal}
    </div>
  );
}

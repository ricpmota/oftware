'use client';

import { useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Pencil, X } from 'lucide-react';
import { parseDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { MedicoAvailabilityApiRow } from '@/types/medicoAgenda';
import { useConfirmarApagarConsulta } from '@/components/profissional/ConfirmarApagarConsultaModal';

const PX_PER_HOUR = 96;
const DEFAULT_START_HOUR = 7;
const DEFAULT_END_HOUR = 21;

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function formatDateLong(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function slotTone(status: MedicoAvailabilityApiRow['status']) {
  if (status === 'reserved') {
    return 'border-cyan-200 bg-cyan-50 text-cyan-950';
  }
  if (status === 'blocked') {
    return 'border-gray-200 bg-gray-100 text-gray-600';
  }
  return 'border-emerald-200 bg-emerald-50 text-emerald-950';
}

type Props = {
  open: boolean;
  date: string;
  slots: MedicoAvailabilityApiRow[];
  saving?: boolean;
  onClose: () => void;
  onEdit: (slot: MedicoAvailabilityApiRow) => void;
  onDelete: (slot: MedicoAvailabilityApiRow) => void;
};

export default function MetaadminAgendaDayTimelineModal({
  open,
  date,
  slots,
  saving,
  onClose,
  onEdit,
  onDelete,
}: Props) {
  const { confirmarApagarConsulta, confirmarApagarConsultaModal, apagarConsultaPendente } =
    useConfirmarApagarConsulta();
  const ordered = useMemo(
    () => [...slots].sort((a, b) => a.startTime.localeCompare(b.startTime)),
    [slots]
  );

  const { startHour, hourCount } = useMemo(() => {
    if (ordered.length === 0) {
      return { startHour: DEFAULT_START_HOUR, hourCount: DEFAULT_END_HOUR - DEFAULT_START_HOUR };
    }
    const minStart = Math.min(...ordered.map((slot) => timeToMinutes(slot.startTime)));
    const maxEnd = Math.max(...ordered.map((slot) => timeToMinutes(slot.endTime)));
    const start = Math.max(0, Math.min(DEFAULT_START_HOUR, Math.floor(minStart / 60)));
    const end = Math.min(24, Math.max(DEFAULT_END_HOUR, Math.ceil(maxEnd / 60)));
    return { startHour: start, hourCount: Math.max(1, end - start) };
  }, [ordered]);

  const hours = useMemo(
    () => Array.from({ length: hourCount + 1 }, (_, i) => startHour + i),
    [startHour, hourCount]
  );

  const reservedCount = ordered.filter((slot) => slot.status === 'reserved').length;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (apagarConsultaPendente) return;
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose, apagarConsultaPendente]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <>
    <div className="fixed inset-0 z-[85] flex items-stretch justify-center bg-black/50 sm:items-center sm:p-4">
      <button type="button" className="absolute inset-0 hidden sm:block" aria-label="Fechar" onClick={onClose} />
      <div
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl sm:h-auto sm:max-h-[90vh] sm:max-w-lg sm:rounded-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="medico-day-timeline-title"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-gray-100 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-green-700">Agenda do dia</p>
            <h3 id="medico-day-timeline-title" className="mt-0.5 truncate text-lg font-bold capitalize text-gray-900">
              {formatDateLong(date)}
            </h3>
            <p className="mt-0.5 text-sm text-gray-500">
              {ordered.length === 0
                ? 'Nenhum horário neste dia'
                : `${ordered.length} horário(s)${reservedCount ? ` · ${reservedCount} consulta(s)` : ''}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5">
          {ordered.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-400">
              Não há horários definidos neste dia. Crie no calendário ou na aba Recorrente.
            </p>
          ) : (
            <div className="relative" style={{ height: hourCount * PX_PER_HOUR }}>
              {hours.map((hour, index) => (
                <div
                  key={hour}
                  className="absolute inset-x-0 flex"
                  style={{ top: index * PX_PER_HOUR, height: PX_PER_HOUR }}
                >
                  <div className="w-12 shrink-0 -translate-y-2 pr-2 text-right text-[11px] tabular-nums text-gray-400">
                    {String(hour).padStart(2, '0')}:00
                  </div>
                  <div className="flex-1 border-t border-gray-100" />
                </div>
              ))}

              {ordered.map((slot) => {
                const start = timeToMinutes(slot.startTime) - startHour * 60;
                const end = timeToMinutes(slot.endTime) - startHour * 60;
                const top = Math.max(0, (start / 60) * PX_PER_HOUR);
                const durationPx = ((end - start) / 60) * PX_PER_HOUR;
                const height = Math.max(2, durationPx - 2);
                const label =
                  slot.status === 'reserved'
                    ? slot.pacienteNome || 'Paciente'
                    : slot.status === 'blocked'
                      ? 'Bloqueado'
                      : 'Livre';
                return (
                  <div
                    key={slot.id}
                    className={`absolute right-0 left-12 overflow-hidden rounded-md border px-2 ${slotTone(slot.status)}`}
                    style={{ top, height }}
                  >
                    <div className="flex h-full min-w-0 items-center gap-1.5">
                      <p className="min-w-0 flex-1 truncate text-[11px] leading-none">
                        <span className="font-semibold tabular-nums">{slot.startTime}–{slot.endTime}</span>
                        <span className="text-current/70"> · </span>
                        <span>{label}</span>
                      </p>
                      <div className="flex shrink-0 items-center gap-0.5">
                        {slot.status === 'reserved' ? (
                          <button
                            type="button"
                            title="Editar consulta"
                            aria-label="Editar consulta"
                            disabled={saving}
                            onClick={() => onEdit(slot)}
                            className="inline-flex h-5 w-5 items-center justify-center rounded text-cyan-800 hover:bg-white/80 disabled:opacity-50"
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        ) : null}
                        <button
                          type="button"
                          title={slot.status === 'reserved' ? 'Apagar consulta' : 'Apagar horário'}
                          aria-label={slot.status === 'reserved' ? 'Apagar consulta' : 'Apagar horário'}
                          disabled={saving}
                          onClick={() => {
                            if (slot.status === 'reserved') {
                              confirmarApagarConsulta(slot.pacienteNome || 'Paciente', () => onDelete(slot));
                              return;
                            }
                            onDelete(slot);
                          }}
                          className="inline-flex h-5 w-5 items-center justify-center rounded text-gray-500 hover:bg-white/80 hover:text-red-600 disabled:opacity-50"
                        >
                          {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
    {confirmarApagarConsultaModal}
    </>,
    document.body
  );
}

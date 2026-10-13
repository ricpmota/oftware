'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Loader2, Trash2, Video, X } from 'lucide-react';
import type { ConsultaCalendarioItem } from '@/components/profissional/ProfissionalCalendarioSection';
import ConfirmarApagarConsultaModal from '@/components/profissional/ConfirmarApagarConsultaModal';

type Props = {
  consulta: ConsultaCalendarioItem;
  saving?: boolean;
  error?: string | null;
  onClose: () => void;
  onSave: (input: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    observacoes: string;
  }) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
};

const inputCls =
  'w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-cyan-500';

export default function EditarConsultaCalendarioModal({
  consulta,
  saving,
  error,
  onClose,
  onSave,
  onDelete,
}: Props) {
  const [date, setDate] = useState(consulta.date);
  const [startTime, setStartTime] = useState(consulta.startTime);
  const [endTime, setEndTime] = useState(consulta.endTime);
  const [observacoes, setObservacoes] = useState(consulta.observacoes || '');
  const [confirmandoDelete, setConfirmandoDelete] = useState(false);
  const horarioMudou =
    date !== consulta.date || startTime !== consulta.startTime || endTime !== consulta.endTime;

  useEffect(() => {
    setDate(consulta.date);
    setStartTime(consulta.startTime);
    setEndTime(consulta.endTime);
    setObservacoes(consulta.observacoes || '');
    setConfirmandoDelete(false);
  }, [consulta]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return createPortal(
    <>
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fechar" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-gray-900 inline-flex items-center gap-2">
              <Video className="w-5 h-5 text-cyan-700" />
              Editar consulta
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">{consulta.pacienteNome}</p>
          </div>
          <button type="button" onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="rounded-xl px-3 py-2 text-sm bg-amber-50 text-amber-800 border border-amber-200">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Data</label>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Início</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Término</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Observações da consulta</label>
            <textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              rows={4}
              placeholder="Ex.: paciente pediu para adiantar, confirmar no WhatsApp..."
              className={inputCls}
            />
          </div>
          {horarioMudou ? (
            <p className="text-xs text-cyan-800 bg-cyan-50 border border-cyan-100 rounded-lg px-3 py-2">
              O paciente será avisado no WhatsApp, em seu nome, sobre a mudança de horário.
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-2 pt-1">
          {onDelete ? (
            <button
              type="button"
              onClick={() => setConfirmandoDelete(true)}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Apagar
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !date || !startTime || !endTime}
              onClick={() =>
                void onSave({
                  id: consulta.id,
                  date,
                  startTime,
                  endTime,
                  observacoes,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-cyan-700 text-white hover:bg-cyan-800 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Salvar consulta
            </button>
          </div>
        </div>
      </div>
    </div>
    {confirmandoDelete && onDelete ? (
      <ConfirmarApagarConsultaModal
        pacienteNome={consulta.pacienteNome}
        onNao={() => setConfirmandoDelete(false)}
        onSim={() => {
          setConfirmandoDelete(false);
          void onDelete(consulta.id);
        }}
      />
    ) : null}
    </>,
    document.body
  );
}

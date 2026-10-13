'use client';

import { Calendar, Clock, Mail, Phone, Stethoscope, User } from 'lucide-react';
import type { MedicoAvailabilityApiRow } from '@/types/medicoAgenda';

type Props = {
  slot: MedicoAvailabilityApiRow;
  pacienteNome: string;
  pacienteEmail: string;
  pacientePhone: string;
  medicoNome: string;
};

function formatDateLong(date: string): string {
  const parsed = new Date(`${date}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  return raw;
}

function durationMinutes(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number);
  const [eh, em] = endTime.split(':').map(Number);
  return eh * 60 + em - (sh * 60 + sm);
}

export default function MetaPacienteConsultaReview({
  slot,
  pacienteNome,
  pacienteEmail,
  pacientePhone,
  medicoNome,
}: Props) {
  const duration = durationMinutes(slot.startTime, slot.endTime);

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seus dados</p>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Nome</p>
              <p className="text-sm font-medium text-slate-900 truncate">{pacienteNome || 'Paciente'}</p>
            </div>
          </div>
          {pacienteEmail ? (
            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
              <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">E-mail</p>
                <p className="text-sm font-medium text-slate-900 break-all">{pacienteEmail}</p>
              </div>
            </div>
          ) : null}
          {pacientePhone ? (
            <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
              <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-slate-500">WhatsApp</p>
                <p className="text-sm font-medium text-slate-900">{formatPhone(pacientePhone)}</p>
              </div>
            </div>
          ) : null}
          <div className="flex items-center gap-3 py-2.5">
            <Stethoscope className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Médico</p>
              <p className="text-sm font-medium text-slate-900 truncate">{medicoNome || 'Médico'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-200/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">Horário da consulta</p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-800/70">Data</p>
              <p className="text-sm font-semibold text-emerald-950 capitalize">{formatDateLong(slot.date)}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-800/70">Horário</p>
              <p className="text-sm font-semibold text-emerald-950">
                {slot.startTime} – {slot.endTime}
              </p>
              {duration > 0 ? (
                <p className="text-xs text-emerald-800/60 mt-0.5">Duração estimada: {duration} min</p>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

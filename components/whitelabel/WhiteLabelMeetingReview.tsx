'use client';

import { Calendar, Clock, Mail, Phone, User } from 'lucide-react';
import { formatLeadWhiteLabelWhatsAppDisplay } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { slotDurationMinutes } from '@/lib/whiteLabel/clientTrackingEvents';
import type { WhiteLabelAvailabilityApiRow } from '@/types/whiteLabelAvailability';

type FormState = Record<string, string>;

type Props = {
  form: FormState;
  slot: WhiteLabelAvailabilityApiRow;
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

function optionalRow(label: string, value?: string) {
  if (!value?.trim()) return null;
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900 text-right">{value}</span>
    </div>
  );
}

export default function WhiteLabelMeetingReview({ form, slot }: Props) {
  const duration = slotDurationMinutes(slot.startTime, slot.endTime);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-semibold text-slate-900 leading-snug">
          Revise sua reunião
        </h2>
        <p className="text-sm text-slate-600 mt-2 leading-relaxed">
          Você está a um passo de entender como transformar sua experiência médica em uma operação
          digital escalável.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          Confira seus dados antes de confirmar. O convite será enviado para o e-mail informado.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Seus dados</p>
        </div>
        <div className="px-4 py-2">
          <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
            <User className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Nome</p>
              <p className="text-sm font-medium text-slate-900 truncate">{form.nome}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2.5 border-b border-slate-100">
            <Mail className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">E-mail</p>
              <p className="text-sm font-medium text-slate-900 break-all">{form.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 py-2.5">
            <Phone className="w-4 h-4 text-emerald-600 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs text-slate-500">WhatsApp</p>
              <p className="text-sm font-medium text-slate-900">
                {formatLeadWhiteLabelWhatsAppDisplay(form.whatsapp)}
              </p>
            </div>
          </div>
          {optionalRow('CRM/UF', form.crmMedico)}
          {optionalRow('Especialidade', form.especialidade)}
          {optionalRow('Cidade', form.cidade)}
          {optionalRow('Estado', form.estado)}
        </div>
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 overflow-hidden">
        <div className="px-4 py-3 border-b border-emerald-200/60">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
            Horário da reunião
          </p>
        </div>
        <div className="px-4 py-4 space-y-3">
          <div className="flex items-start gap-3">
            <Calendar className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-800/70">Data</p>
              <p className="text-sm font-semibold text-emerald-950 capitalize">
                {formatDateLong(slot.date)}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="text-xs text-emerald-800/70">Horário</p>
              <p className="text-sm font-semibold text-emerald-950">
                {slot.startTime} – {slot.endTime}
              </p>
              <p className="text-xs text-emerald-800/60 mt-0.5">Duração estimada: {duration} min</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

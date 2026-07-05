'use client';

import { motion } from 'framer-motion';
import { CalendarPlus, CheckCircle2, ExternalLink, Video } from 'lucide-react';
import { buildGoogleCalendarAddUrl } from '@/lib/whiteLabel/clientTrackingEvents';
import Link from 'next/link';

type MeetingInfo = {
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink?: string;
  status: 'scheduled' | 'error';
};

type Props = {
  meeting: MeetingInfo;
  doctorName: string;
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

export default function WhiteLabelMeetingSuccess({ meeting, doctorName }: Props) {
  const hasMeet = meeting.status === 'scheduled' && !!meeting.googleMeetLink;
  const calendarUrl = buildGoogleCalendarAddUrl({
    date: meeting.date,
    startTime: meeting.startTime,
    endTime: meeting.endTime,
    title: `Reunião White Label Oftware — ${doctorName}`,
    details: hasMeet ? `Link da reunião: ${meeting.googleMeetLink}` : undefined,
    location: meeting.googleMeetLink,
  });

  return (
    <div className="min-h-dvh bg-gradient-to-b from-slate-50 to-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50 overflow-hidden">
            <div className="bg-gradient-to-br from-emerald-500 to-teal-600 px-6 py-8 text-center text-white">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h1 className="text-2xl font-bold">Reunião confirmada</h1>
            </div>

            <div className="px-6 py-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed text-center">
                Sua reunião foi confirmada. Vamos analisar seu perfil e mostrar o melhor caminho para
                estruturar sua operação White Label.
              </p>

              <div className="rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 space-y-1">
                <p className="text-xs text-slate-500 uppercase tracking-wide font-medium">Quando</p>
                <p className="text-sm font-semibold text-slate-900 capitalize">
                  {formatDateLong(meeting.date)}
                </p>
                <p className="text-sm text-slate-700">
                  {meeting.startTime} – {meeting.endTime}
                </p>
              </div>

              {hasMeet ? (
                <p className="text-sm text-slate-600 text-center leading-relaxed">
                  Enviamos o convite para o seu e-mail. No horário marcado, acesse o link da reunião.
                </p>
              ) : (
                <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-center">
                  Seu horário foi reservado. Nossa equipe enviará o convite em instantes.
                </p>
              )}

              <div className="flex flex-col gap-2 pt-2">
                {hasMeet && (
                  <a
                    href={meeting.googleMeetLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 transition-all"
                  >
                    <Video className="w-4 h-4" />
                    Abrir Google Meet
                    <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                  </a>
                )}
                <a
                  href={calendarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl font-medium text-sm text-slate-700 border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Adicionar ao Google Agenda
                </a>
                <Link
                  href="/"
                  className="inline-flex items-center justify-center w-full px-4 py-3 rounded-xl font-medium text-sm text-emerald-700 hover:text-emerald-800 transition-colors"
                >
                  Voltar para o site da Oftware
                </Link>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

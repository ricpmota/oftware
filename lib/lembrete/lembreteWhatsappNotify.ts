import { brasiliaWallTimeToInstant, parseHorarioBrasil } from '@/lib/time/brasilTimezone';
import type { Lembrete, LembreteAvisoWhatsApp } from '@/types/lembrete';

export const LEMBRETE_AVISO_WHATSAPP_OPTIONS: Array<{
  value: LembreteAvisoWhatsApp;
  label: string;
}> = [
  { value: 'no_horario', label: 'No horário do lembrete' },
  { value: '30_min_antes', label: '30 minutos antes' },
  { value: '1_hora_antes', label: '1 hora antes' },
  { value: 'disabled', label: 'Não notificar no WhatsApp' },
];

export function computeLembreteNotificarEm(
  data: string,
  horario: string | undefined,
  aviso: LembreteAvisoWhatsApp | undefined,
): Date | null {
  const hhmm = horario ? parseHorarioBrasil(horario) : null;
  if (!hhmm || !data.trim()) return null;
  if (!aviso || aviso === 'disabled') return null;

  const eventAt = brasiliaWallTimeToInstant(data.trim(), hhmm);
  if (aviso === 'no_horario') return eventAt;
  if (aviso === '30_min_antes') return new Date(eventAt.getTime() - 30 * 60_000);
  if (aviso === '1_hora_antes') return new Date(eventAt.getTime() - 60 * 60_000);
  return null;
}

export function buildLembreteWhatsappNotifyFields(input: {
  data: string;
  horario?: string;
  avisoWhatsApp?: LembreteAvisoWhatsApp;
}): Pick<
  Lembrete,
  'horario' | 'avisoWhatsApp' | 'notificarEm' | 'whatsappNotifyStatus' | 'whatsappNotifyError' | 'whatsappNotificadoEm'
> {
  const horario = input.horario ? parseHorarioBrasil(input.horario) ?? undefined : undefined;
  const avisoWhatsApp: LembreteAvisoWhatsApp =
    !horario ? 'disabled' : input.avisoWhatsApp ?? 'no_horario';
  const notificarEm = computeLembreteNotificarEm(input.data, horario, avisoWhatsApp);

  if (!notificarEm) {
    return {
      horario,
      avisoWhatsApp: horario ? avisoWhatsApp : 'disabled',
      notificarEm: undefined,
      whatsappNotifyStatus: 'skipped',
      whatsappNotifyError: undefined,
      whatsappNotificadoEm: undefined,
    };
  }

  return {
    horario,
    avisoWhatsApp,
    notificarEm,
    whatsappNotifyStatus: 'pending',
    whatsappNotifyError: undefined,
    whatsappNotificadoEm: undefined,
  };
}

export function buildCalendarioLembreteWhatsappMessage(lembrete: {
  texto: string;
  tag: string;
  pacienteNome: string;
  data: string;
  horario?: string;
}): string {
  const quando = lembrete.horario
    ? `${lembrete.data} às ${lembrete.horario}`
    : lembrete.data;
  return [
    `⏰ Lembrete do calendário (${lembrete.tag})`,
    ``,
    lembrete.texto.trim(),
    ``,
    `Paciente: ${lembrete.pacienteNome}`,
    `Quando: ${quando} (Brasília)`,
  ].join('\n');
}

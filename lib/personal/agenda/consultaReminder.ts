import { parseDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { PersonalConsultaReminderAviso } from '@/types/personalAgenda';
import { PERSONAL_CONSULTA_REMINDER_OPTIONS } from '@/types/personalAgenda';

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'olá';
}

export function formatConsultaDiaPt(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function parsePersonalConsultaReminderAviso(
  value: unknown,
  fallback: PersonalConsultaReminderAviso = '30_min_antes'
): PersonalConsultaReminderAviso {
  if (
    value === 'no_horario' ||
    value === '30_min_antes' ||
    value === '1_hora_antes'
  ) {
    return value;
  }
  return fallback;
}

export function personalConsultaReminderLabel(aviso: PersonalConsultaReminderAviso): string {
  return PERSONAL_CONSULTA_REMINDER_OPTIONS.find((o) => o.value === aviso)?.label ?? aviso;
}

export function buildPersonalConsultaReminderTexto(input: {
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = input.pacienteNome.trim() || 'Paciente';
  return [
    `Consulta de avaliação (personal) com ${nome}.`,
    `Horário: ${input.startTime} às ${input.endTime} (Brasília).`,
  ].join('\n');
}

export function buildPersonalConsultaConfirmacaoPacienteTexto(input: {
  pacienteNome: string;
  personalNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const personal = input.personalNome.trim() || 'seu personal';
  const dia = formatConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Sua consulta com ${personal} está confirmada.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} às ${input.endTime} (horário de Brasília)`,
    ``,
    `Qualquer imprevisto, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    personal,
  ].join('\n');
}

export function buildPersonalConsultaLembretePacienteTexto(input: {
  pacienteNome: string;
  personalNome: string;
  date: string;
  startTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const personal = input.personalNome.trim() || 'seu personal';
  const dia = formatConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Lembrete: sua consulta com ${personal} começa em 30 minutos.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} (horário de Brasília)`,
    ``,
    `Estou à disposição neste WhatsApp.`,
    ``,
    `Até já,`,
    personal,
  ].join('\n');
}

function blocoHorarioConsulta(date: string, startTime: string, endTime?: string): string[] {
  const dia = formatConsultaDiaPt(date);
  const horario = endTime
    ? `${startTime} às ${endTime} (horário de Brasília)`
    : `${startTime} (horário de Brasília)`;
  return [`📅 ${dia}`, `🕐 ${horario}`];
}

export function buildPersonalConsultaRemarcacaoPacienteTexto(input: {
  pacienteNome: string;
  personalNome: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const personal = input.personalNome.trim() || 'seu personal';
  return [
    `Olá, ${nome}!`,
    ``,
    `Informo que sua consulta com ${personal} foi remarcada.`,
    ``,
    `Horário anterior:`,
    ...blocoHorarioConsulta(input.oldDate, input.oldStartTime, input.oldEndTime),
    ``,
    `Novo horário:`,
    ...blocoHorarioConsulta(input.date, input.startTime, input.endTime),
    ``,
    `Qualquer imprevisto, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    personal,
  ].join('\n');
}

export function buildPersonalConsultaCancelamentoPacienteTexto(input: {
  pacienteNome: string;
  personalNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const personal = input.personalNome.trim() || 'seu personal';
  return [
    `Olá, ${nome}!`,
    ``,
    `Informo que sua consulta com ${personal} foi cancelada.`,
    ``,
    ...blocoHorarioConsulta(input.date, input.startTime, input.endTime),
    ``,
    `Quando quiser remarcar, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    personal,
  ].join('\n');
}

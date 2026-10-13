import { parseDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';
import type { NutriConsultaReminderAviso } from '@/types/nutriAgenda';
import { NUTRI_CONSULTA_REMINDER_OPTIONS } from '@/types/nutriAgenda';

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

export function parseNutriConsultaReminderAviso(
  value: unknown,
  fallback: NutriConsultaReminderAviso = '30_min_antes'
): NutriConsultaReminderAviso {
  if (
    value === 'no_horario' ||
    value === '30_min_antes' ||
    value === '1_hora_antes'
  ) {
    return value;
  }
  return fallback;
}

export function nutriConsultaReminderLabel(aviso: NutriConsultaReminderAviso): string {
  return NUTRI_CONSULTA_REMINDER_OPTIONS.find((o) => o.value === aviso)?.label ?? aviso;
}

export function buildNutriConsultaReminderTexto(input: {
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = input.pacienteNome.trim() || 'Paciente';
  return [
    `Consulta nutricional com ${nome}.`,
    `Horário: ${input.startTime} às ${input.endTime} (Brasília).`,
  ].join('\n');
}

export function buildNutriConsultaConfirmacaoPacienteTexto(input: {
  pacienteNome: string;
  nutriNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'sua nutricionista';
  const dia = formatConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Sua consulta nutricional com ${nutri} está confirmada.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} às ${input.endTime} (horário de Brasília)`,
    ``,
    `Qualquer imprevisto, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    nutri,
  ].join('\n');
}

export function buildNutriConsultaLembretePacienteTexto(input: {
  pacienteNome: string;
  nutriNome: string;
  date: string;
  startTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'sua nutricionista';
  const dia = formatConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Lembrete: sua consulta nutricional com ${nutri} começa em 30 minutos.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} (horário de Brasília)`,
    ``,
    `Estou à disposição neste WhatsApp.`,
    ``,
    `Até já,`,
    nutri,
  ].join('\n');
}

function blocoHorarioConsulta(date: string, startTime: string, endTime?: string): string[] {
  const dia = formatConsultaDiaPt(date);
  const horario = endTime
    ? `${startTime} às ${endTime} (horário de Brasília)`
    : `${startTime} (horário de Brasília)`;
  return [`📅 ${dia}`, `🕐 ${horario}`];
}

export function buildNutriConsultaRemarcacaoPacienteTexto(input: {
  pacienteNome: string;
  nutriNome: string;
  oldDate: string;
  oldStartTime: string;
  oldEndTime: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'sua nutricionista';
  return [
    `Olá, ${nome}!`,
    ``,
    `Informo que sua consulta nutricional com ${nutri} foi remarcada.`,
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
    nutri,
  ].join('\n');
}

export function buildNutriConsultaCancelamentoPacienteTexto(input: {
  pacienteNome: string;
  nutriNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const nutri = input.nutriNome.trim() || 'sua nutricionista';
  return [
    `Olá, ${nome}!`,
    ``,
    `Informo que sua consulta nutricional com ${nutri} foi cancelada.`,
    ``,
    ...blocoHorarioConsulta(input.date, input.startTime, input.endTime),
    ``,
    `Quando quiser remarcar, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    nutri,
  ].join('\n');
}

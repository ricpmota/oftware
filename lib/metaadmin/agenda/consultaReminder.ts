import { parseDateKey } from '@/lib/whiteLabel/availabilitySlotUtils';

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'olá';
}

export function formatMedicoConsultaDiaPt(date: string): string {
  const parsed = parseDateKey(date);
  if (!parsed) return date;
  return new Date(parsed.year, parsed.month, parsed.day).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
}

export function buildMedicoConsultaReminderTexto(input: {
  pacienteNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = input.pacienteNome.trim() || 'Paciente';
  return [
    `Consulta com ${nome}.`,
    `Horário: ${input.startTime} às ${input.endTime} (Brasília).`,
  ].join('\n');
}

export function buildMedicoConsultaConfirmacaoPacienteTexto(input: {
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const dia = formatMedicoConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Sua consulta com ${medico} está confirmada.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} às ${input.endTime} (horário de Brasília)`,
    ``,
    `Qualquer imprevisto, me chame neste WhatsApp.`,
    ``,
    `Até breve,`,
    medico,
  ].join('\n');
}

export function buildMedicoConsultaLembretePacienteTexto(input: {
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const dia = formatMedicoConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Lembrete: sua consulta com ${medico} começa em 30 minutos.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} (horário de Brasília)`,
  ].join('\n');
}

/** Confirmação pelo Canal Chat (sem “me chame neste WhatsApp” — o remetente não é o médico). */
export function buildMedicoConsultaConfirmacaoPacienteCanalChatTexto(input: {
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const nome = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const dia = formatMedicoConsultaDiaPt(input.date);
  return [
    `Olá, ${nome}!`,
    ``,
    `Sua consulta com ${medico} está confirmada.`,
    ``,
    `📅 ${dia}`,
    `🕐 ${input.startTime} às ${input.endTime} (horário de Brasília)`,
  ].join('\n');
}

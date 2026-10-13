import {
  DEFAULT_MEDICO_CONFIRMACAO_MESSAGE,
  LEGACY_MEDICO_WELCOME_MESSAGE,
} from '@/lib/metaadmin/agenda/agendaDefaults';
import { formatMedicoConsultaDiaPt } from '@/lib/metaadmin/agenda/consultaReminder';
import {
  MEDICO_CONSULTA_CTA_INICIO_PLACEHOLDER,
  MEDICO_CONSULTA_DATA_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_FIM_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_INICIO_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_PLACEHOLDER,
  MEDICO_CONSULTA_LINK_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
} from '@/types/medicoAgenda';

export function parseMedicoConsultaReminderAviso(
  value: unknown,
  fallback: 'no_horario' | '30_min_antes' | '1_hora_antes' = '30_min_antes'
): 'no_horario' | '30_min_antes' | '1_hora_antes' {
  if (value === 'no_horario' || value === '30_min_antes' || value === '1_hora_antes') {
    return value;
  }
  return fallback;
}

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'olá';
}

export function isLegacyMedicoWelcomeTemplate(template: string): boolean {
  return template.trim() === LEGACY_MEDICO_WELCOME_MESSAGE.trim();
}

export function normalizeMedicoConfirmacaoTemplate(template: string): string {
  const raw = (template || '').trim();
  if (!raw || isLegacyMedicoWelcomeTemplate(raw)) return DEFAULT_MEDICO_CONFIRMACAO_MESSAGE;
  return raw;
}

/** @deprecated Mantido para templates antigos que ainda incluem o link. */
export function ensureWelcomeMessageHasLink(template: string): string {
  return normalizeMedicoConfirmacaoTemplate(template);
}

export function applyWelcomeCta(template: string, _anamnesePreenchida: boolean): string {
  return template.replaceAll(MEDICO_CONSULTA_CTA_INICIO_PLACEHOLDER, '');
}

export function renderMedicoConsultaConfirmacaoTexto(input: {
  template?: string;
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): string {
  const medico = input.medicoNome.trim() || 'seu médico';
  const dia = formatMedicoConsultaDiaPt(input.date);
  const horario = `${input.startTime} às ${input.endTime}`;
  const template = normalizeMedicoConfirmacaoTemplate(input.template || '');

  return template
    .replaceAll(MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER, primeiroNome(input.pacienteNome))
    .replaceAll(MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER, medico)
    .replaceAll(MEDICO_CONSULTA_DATA_PLACEHOLDER, dia)
    .replaceAll(MEDICO_CONSULTA_HORARIO_PLACEHOLDER, horario)
    .replaceAll(MEDICO_CONSULTA_HORARIO_INICIO_PLACEHOLDER, input.startTime)
    .replaceAll(MEDICO_CONSULTA_HORARIO_FIM_PLACEHOLDER, input.endTime)
    .replaceAll(MEDICO_CONSULTA_LINK_PLACEHOLDER, '')
    .replaceAll(MEDICO_CONSULTA_CTA_INICIO_PLACEHOLDER, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

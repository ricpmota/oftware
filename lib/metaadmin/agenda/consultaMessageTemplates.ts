import { renderAutomationTemplate } from '@/lib/metaadmingeral/renderAutomationTemplate';
import {
  MEDICO_CONSULTA_DATA_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_FIM_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_INICIO_PLACEHOLDER,
  MEDICO_CONSULTA_HORARIO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
} from '@/types/medicoAgenda';
import { formatMedicoConsultaDiaPt } from '@/lib/metaadmin/agenda/consultaReminder';

export const DEFAULT_CONSULTA_CONFIRMACAO_BODY = `Olá, {nome}!

Sua consulta com {medico} está confirmada.

📅 {data}
🕐 {horario} (horário de Brasília)

Qualquer imprevisto, me chame neste WhatsApp.

Até breve,
{medico}`;

export const DEFAULT_CONSULTA_LEMBRETE_PACIENTE_BODY = `Olá, {nome}!

Lembrete: sua consulta com {medico} começa em 30 minutos.

📅 {data}
🕐 {horario_inicio} (horário de Brasília)`;

export const DEFAULT_CONSULTA_LEMBRETE_MEDICO_BODY = `Consulta com {paciente}.
Horário: {horario} (Brasília).`;

/** Nomes internos de `{{nome_paciente}}` etc. — aceitos na edição da confirmação. */
export const CONSULTA_CONFIRMACAO_LEGACY_VARIABLE_NAMES = [
  'nome_paciente',
  'nome_medico',
  'data_consulta',
  'link_agendamento',
  'cta_inicio',
] as const;

export const DEFAULT_SOLICITACAO_ACOMPANHAMENTO_BODY = `Olá, {medico}!

O paciente {paciente} solicitou acompanhamento e está aguardando aprovação.

Abra o painel de pacientes para aceitar:
{link}`;

export type ConsultaTemplateVars = {
  nome: string;
  medico: string;
  data: string;
  horario: string;
  horario_inicio: string;
  horario_fim: string;
  paciente?: string;
};

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/).find((part) => part.length > 0);
  return first || 'olá';
}

export function buildConsultaTemplateVars(input: {
  pacienteNome: string;
  medicoNome: string;
  date: string;
  startTime: string;
  endTime: string;
}): ConsultaTemplateVars {
  const nome = primeiroNome(input.pacienteNome);
  const medico = input.medicoNome.trim() || 'seu médico';
  const paciente = input.pacienteNome.trim() || 'Paciente';
  const data = formatMedicoConsultaDiaPt(input.date);
  const horario = `${input.startTime} às ${input.endTime}`;
  return {
    nome,
    medico,
    data,
    horario,
    horario_inicio: input.startTime,
    horario_fim: input.endTime,
    paciente,
  };
}

/** Aceita `{nome}` (automações) e `{{nome_paciente}}` (agenda antiga). */
export function renderConsultaMessageTemplate(
  body: string,
  vars: ConsultaTemplateVars,
): string {
  const withLegacy = body
    .replaceAll(MEDICO_CONSULTA_NOME_PACIENTE_PLACEHOLDER, vars.nome)
    .replaceAll(MEDICO_CONSULTA_NOME_MEDICO_PLACEHOLDER, vars.medico)
    .replaceAll(MEDICO_CONSULTA_DATA_PLACEHOLDER, vars.data)
    .replaceAll(MEDICO_CONSULTA_HORARIO_PLACEHOLDER, vars.horario)
    .replaceAll(MEDICO_CONSULTA_HORARIO_INICIO_PLACEHOLDER, vars.horario_inicio)
    .replaceAll(MEDICO_CONSULTA_HORARIO_FIM_PLACEHOLDER, vars.horario_fim);

  return renderAutomationTemplate(withLegacy, {
    nome: vars.nome,
    medico: vars.medico,
    data: vars.data,
    horario: vars.horario,
    horario_inicio: vars.horario_inicio,
    horario_fim: vars.horario_fim,
    paciente: vars.paciente || vars.nome,
  })
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

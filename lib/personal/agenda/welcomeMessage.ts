import { DEFAULT_PERSONAL_WELCOME_MESSAGE } from '@/lib/personal/agenda/agendaDefaults';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { formatNomeMedicoAssinatura } from '@/lib/pacienteMensagem/assinaturaMensagem';
import {
  PERSONAL_CONSULTA_CTA_INICIO_PLACEHOLDER,
  PERSONAL_CONSULTA_LINK_PLACEHOLDER,
  PERSONAL_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  PERSONAL_CONSULTA_NOME_PERSONAL_PLACEHOLDER,
  PERSONAL_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
} from '@/types/personalAgenda';

function primeiroNome(nomeCompleto: string): string {
  const first = nomeCompleto.trim().split(/\s+/)[0];
  return first || 'olá';
}

/** Garante Dr./Dra. no nome do médico (não duplica se já tiver o título). */
export function formatNomeMedicoWelcome(
  nome: string,
  genero?: 'M' | 'F' | '' | null
): string {
  const n = nome.trim();
  if (!n || /^seu médico$/i.test(n)) return n || 'seu médico';
  return formatNomeMedicoAssinatura({ nome: n, genero, fallback: 'seu médico' });
}

export const CTA_ANAMNESE_PENDENTE =
  'Para começar, preencha sua anamnese de treino e escolha o horário da nossa primeira consulta:';
export const CTA_ANAMNESE_FEITA =
  'Para começar, escolha o horário da nossa primeira consulta:';

export function ctaInicioConsulta(anamnesePreenchida: boolean): string {
  return anamnesePreenchida ? CTA_ANAMNESE_FEITA : CTA_ANAMNESE_PENDENTE;
}

/** Ajusta o pedido de anamnese conforme o paciente já tenha respondido o questionário. */
export function applyWelcomeCta(template: string, anamnesePreenchida: boolean): string {
  const cta = ctaInicioConsulta(anamnesePreenchida);
  let out = template.replaceAll(PERSONAL_CONSULTA_CTA_INICIO_PLACEHOLDER, cta);
  if (anamnesePreenchida) {
    out = out.replaceAll(CTA_ANAMNESE_PENDENTE, CTA_ANAMNESE_FEITA);
  } else {
    out = out.replaceAll(CTA_ANAMNESE_FEITA, CTA_ANAMNESE_PENDENTE);
  }
  return out;
}

/** Garante que o placeholder do link exista. O personal não pode removê-lo. */
export function ensureWelcomeMessageHasLink(template: string): string {
  const raw = (template || '').trim() || DEFAULT_PERSONAL_WELCOME_MESSAGE;
  if (raw.includes(PERSONAL_CONSULTA_LINK_PLACEHOLDER)) return raw;
  return `${raw}\n\n${PERSONAL_CONSULTA_LINK_PLACEHOLDER}`;
}

export function renderPersonalWelcomeMessage(params: {
  template: string;
  pacienteNome: string;
  personalNome: string;
  medicoNome: string;
  medicoGenero?: 'M' | 'F' | '' | null;
  agendamentoUrl: string;
  anamnesePreenchida?: boolean;
}): string {
  const template = applyWelcomeCta(
    ensureWelcomeMessageHasLink(params.template),
    Boolean(params.anamnesePreenchida)
  );
  return template
    .replaceAll(PERSONAL_CONSULTA_NOME_PACIENTE_PLACEHOLDER, primeiroNome(params.pacienteNome))
    .replaceAll(PERSONAL_CONSULTA_NOME_PERSONAL_PLACEHOLDER, params.personalNome.trim() || 'Personal')
    .replaceAll(
      PERSONAL_CONSULTA_NOME_MEDICO_PLACEHOLDER,
      formatNomeMedicoWelcome(params.medicoNome, params.medicoGenero)
    )
    .replaceAll(PERSONAL_CONSULTA_LINK_PLACEHOLDER, params.agendamentoUrl);
}

/** Link do WhatsApp Web/app com a mensagem já preenchida. `phone` já é canônico (DDI incluso). */
export function buildWhatsappManualUrl(phone: string, message: string): string {
  return buildWhatsappUrl({ telefoneE164: phone }, message) ?? '';
}

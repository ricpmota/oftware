import { DEFAULT_NUTRI_WELCOME_MESSAGE } from '@/lib/nutri/agenda/agendaDefaults';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { formatNomeMedicoAssinatura } from '@/lib/pacienteMensagem/assinaturaMensagem';
import {
  NUTRI_CONSULTA_CTA_INICIO_PLACEHOLDER,
  NUTRI_CONSULTA_LINK_PLACEHOLDER,
  NUTRI_CONSULTA_NOME_MEDICO_PLACEHOLDER,
  NUTRI_CONSULTA_NOME_NUTRI_PLACEHOLDER,
  NUTRI_CONSULTA_NOME_PACIENTE_PLACEHOLDER,
} from '@/types/nutriAgenda';

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
  'Para começar, preencha sua anamnese e escolha o horário da primeira consulta:';
export const CTA_ANAMNESE_FEITA =
  'Para começar, escolha o horário da primeira consulta:';

const CTA_ANAMNESE_LEGACY =
  /Para começar,\s*preencha sua anamnese\s*\(se ainda não fez\)\s*e escolha o horário da primeira consulta:/gi;

export function ctaInicioConsulta(anamnesePreenchida: boolean): string {
  return anamnesePreenchida ? CTA_ANAMNESE_FEITA : CTA_ANAMNESE_PENDENTE;
}

/** Ajusta o pedido de anamnese conforme o paciente já tenha respondido o questionário. */
export function applyWelcomeCta(template: string, anamnesePreenchida: boolean): string {
  const cta = ctaInicioConsulta(anamnesePreenchida);
  let out = template.replaceAll(NUTRI_CONSULTA_CTA_INICIO_PLACEHOLDER, cta);
  out = out.replace(CTA_ANAMNESE_LEGACY, cta);
  if (anamnesePreenchida) {
    out = out.replaceAll(CTA_ANAMNESE_PENDENTE, CTA_ANAMNESE_FEITA);
  } else {
    out = out.replaceAll(CTA_ANAMNESE_FEITA, CTA_ANAMNESE_PENDENTE);
  }
  return out;
}

/** Garante que o placeholder do link exista. A nutricionista não pode removê-lo. */
export function ensureWelcomeMessageHasLink(template: string): string {
  const raw = (template || '').trim() || DEFAULT_NUTRI_WELCOME_MESSAGE;
  if (raw.includes(NUTRI_CONSULTA_LINK_PLACEHOLDER)) return raw;
  return `${raw}\n\n${NUTRI_CONSULTA_LINK_PLACEHOLDER}`;
}

export function renderNutriWelcomeMessage(params: {
  template: string;
  pacienteNome: string;
  nutriNome: string;
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
    .replaceAll(NUTRI_CONSULTA_NOME_PACIENTE_PLACEHOLDER, primeiroNome(params.pacienteNome))
    .replaceAll(NUTRI_CONSULTA_NOME_NUTRI_PLACEHOLDER, params.nutriNome.trim() || 'Nutricionista')
    .replaceAll(
      NUTRI_CONSULTA_NOME_MEDICO_PLACEHOLDER,
      formatNomeMedicoWelcome(params.medicoNome, params.medicoGenero)
    )
    .replaceAll(NUTRI_CONSULTA_LINK_PLACEHOLDER, params.agendamentoUrl);
}

/** Link do WhatsApp Web/app com a mensagem já preenchida. `phone` já é canônico (DDI incluso). */
export function buildWhatsappManualUrl(phone: string, message: string): string {
  return buildWhatsappUrl({ telefoneE164: phone }, message) ?? '';
}

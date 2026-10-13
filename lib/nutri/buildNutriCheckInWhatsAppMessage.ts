import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';
import { buildWhatsappUrl, type InternationalPhoneFields } from '@/lib/phone/buildWhatsappUrl';

export type NutriCheckInWhatsAppKind = 'd0' | 'atrasado';

export function buildNutriCheckInWhatsAppMessage(params: {
  pacienteNome?: string | null;
  url: string;
  kind?: NutriCheckInWhatsAppKind;
}): string {
  const nome = primeiroNomePaciente(params.pacienteNome);
  const url = params.url.trim();
  if (params.kind === 'atrasado') {
    return `Olá, ${nome}! 👋

Passando para lembrar do seu Check-in Semanal de alimentação. Ainda não recebemos sua resposta.

Queremos saber como foi sua semana para acompanhar sua evolução e ajustar seu planejamento quando necessário.

Responda pelo link:
${url}`;
  }

  return `Olá, ${nome}! 👋

Chegou o momento do seu Check-in Semanal de alimentação.

Queremos saber como foi sua semana para acompanhar sua evolução e ajustar seu planejamento quando necessário.

Responda pelo link:
${url}`;
}

export function nutriCheckInWhatsAppHref(
  phone: string | InternationalPhoneFields,
  message: string,
): string | null {
  const fields: InternationalPhoneFields =
    typeof phone === 'string' ? { telefone: phone } : phone;
  return buildWhatsappUrl(fields, message);
}

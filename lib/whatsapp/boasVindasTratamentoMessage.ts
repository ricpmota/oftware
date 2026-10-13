import { formatNomeMedicoAssinatura } from '@/lib/pacienteMensagem/assinaturaMensagem';
import { primeiroNomePaciente } from '@/lib/aplicacao/buildAplicacaoWhatsAppMessage';

/**
 * Texto padrão enviado pelo Canal Chat ao aceitar a solicitação.
 * Variáveis: {nome}, {saudacao}, {artigo}, {medico}, {crm}, {contato_medico}.
 * Negrito no padrão WhatsApp (*texto*).
 */
export const CANAL_CHAT_OK_CONFIRMATION_BLOCK = `Para confirmar que este canal está funcionando corretamente, responda apenas:

OK`;

export const DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY = `Olá, {nome}! 👋

Seja {saudacao} ao acompanhamento com {artigo} *{medico} – {crm}*.

Este é o *canal oficial de notificações do seu acompanhamento*. Por aqui, você poderá receber informações importantes, como *lembretes, avisos e links de pagamento* relacionados ao seu tratamento.

📲 *Salve este número nos seus contatos* para garantir que nossas mensagens cheguem corretamente até você.

${CANAL_CHAT_OK_CONFIRMATION_BLOCK}

Para dúvidas sobre o tratamento ou orientações médicas, continue falando diretamente com {contato_medico}.

Seja muito {saudacao}! 💚`;

/** Garante o pedido de confirmação `OK` mesmo em templates customizados. */
export function ensureCanalChatOkConfirmation(body: string): string {
  const normalized = body.replace(/\r\n/g, '\n').trim();
  if (!normalized) return CANAL_CHAT_OK_CONFIRMATION_BLOCK;
  if (/(^|\n)OK(\n|$)/.test(normalized) && /responda apenas/i.test(normalized)) {
    return normalized;
  }
  return `${normalized}\n\n${CANAL_CHAT_OK_CONFIRMATION_BLOCK}`;
}

function isFeminino(value?: string | null): boolean {
  const s = String(value || '').trim().toLowerCase();
  return s === 'f' || s === 'feminino' || s === 'female';
}

export function isPacienteFeminino(sexo?: string | null): boolean {
  return isFeminino(sexo);
}

/** "bem-vinda" se sexo F; "bem-vindo" nos demais casos. */
export function formatSaudacaoBoasVindas(sexo?: string | null): string {
  return isPacienteFeminino(sexo) ? 'bem-vinda' : 'bem-vindo';
}

export function formatMedicoBoasVindas(
  nome?: string | null,
  genero?: string | null,
): string {
  const g = genero === 'F' || genero === 'M' ? genero : undefined;
  return formatNomeMedicoAssinatura({
    nome,
    genero: g,
    fallback: 'seu médico',
  });
}

/** Artigo antes do nome: "a" Dra. / "o" Dr. */
export function formatArtigoMedicoBoasVindas(genero?: string | null): string {
  return isFeminino(genero) ? 'a' : 'o';
}

/** "a sua médica" / "o seu médico" conforme o gênero do médico. */
export function formatContatoMedicoBoasVindas(genero?: string | null): string {
  return isFeminino(genero) ? 'a sua médica' : 'o seu médico';
}

/** Ex.: CRM/SP 123456 */
export function formatCrmBoasVindas(
  numero?: string | null,
  uf?: string | null,
): string {
  const n = String(numero || '').trim();
  const estado = String(uf || '').trim().toUpperCase();
  if (!n) return '';
  return estado ? `CRM/${estado} ${n}` : `CRM ${n}`;
}

export function buildBoasVindasTratamentoFallback(params: {
  pacienteNome: string;
  pacienteSexo?: string | null;
  medicoNome: string;
  medicoGenero?: string | null;
  crmNumero?: string | null;
  crmUf?: string | null;
}): string {
  const nome = primeiroNomePaciente(params.pacienteNome) || 'olá';
  const saudacao = formatSaudacaoBoasVindas(params.pacienteSexo);
  const artigo = formatArtigoMedicoBoasVindas(params.medicoGenero);
  const medico = formatMedicoBoasVindas(params.medicoNome, params.medicoGenero);
  const crm = formatCrmBoasVindas(params.crmNumero, params.crmUf);
  const contatoMedico = formatContatoMedicoBoasVindas(params.medicoGenero);
  const medicoDestaque = crm ? `*${medico} – ${crm}*` : `*${medico}*`;

  return [
    `Olá, ${nome}! 👋`,
    '',
    `Seja ${saudacao} ao acompanhamento com ${artigo} ${medicoDestaque}.`,
    '',
    'Este é o *canal oficial de notificações do seu acompanhamento*. Por aqui, você poderá receber informações importantes, como *lembretes, avisos e links de pagamento* relacionados ao seu tratamento.',
    '',
    '📲 *Salve este número nos seus contatos* para garantir que nossas mensagens cheguem corretamente até você.',
    '',
    CANAL_CHAT_OK_CONFIRMATION_BLOCK,
    '',
    `Para dúvidas sobre o tratamento ou orientações médicas, continue falando diretamente com ${contatoMedico}.`,
    '',
    `Seja muito ${saudacao}! 💚`,
  ].join('\n');
}

/** Remove ` – {crm}` / `{crm}` do template quando o CRM não está cadastrado. */
export function prepareBoasVindasTratamentoTemplate(template: string, crm: string): string {
  const raw = template.trim() || DEFAULT_BOAS_VINDAS_TRATAMENTO_BODY;
  if (crm.trim()) return raw;
  return raw
    .replace(/\s*[–-]\s*\{crm\}/gi, '')
    .replace(/,\s*\{crm\}/gi, '')
    .replace(/\{crm\}/gi, '');
}

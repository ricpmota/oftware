import { whiteLabelProfissaoLabel } from '@/lib/whiteLabel/profissao';
import type { WhiteLabelProfissao } from '@/lib/whiteLabel/profissao';

function formatMeetingDatePt(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  if (!y || !m || !d) return date;
  return new Date(y, m - 1, d).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export type WhiteLabelMeetingWhatsAppContext = {
  leadNome: string;
  leadEmail: string;
  leadWhatsapp: string;
  leadWhatsappDdi?: string | null;
  leadWhatsappPais?: string | null;
  profissao?: WhiteLabelProfissao | string | null;
  date: string;
  startTime: string;
  endTime: string;
  googleMeetLink?: string | null;
};

export function buildWhiteLabelMeetingConfirmacaoLeadMessage(
  ctx: WhiteLabelMeetingWhatsAppContext
): string {
  const nome = ctx.leadNome.trim().split(/\s+/)[0] || 'olá';
  const data = formatMeetingDatePt(ctx.date);
  const meet = ctx.googleMeetLink?.trim();

  let text =
    `Olá, ${nome}! ✅\n\n` +
    `Sua reunião White Label está confirmada.\n\n` +
    `📅 ${data}\n` +
    `⏰ ${ctx.startTime} às ${ctx.endTime} (horário de Brasília)\n`;

  if (meet) {
    text += `\n🔗 Link do Meet:\n${meet}\n`;
  }

  text +=
    `\nVocê também receberá o convite no e-mail ${ctx.leadEmail.trim() || 'cadastrado'}.\n` +
    `\nQualquer imprevisto, responda esta mensagem. Até breve!`;

  return text;
}

export function buildWhiteLabelMeetingAvisoResponsavelMessage(
  ctx: WhiteLabelMeetingWhatsAppContext
): string {
  const profissao = whiteLabelProfissaoLabel(
    (ctx.profissao as WhiteLabelProfissao) || 'medico'
  );
  const data = formatMeetingDatePt(ctx.date);
  const meet = ctx.googleMeetLink?.trim();

  let text =
    `🗓️ Novo agendamento White Label\n\n` +
    `👤 ${ctx.leadNome.trim() || 'Lead'}\n` +
    `💼 ${profissao}\n` +
    `📱 ${ctx.leadWhatsapp.trim() || '—'}\n` +
    `✉️ ${ctx.leadEmail.trim() || '—'}\n\n` +
    `📅 ${data}\n` +
    `⏰ ${ctx.startTime} às ${ctx.endTime}\n`;

  if (meet) {
    text += `\nMeet: ${meet}`;
  }

  return text;
}

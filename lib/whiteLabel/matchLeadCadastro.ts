import {
  normalizeLeadWhiteLabelEmail,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import type { CadastroMedicoWhiteLabel } from '@/types/cadastroMedicoWhiteLabel';
import type { LeadWhiteLabel } from '@/types/leadWhiteLabel';
import { leadsPhonesMatch } from '@/lib/whatsapp/resolveLeadPhone';

function toMillis(value: Date | string | null | undefined): number {
  if (!value) return 0;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function contactsMatch(
  lead: Pick<LeadWhiteLabel, 'email' | 'whatsapp' | 'whatsappDdi'>,
  cadastro: Pick<CadastroMedicoWhiteLabel, 'emailContrato' | 'whatsappContrato'>
): boolean {
  const leadEmail = normalizeLeadWhiteLabelEmail(lead.email || '');
  const cadastroEmail = normalizeLeadWhiteLabelEmail(cadastro.emailContrato || '');
  if (leadEmail && cadastroEmail && leadEmail === cadastroEmail) return true;

  return leadsPhonesMatch(
    { whatsapp: lead.whatsapp, whatsappDdi: lead.whatsappDdi },
    { telefone: cadastro.whatsappContrato },
  );
}

function rankCadastro(
  cadastro: CadastroMedicoWhiteLabel,
  leadProfissao: LeadWhiteLabel['profissao']
): number {
  let score = 0;
  if ((cadastro.profissao || 'medico') === (leadProfissao || 'medico')) score += 100;
  if (cadastro.status === 'concluido') score += 50;
  score += Math.min(toMillis(cadastro.updatedAt) / 1_000_000_000, 40);
  return score;
}

/** Associa o cadastro de onboarding (medico/nutri/personal) ao lead por e-mail ou WhatsApp. */
export function findCadastroForLead<T extends CadastroMedicoWhiteLabel>(
  lead: Pick<LeadWhiteLabel, 'email' | 'whatsapp' | 'whatsappDdi' | 'profissao'>,
  cadastros: T[]
): T | null {
  const matches = cadastros.filter((c) => contactsMatch(lead, c));
  if (matches.length === 0) return null;
  return [...matches].sort((a, b) => rankCadastro(b, lead.profissao) - rankCadastro(a, lead.profissao))[0];
}

export function buildLeadCadastroMap<T extends CadastroMedicoWhiteLabel>(
  leads: Array<Pick<LeadWhiteLabel, 'id' | 'email' | 'whatsapp' | 'whatsappDdi' | 'profissao'>>,
  cadastros: T[]
): Map<string, T> {
  const map = new Map<string, T>();
  for (const lead of leads) {
    const match = findCadastroForLead(lead, cadastros);
    if (match) map.set(lead.id, match);
  }
  return map;
}

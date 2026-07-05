import type { LeadMedico } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import { cleanPhoneBr } from '@/lib/paciente360/paciente360WhatsAppMessages';

type LooseRecord = Record<string, unknown>;

function pickString(...values: (string | undefined | null)[]): string | undefined {
  for (const value of values) {
    const trimmed = typeof value === 'string' ? value.trim() : '';
    if (trimmed) return trimmed;
  }
  return undefined;
}

export function getLeadPhone(lead: LeadMedico, paciente?: PacienteCompleto | null): string | undefined {
  const leadAny = lead as LeadMedico & LooseRecord;
  const pacienteAny = paciente as (PacienteCompleto & LooseRecord) | undefined;

  return pickString(
    lead.telefone,
    leadAny.phone as string | undefined,
    leadAny.whatsapp as string | undefined,
    leadAny.celular as string | undefined,
    paciente?.dadosIdentificacao?.telefone,
    pacienteAny?.telefone as string | undefined,
    pacienteAny?.celular as string | undefined,
    pacienteAny?.whatsapp as string | undefined
  );
}

export function getLeadEmail(lead: LeadMedico, paciente?: PacienteCompleto | null): string | undefined {
  const leadAny = lead as LeadMedico & LooseRecord;

  return pickString(
    lead.email,
    leadAny['e-mail'] as string | undefined,
    paciente?.dadosIdentificacao?.email,
    paciente?.email
  );
}

/** Telefone limpo com prefixo 55 para WhatsApp e tel: */
export function getLeadPhoneDigits(lead: LeadMedico, paciente?: PacienteCompleto | null): string | null {
  return cleanPhoneBr(getLeadPhone(lead, paciente));
}

export function isValidLeadPhone(lead: LeadMedico, paciente?: PacienteCompleto | null): boolean {
  const digits = getLeadPhoneDigits(lead, paciente);
  if (!digits) return false;
  const local = digits.startsWith('55') ? digits.slice(2) : digits;
  return local.length >= 10;
}

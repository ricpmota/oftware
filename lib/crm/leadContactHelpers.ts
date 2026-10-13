import type { LeadMedico } from '@/types/leadMedico';
import type { PacienteCompleto } from '@/types/obesidade';
import {
  phoneFieldsFromPaciente,
  resolveWhatsappCanonicalDigits,
  type InternationalPhoneFields,
} from '@/lib/phone/buildWhatsappUrl';
import { phoneFieldsFromLead } from '@/lib/whatsapp/resolveLeadPhone';

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

/**
 * Campos estruturados para wa.me / tel:.
 * Preferência: identificação do paciente vinculado (Etapa 4);
 * senão contrato do lead (DDI se existir, senão legado BR).
 */
export function getLeadPhoneFields(
  lead: LeadMedico,
  paciente?: PacienteCompleto | null,
): InternationalPhoneFields {
  const ident = paciente?.dadosIdentificacao;
  if (ident?.telefone || ident?.telefoneDdi || ident?.telefoneE164) {
    return phoneFieldsFromPaciente(paciente);
  }
  return phoneFieldsFromLead(lead);
}

/**
 * Dígitos canônicos para WhatsApp/tel:.
 * Preferência: identificação estruturada do paciente (DDI/E164);
 * senão telefone do lead com DDI estruturado ou fallback legado BR.
 */
export function getLeadPhoneDigits(lead: LeadMedico, paciente?: PacienteCompleto | null): string | null {
  return resolveWhatsappCanonicalDigits(getLeadPhoneFields(lead, paciente));
}

export function isValidLeadPhone(lead: LeadMedico, paciente?: PacienteCompleto | null): boolean {
  return Boolean(getLeadPhoneDigits(lead, paciente));
}

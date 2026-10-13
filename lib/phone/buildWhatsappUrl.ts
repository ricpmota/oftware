/**
 * Fonte única para links manuais wa.me.
 *
 * Não duplica DDI, legado BR, 9º dígito, E164 nem limpeza:
 * delega a `resolveInternationalPhone`.
 *
 * Path: https://wa.me/{digitosCanonicos}  (sem "+", espaços ou máscara)
 * Mensagem: ?text= encodeURIComponent
 * Inválido/vazio → null (não gera URL incorreta).
 */

import {
  InternationalPhoneError,
  tryResolveInternationalPhone,
  type InternationalPhoneFields,
} from '@/lib/whatsapp/resolveInternationalPhone';

export type { InternationalPhoneFields };

const WA_ME_BASE = 'https://wa.me';

export type PatientWhatsappSource = {
  dadosIdentificacao?: InternationalPhoneFields | null;
  telefone?: string | null;
};

/** Dígitos canônicos ou null (vazio/inválido). Não relança InternationalPhoneError. */
export function resolveWhatsappCanonicalDigits(
  fields: InternationalPhoneFields,
): string | null {
  try {
    return tryResolveInternationalPhone(fields);
  } catch (error) {
    if (error instanceof InternationalPhoneError) return null;
    throw error;
  }
}

export function phoneFieldsFromPaciente(
  paciente: PatientWhatsappSource | null | undefined,
): InternationalPhoneFields {
  const ident = paciente?.dadosIdentificacao;
  return {
    telefone: ident?.telefone ?? paciente?.telefone,
    telefoneDdi: ident?.telefoneDdi,
    telefoneE164: ident?.telefoneE164,
  };
}

export function buildWhatsappUrl(
  fields: InternationalPhoneFields,
  message?: string | null,
): string | null {
  const digits = resolveWhatsappCanonicalDigits(fields);
  if (!digits) return null;
  const base = `${WA_ME_BASE}/${digits}`;
  if (message == null || message === '') return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

export function buildPatientWhatsappUrl(
  paciente: PatientWhatsappSource | null | undefined,
  message?: string | null,
): string | null {
  if (!paciente) return null;
  return buildWhatsappUrl(phoneFieldsFromPaciente(paciente), message);
}

/** Troca só o texto de um link wa.me já montado. */
export function withWhatsappMessage(url: string | null, message: string): string | null {
  if (!url) return null;
  const base = url.split('?')[0];
  if (!message) return base;
  return `${base}?text=${encodeURIComponent(message)}`;
}

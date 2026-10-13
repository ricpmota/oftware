/**
 * Telefone de profissional (médico, nutri, personal, psi) no documento Firestore.
 * Campos no raiz do doc — não em dadosIdentificacao.
 *
 * Internamente só `resolveInternationalPhone`. Sem 55/9º dígito/E164 próprios.
 */
import {
  InternationalPhoneError,
  resolveInternationalPhone,
  type InternationalPhoneFields,
} from '@/lib/whatsapp/resolveInternationalPhone';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';

export type ProfessionalPhoneSource = {
  telefone?: string | null;
  telefoneDdi?: string | null;
  telefonePais?: string | null;
  telefoneE164?: string | null;
};

function pickTrimmed(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function phoneFieldsFromProfessional(
  doc: ProfessionalPhoneSource | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!doc) return {};
  const rec = doc as Record<string, unknown> & ProfessionalPhoneSource;
  return {
    telefone: pickTrimmed(rec.telefone) ?? pickTrimmed(rec.celular) ?? pickTrimmed(rec.phone),
    telefoneDdi: pickTrimmed(rec.telefoneDdi),
    telefoneE164: pickTrimmed(rec.telefoneE164),
  };
}

/** DDI/país opcionais a partir do snapshot Firestore (não inventa Brasil). */
export function optionalProfessionalDdiPais(data: Record<string, unknown>): {
  telefoneDdi?: string;
  telefonePais?: string;
} {
  const telefoneDdi = pickTrimmed(data.telefoneDdi);
  const telefonePais = pickTrimmed(data.telefonePais);
  return {
    ...(telefoneDdi ? { telefoneDdi } : {}),
    ...(telefonePais ? { telefonePais } : {}),
  };
}

/**
 * Persistência: só grava DDI/país se o formulário já tiver (edição / legado já estruturado).
 * Abrir sem alterar → DDI ausente no input → não escreve DDI.
 */
export function professionalPhoneWriteFields(fields: ProfessionalPhoneSource): {
  telefone: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  const telefone = (fields.telefone || '').trim();
  const telefoneDdi = (fields.telefoneDdi || '').trim() || undefined;
  const telefonePais = (fields.telefonePais || '').trim() || undefined;
  if (telefoneDdi) {
    return { telefone, telefoneDdi, telefonePais };
  }
  return { telefone };
}

export function tryResolvePhoneFromProfessionalDoc(
  data: ProfessionalPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  try {
    return resolveInternationalPhone(phoneFieldsFromProfessional(data));
  } catch (error) {
    if (error instanceof InternationalPhoneError) return null;
    throw error;
  }
}

export function buildProfessionalWhatsappUrl(
  doc: ProfessionalPhoneSource | null | undefined,
  message?: string | null,
): string | null {
  return buildWhatsappUrl(phoneFieldsFromProfessional(doc), message);
}

export type TelefoneAvisoFields = {
  telefoneAviso?: string | null;
  telefoneAvisoDdi?: string | null;
  telefoneAvisoPais?: string | null;
  telefoneAvisoE164?: string | null;
};

export function phoneFieldsFromTelefoneAviso(
  aviso: TelefoneAvisoFields | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!aviso) return {};
  const rec = aviso as Record<string, unknown> & TelefoneAvisoFields;
  return {
    telefone: pickTrimmed(rec.telefoneAviso),
    telefoneDdi: pickTrimmed(rec.telefoneAvisoDdi),
    telefoneE164: pickTrimmed(rec.telefoneAvisoE164),
  };
}

export function tryResolveTelefoneAviso(
  aviso: TelefoneAvisoFields | Record<string, unknown> | null | undefined,
): string | null {
  if (!aviso) return null;
  try {
    return resolveInternationalPhone(phoneFieldsFromTelefoneAviso(aviso));
  } catch (error) {
    if (error instanceof InternationalPhoneError) return null;
    throw error;
  }
}

/**
 * Copia telefone estruturado do profissional para o lembrete.
 * Sem DDI no doc → só `telefoneAviso` nacional (legado BR).
 */
export function telefoneAvisoWriteFieldsFromProfessional(
  doc: ProfessionalPhoneSource | Record<string, unknown> | null | undefined,
): {
  telefoneAviso: string;
  telefoneAvisoDdi?: string;
  telefoneAvisoPais?: string;
} | null {
  if (!doc) return null;
  const rec = doc as Record<string, unknown> & ProfessionalPhoneSource;
  const telefone = pickTrimmed(rec.telefone) ?? pickTrimmed(rec.celular) ?? pickTrimmed(rec.phone);
  if (!telefone) return null;
  const ddi = pickTrimmed(rec.telefoneDdi);
  const pais = pickTrimmed(rec.telefonePais);
  if (ddi) {
    return {
      telefoneAviso: telefone.replace(/\D/g, '') || telefone,
      telefoneAvisoDdi: ddi,
      ...(pais ? { telefoneAvisoPais: pais } : {}),
    };
  }
  return { telefoneAviso: telefone.replace(/\D/g, '') || telefone };
}

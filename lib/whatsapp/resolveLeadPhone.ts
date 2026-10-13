/**
 * Telefone de lead — extrai o contrato real (telefone ou whatsapp) e delega a
 * `resolveInternationalPhone`. Sem resolver próprio, sem 55 concatenado.
 *
 * White-label usa `whatsapp` / `whatsappDdi` / `whatsappPais`.
 * LeadMedico / LeadProfissional / MAG `leads` / mentoria usam `telefone` ou `whatsapp`.
 */
import { buildTelHref } from '@/lib/phone/buildTelHref';
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import {
  formatInternationalPhoneDisplay,
  isValidIdentificacaoPhone,
} from '@/lib/phone/internationalPhoneValue';
import { normalizeLeadWhiteLabelWhatsApp } from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import {
  InternationalPhoneError,
  resolveInternationalPhone,
  type InternationalPhoneFields,
} from '@/lib/whatsapp/resolveInternationalPhone';

export type LeadPhoneSource = {
  telefone?: string | null;
  telefoneDdi?: string | null;
  telefonePais?: string | null;
  telefoneE164?: string | null;
  whatsapp?: string | null;
  whatsappDdi?: string | null;
  whatsappPais?: string | null;
  celular?: string | null;
  phone?: string | null;
};

function pickTrimmed(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

export function phoneFieldsFromLead(
  doc: LeadPhoneSource | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!doc) return {};
  const rec = doc as Record<string, unknown> & LeadPhoneSource;
  return {
    telefone:
      pickTrimmed(rec.telefone) ??
      pickTrimmed(rec.whatsapp) ??
      pickTrimmed(rec.celular) ??
      pickTrimmed(rec.phone),
    telefoneDdi: pickTrimmed(rec.telefoneDdi) ?? pickTrimmed(rec.whatsappDdi),
    telefoneE164: pickTrimmed(rec.telefoneE164),
  };
}

/** DDI/país opcionais do snapshot Firestore (não inventa Brasil). */
export function optionalLeadDdiPais(data: Record<string, unknown>): {
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

export function optionalWhiteLabelWhatsAppDdiPais(data: Record<string, unknown>): {
  whatsappDdi?: string;
  whatsappPais?: string;
} {
  const whatsappDdi = pickTrimmed(data.whatsappDdi);
  const whatsappPais = pickTrimmed(data.whatsappPais);
  return {
    ...(whatsappDdi ? { whatsappDdi } : {}),
    ...(whatsappPais ? { whatsappPais } : {}),
  };
}

/**
 * Persistência `telefone` + DDI opcional. Abrir sem alterar → DDI ausente → não grava DDI.
 */
export function leadPhoneWriteFields(fields: LeadPhoneSource): {
  telefone: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  const telefone = (fields.telefone || fields.whatsapp || '').trim();
  const telefoneDdi = (fields.telefoneDdi || fields.whatsappDdi || '').trim() || undefined;
  const telefonePais = (fields.telefonePais || fields.whatsappPais || '').trim() || undefined;
  if (telefoneDdi) {
    return { telefone, telefoneDdi, telefonePais };
  }
  return { telefone };
}

/**
 * Persistência white-label: nacional em `whatsapp` + DDI opcional.
 * Sem DDI no payload → não inventa campos novos.
 */
export function whiteLabelWhatsAppWriteFields(fields: LeadPhoneSource): {
  whatsapp: string;
  whatsappDdi?: string;
  whatsappPais?: string;
} {
  const whatsapp = (fields.whatsapp || fields.telefone || '').replace(/\D/g, '') || (fields.whatsapp || '').trim();
  const whatsappDdi = (fields.whatsappDdi || fields.telefoneDdi || '').trim() || undefined;
  const whatsappPais = (fields.whatsappPais || fields.telefonePais || '').trim() || undefined;
  if (whatsappDdi) {
    return { whatsapp, whatsappDdi, ...(whatsappPais ? { whatsappPais } : {}) };
  }
  return { whatsapp };
}

export type WhiteLabelWhatsAppPersistResult =
  | { ok: true; fields: { whatsapp: string; whatsappDdi?: string; whatsappPais?: string } }
  | { ok: false; error: string };

/**
 * API/landing: payload estruturado (DDI) ou legado só `whatsapp` (Brasil via
 * `normalizeLeadWhiteLabelWhatsApp`, 55 prefixado como os docs atuais).
 */
export function persistWhiteLabelWhatsAppFromPayload(
  raw: Record<string, unknown> | LeadPhoneSource | null | undefined,
): WhiteLabelWhatsAppPersistResult {
  if (!raw) return { ok: false, error: 'WhatsApp inválido.' };
  const rec = raw as Record<string, unknown> & LeadPhoneSource;
  const ddi = pickTrimmed(rec.whatsappDdi) ?? pickTrimmed(rec.telefoneDdi);
  const pais = pickTrimmed(rec.whatsappPais) ?? pickTrimmed(rec.telefonePais);
  const national = pickTrimmed(rec.whatsapp) ?? pickTrimmed(rec.telefone);

  if (ddi) {
    const fields = whiteLabelWhatsAppWriteFields({
      whatsapp: national,
      whatsappDdi: ddi,
      whatsappPais: pais,
    });
    if (
      !isValidIdentificacaoPhone({
        telefone: fields.whatsapp,
        telefoneDdi: fields.whatsappDdi,
        telefonePais: fields.whatsappPais,
      })
    ) {
      return { ok: false, error: 'WhatsApp inválido.' };
    }
    try {
      resolveInternationalPhone({
        telefone: fields.whatsapp,
        telefoneDdi: fields.whatsappDdi,
      });
    } catch {
      return { ok: false, error: 'WhatsApp inválido.' };
    }
    return { ok: true, fields };
  }

  const legado = normalizeLeadWhiteLabelWhatsApp(national || '');
  if (!legado || legado.length < 12) {
    return { ok: false, error: 'WhatsApp inválido.' };
  }
  return { ok: true, fields: { whatsapp: legado } };
}

export function persistMentoriaWhatsAppFromPayload(
  raw: Record<string, unknown> | LeadPhoneSource | null | undefined,
): WhiteLabelWhatsAppPersistResult {
  return persistWhiteLabelWhatsAppFromPayload(raw);
}

export function tryResolvePhoneFromLeadDoc(
  data: LeadPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  if (!data) return null;
  try {
    return resolveInternationalPhone(phoneFieldsFromLead(data));
  } catch (error) {
    if (error instanceof InternationalPhoneError) return null;
    throw error;
  }
}

/** Chave canônica para matching/dedupe. Não persistir. */
export function leadCanonicalMatchKey(
  data: LeadPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  return tryResolvePhoneFromLeadDoc(data);
}

export function leadsPhonesMatch(
  a: LeadPhoneSource | Record<string, unknown> | null | undefined,
  b: LeadPhoneSource | Record<string, unknown> | null | undefined,
): boolean {
  const ka = leadCanonicalMatchKey(a);
  const kb = leadCanonicalMatchKey(b);
  return Boolean(ka && kb && ka === kb);
}

export function buildLeadWhatsappUrl(
  doc: LeadPhoneSource | null | undefined,
  message?: string | null,
): string | null {
  return buildWhatsappUrl(phoneFieldsFromLead(doc), message);
}

export function buildLeadTelHref(doc: LeadPhoneSource | null | undefined): string | null {
  return buildTelHref(phoneFieldsFromLead(doc));
}

export function formatLeadPhoneDisplay(
  doc: LeadPhoneSource | Record<string, unknown> | null | undefined,
): string {
  const fields = phoneFieldsFromLead(doc);
  if (!fields.telefone && !fields.telefoneDdi) return '';
  if (fields.telefoneDdi) {
    return formatInternationalPhoneDisplay({
      ...fields,
      telefonePais: pickTrimmed((doc as LeadPhoneSource | undefined)?.telefonePais) ??
        pickTrimmed((doc as LeadPhoneSource | undefined)?.whatsappPais),
    });
  }
  return formatInternationalPhoneDisplay(fields);
}

/**
 * Copia identificação de paciente → lead sem perder DDI e sem concatenar DDI em `telefone`.
 */
export function leadPhoneWriteFieldsFromIdent(
  ident: InternationalPhoneFields | null | undefined,
): {
  telefone?: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  if (!ident) return {};
  const telefone = (ident.telefone || '').trim();
  if (!telefone && !ident.telefoneDdi) return {};
  return leadPhoneWriteFields({
    telefone,
    telefoneDdi: ident.telefoneDdi,
    telefonePais: ident.telefonePais,
  });
}

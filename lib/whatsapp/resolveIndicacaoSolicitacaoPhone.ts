/**
 * Telefone de indicação e solicitação de acompanhamento.
 * Adapta os contratos reais a `resolveInternationalPhone` — sem resolver próprio,
 * sem concatenar DDI no campo nacional, sem persistir chave canônica.
 */
import { buildWhatsappUrl } from '@/lib/phone/buildWhatsappUrl';
import { formatInternationalPhoneDisplay } from '@/lib/phone/internationalPhoneValue';
import {
  InternationalPhoneError,
  resolveInternationalPhone,
  type InternationalPhoneFields,
} from '@/lib/whatsapp/resolveInternationalPhone';

export type IndicacaoPhoneSource = {
  telefonePaciente?: string | null;
  telefonePacienteDdi?: string | null;
  telefonePacientePais?: string | null;
  indicadoPorTelefone?: string | null;
  indicadoPorTelefoneDdi?: string | null;
  indicadoPorTelefonePais?: string | null;
};

export type SolicitacaoPhoneSource = {
  pacienteTelefone?: string | null;
  pacienteTelefoneDdi?: string | null;
  pacienteTelefonePais?: string | null;
};

function pickTrimmed(raw: unknown): string | undefined {
  return typeof raw === 'string' && raw.trim() ? raw.trim() : undefined;
}

function digitsNational(raw: unknown): string {
  return typeof raw === 'string' ? raw.replace(/\D/g, '') : '';
}

function tryResolveFields(fields: InternationalPhoneFields): string | null {
  try {
    return resolveInternationalPhone(fields);
  } catch (error) {
    if (error instanceof InternationalPhoneError) return null;
    throw error;
  }
}

function omitEmptyDdi(fields: {
  telefone: string;
  telefoneDdi?: string;
  telefonePais?: string;
}): { telefone: string; telefoneDdi?: string; telefonePais?: string } {
  if (fields.telefoneDdi) {
    return {
      telefone: fields.telefone,
      telefoneDdi: fields.telefoneDdi,
      ...(fields.telefonePais ? { telefonePais: fields.telefonePais } : {}),
    };
  }
  return { telefone: fields.telefone };
}

function formatLegacyBrNational(digits: string): string {
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return digits;
}

function formatPhoneDisplay(fields: InternationalPhoneFields, pais?: string | null): string {
  if (!fields.telefone && !fields.telefoneDdi) return '';
  if (fields.telefoneDdi) {
    return formatInternationalPhoneDisplay({
      ...fields,
      telefonePais: pais ?? fields.telefonePais,
    });
  }
  return formatLegacyBrNational(digitsNational(fields.telefone));
}

export function phoneFieldsFromIndicacao(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!doc) return {};
  const rec = doc as IndicacaoPhoneSource;
  return {
    telefone: pickTrimmed(rec.telefonePaciente),
    telefoneDdi: pickTrimmed(rec.telefonePacienteDdi),
  };
}

export function phoneFieldsFromIndicadoPor(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!doc) return {};
  const rec = doc as IndicacaoPhoneSource;
  return {
    telefone: pickTrimmed(rec.indicadoPorTelefone),
    telefoneDdi: pickTrimmed(rec.indicadoPorTelefoneDdi),
  };
}

export function phoneFieldsFromSolicitacao(
  doc: SolicitacaoPhoneSource | Record<string, unknown> | null | undefined,
): InternationalPhoneFields {
  if (!doc) return {};
  const rec = doc as SolicitacaoPhoneSource;
  return {
    telefone: pickTrimmed(rec.pacienteTelefone),
    telefoneDdi: pickTrimmed(rec.pacienteTelefoneDdi),
  };
}

export function tryResolveIndicacaoPhone(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  return tryResolveFields(phoneFieldsFromIndicacao(doc));
}

export function tryResolveIndicadoPorPhone(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  return tryResolveFields(phoneFieldsFromIndicadoPor(doc));
}

export function tryResolveSolicitacaoPhone(
  doc: SolicitacaoPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  return tryResolveFields(phoneFieldsFromSolicitacao(doc));
}

/** Chave canônica derivada. Não persistir. */
export function indicacaoCanonicalMatchKey(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): string | null {
  return tryResolveIndicacaoPhone(doc);
}

export function phonesCanonicallyMatch(
  a: InternationalPhoneFields | null | undefined,
  b: InternationalPhoneFields | null | undefined,
): boolean {
  const ka = a ? tryResolveFields(a) : null;
  const kb = b ? tryResolveFields(b) : null;
  return Boolean(ka && kb && ka === kb);
}

/**
 * Matching indicação ↔ paciente. Ambos passam por `resolveInternationalPhone`.
 * US 7137326616+1 ≠ BR legado 7137326616.
 */
export function indicacaoMatchesPacienteIdent(
  indicacao: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
  ident: InternationalPhoneFields | null | undefined,
): boolean {
  return phonesCanonicallyMatch(phoneFieldsFromIndicacao(indicacao), ident ?? undefined);
}

export function findMatchingIndicacao<T extends IndicacaoPhoneSource>(
  indicacoes: T[],
  ident: InternationalPhoneFields | string | null | undefined,
): T | null {
  const query: InternationalPhoneFields =
    typeof ident === 'string' ? { telefone: ident } : ident ?? {};
  for (const indicacao of indicacoes) {
    if (indicacaoMatchesPacienteIdent(indicacao, query)) return indicacao;
  }
  return null;
}

export function indicacaoPhoneWriteFields(fields: IndicacaoPhoneSource): {
  telefonePaciente: string;
  telefonePacienteDdi?: string;
  telefonePacientePais?: string;
} {
  const telefonePaciente = digitsNational(fields.telefonePaciente);
  const telefonePacienteDdi = pickTrimmed(fields.telefonePacienteDdi);
  const telefonePacientePais = pickTrimmed(fields.telefonePacientePais);
  if (telefonePacienteDdi) {
    return {
      telefonePaciente,
      telefonePacienteDdi,
      ...(telefonePacientePais ? { telefonePacientePais } : {}),
    };
  }
  return { telefonePaciente };
}

export function indicadoPorPhoneWriteFields(fields: IndicacaoPhoneSource | InternationalPhoneFields): {
  indicadoPorTelefone?: string;
  indicadoPorTelefoneDdi?: string;
  indicadoPorTelefonePais?: string;
} {
  const rec = fields as IndicacaoPhoneSource & InternationalPhoneFields;
  const indicadoPorTelefone =
    digitsNational(rec.indicadoPorTelefone) || digitsNational(rec.telefone);
  if (!indicadoPorTelefone) return {};
  const ddi = pickTrimmed(rec.indicadoPorTelefoneDdi) ?? pickTrimmed(rec.telefoneDdi);
  const pais = pickTrimmed(rec.indicadoPorTelefonePais) ?? pickTrimmed(rec.telefonePais);
  if (ddi) {
    return {
      indicadoPorTelefone,
      indicadoPorTelefoneDdi: ddi,
      ...(pais ? { indicadoPorTelefonePais: pais } : {}),
    };
  }
  return { indicadoPorTelefone };
}

export function solicitacaoPhoneWriteFields(fields: SolicitacaoPhoneSource): {
  pacienteTelefone?: string;
  pacienteTelefoneDdi?: string;
  pacienteTelefonePais?: string;
} {
  const pacienteTelefone = digitsNational(fields.pacienteTelefone);
  if (!pacienteTelefone && !pickTrimmed(fields.pacienteTelefoneDdi)) return {};
  const pacienteTelefoneDdi = pickTrimmed(fields.pacienteTelefoneDdi);
  const pacienteTelefonePais = pickTrimmed(fields.pacienteTelefonePais);
  if (pacienteTelefoneDdi) {
    return {
      pacienteTelefone,
      pacienteTelefoneDdi,
      ...(pacienteTelefonePais ? { pacienteTelefonePais } : {}),
    };
  }
  return pacienteTelefone ? { pacienteTelefone } : {};
}

/** Paciente ident → campos de solicitação (chat inicial / cópia). */
export function solicitacaoPhoneWriteFieldsFromIdent(
  ident: InternationalPhoneFields | null | undefined,
): {
  pacienteTelefone?: string;
  pacienteTelefoneDdi?: string;
  pacienteTelefonePais?: string;
} {
  if (!ident) return {};
  const telefone = digitsNational(ident.telefone) || (ident.telefone || '').trim();
  if (!telefone && !ident.telefoneDdi) return {};
  return solicitacaoPhoneWriteFields({
    pacienteTelefone: telefone,
    pacienteTelefoneDdi: ident.telefoneDdi,
    pacienteTelefonePais: ident.telefonePais,
  });
}

/** Solicitação → dadosIdentificacao / LeadMedico. Nunca concatena DDI em `telefone`. */
export function identPhoneWriteFieldsFromSolicitacao(
  sol: SolicitacaoPhoneSource | null | undefined,
): {
  telefone?: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  if (!sol) return {};
  const write = solicitacaoPhoneWriteFields(sol);
  if (!write.pacienteTelefone) return {};
  return omitEmptyDdi({
    telefone: write.pacienteTelefone,
    telefoneDdi: write.pacienteTelefoneDdi,
    telefonePais: write.pacienteTelefonePais,
  });
}

/**
 * Aceite/atualização: ident estruturado prevalece; senão copia a solicitação.
 * Não sobrescreve DDI do paciente com nacional da solicitação.
 */
export function mergeIdentPhonePreferExisting(
  ident: InternationalPhoneFields | null | undefined,
  sol: SolicitacaoPhoneSource | null | undefined,
): {
  telefone?: string;
  telefoneDdi?: string;
  telefonePais?: string;
} {
  const fromIdent = ident?.telefone?.trim()
    ? omitEmptyDdi({
        telefone: digitsNational(ident.telefone) || ident.telefone.trim(),
        telefoneDdi: pickTrimmed(ident.telefoneDdi),
        telefonePais: pickTrimmed(ident.telefonePais),
      })
    : {};
  if (fromIdent.telefone) return fromIdent;
  return identPhoneWriteFieldsFromSolicitacao(sol);
}

export function optionalIndicacaoDdiPais(data: Record<string, unknown>): {
  telefonePacienteDdi?: string;
  telefonePacientePais?: string;
  indicadoPorTelefoneDdi?: string;
  indicadoPorTelefonePais?: string;
} {
  const telefonePacienteDdi = pickTrimmed(data.telefonePacienteDdi);
  const telefonePacientePais = pickTrimmed(data.telefonePacientePais);
  const indicadoPorTelefoneDdi = pickTrimmed(data.indicadoPorTelefoneDdi);
  const indicadoPorTelefonePais = pickTrimmed(data.indicadoPorTelefonePais);
  return {
    ...(telefonePacienteDdi ? { telefonePacienteDdi } : {}),
    ...(telefonePacientePais ? { telefonePacientePais } : {}),
    ...(indicadoPorTelefoneDdi ? { indicadoPorTelefoneDdi } : {}),
    ...(indicadoPorTelefonePais ? { indicadoPorTelefonePais } : {}),
  };
}

export function optionalSolicitacaoDdiPais(data: Record<string, unknown>): {
  pacienteTelefoneDdi?: string;
  pacienteTelefonePais?: string;
} {
  const pacienteTelefoneDdi = pickTrimmed(data.pacienteTelefoneDdi);
  const pacienteTelefonePais = pickTrimmed(data.pacienteTelefonePais);
  return {
    ...(pacienteTelefoneDdi ? { pacienteTelefoneDdi } : {}),
    ...(pacienteTelefonePais ? { pacienteTelefonePais } : {}),
  };
}

export function buildIndicacaoWhatsappUrl(
  doc: IndicacaoPhoneSource | null | undefined,
  message?: string | null,
): string | null {
  return buildWhatsappUrl(phoneFieldsFromIndicacao(doc), message);
}

export function buildIndicadoPorWhatsappUrl(
  doc: IndicacaoPhoneSource | null | undefined,
  message?: string | null,
): string | null {
  return buildWhatsappUrl(phoneFieldsFromIndicadoPor(doc), message);
}

export function buildSolicitacaoWhatsappUrl(
  doc: SolicitacaoPhoneSource | null | undefined,
  message?: string | null,
): string | null {
  return buildWhatsappUrl(phoneFieldsFromSolicitacao(doc), message);
}

export function formatIndicacaoPacientePhoneDisplay(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): string {
  const rec = doc as IndicacaoPhoneSource | undefined;
  return formatPhoneDisplay(phoneFieldsFromIndicacao(doc), rec?.telefonePacientePais);
}

export function formatIndicadoPorPhoneDisplay(
  doc: IndicacaoPhoneSource | Record<string, unknown> | null | undefined,
): string {
  const rec = doc as IndicacaoPhoneSource | undefined;
  return formatPhoneDisplay(phoneFieldsFromIndicadoPor(doc), rec?.indicadoPorTelefonePais);
}

export function formatSolicitacaoPhoneDisplay(
  doc: SolicitacaoPhoneSource | Record<string, unknown> | null | undefined,
): string {
  const rec = doc as SolicitacaoPhoneSource | undefined;
  return formatPhoneDisplay(phoneFieldsFromSolicitacao(doc), rec?.pacienteTelefonePais);
}

import { toPrimeiroNome } from '@/lib/disparos/primeiroNome';
import { normalizeDisparoPhone, type DisparoPhoneOptions } from '@/lib/disparos/normalizeDisparoPhone';
import type {
  DisparoColumnMapping,
  ImportSummary,
  ImportedContact,
  ImportedContactStatus,
  ImportedPhone,
  ParsedCsv,
} from '@/lib/disparos/types';

function columnIndex(headers: string[], name: string): number {
  if (!name) return -1;
  return headers.indexOf(name);
}

function cell(row: string[], index: number): string {
  if (index < 0) return '';
  return row[index] ?? '';
}

function toImportedPhone(original: string, options?: DisparoPhoneOptions): ImportedPhone {
  const phone = normalizeDisparoPhone(original, options);
  return {
    original: phone.original,
    normalized: phone.normalized,
    display: phone.display,
    issue: phone.outcome === 'valido' ? null : phone.outcome,
    usedDefaultDdd: phone.usedDefaultDdd,
    alreadyHadDdd: phone.alreadyHadDdd,
    alreadyHadCountry: phone.alreadyHadCountry,
  };
}

export function normalizeOptOutList(raw: string, options?: DisparoPhoneOptions): Set<string> {
  const blocked = new Set<string>();
  for (const token of raw.split(/[\s,;]+/)) {
    if (!token.trim()) continue;
    const phone = normalizeDisparoPhone(token, options);
    if (phone.normalized) blocked.add(phone.normalized);
  }
  return blocked;
}

function hasDigits(phone: ImportedPhone): boolean {
  return phone.issue !== 'empty';
}

function statusFromPhone(phone: ImportedPhone, seen: Set<string>, blocked: Set<string>): ImportedContactStatus {
  if (phone.normalized && blocked.has(phone.normalized)) return 'opt_out';
  if (phone.issue === 'falta_ddd') return 'falta_ddd';
  if (phone.issue === 'invalido' || !phone.normalized) return 'invalido';
  if (seen.has(phone.normalized)) return 'duplicado';
  return 'valido';
}

export function classifyImportedContacts(input: {
  importId: string;
  parsed: ParsedCsv;
  mapping: DisparoColumnMapping;
  optOut?: Set<string>;
  phoneOptions?: DisparoPhoneOptions;
}): { contacts: ImportedContact[]; summary: ImportSummary } {
  const nomeIndex = columnIndex(input.parsed.headers, input.mapping.nome);
  const tel1Index = columnIndex(input.parsed.headers, input.mapping.telefone1);
  const tel2Index = columnIndex(input.parsed.headers, input.mapping.telefone2);
  const blocked = input.optOut ?? new Set<string>();
  const seen = new Set<string>();
  const contacts: ImportedContact[] = [];
  const summary: ImportSummary = {
    total: 0,
    validos: 0,
    invalidos: 0,
    duplicados: 0,
    semTelefone: 0,
    faltaDdd: 0,
    optOut: 0,
    telefonesComDddPadrao: 0,
    telefonesJaComDdd: 0,
    telefonesJaComPais: 0,
  };

  input.parsed.rows.forEach((row, index) => {
    const nome = cell(row, nomeIndex).trim().replace(/\s+/g, ' ');
    const telefone1 = toImportedPhone(cell(row, tel1Index), input.phoneOptions);
    const telefone2 = input.mapping.telefone2
      ? toImportedPhone(cell(row, tel2Index), input.phoneOptions)
      : null;
    const phones = [telefone1, telefone2].filter((phone): phone is ImportedPhone => Boolean(phone));

    for (const phone of phones) {
      if (!phone.normalized) continue;
      if (phone.usedDefaultDdd) summary.telefonesComDddPadrao += 1;
      if (phone.alreadyHadDdd) summary.telefonesJaComDdd += 1;
      if (phone.alreadyHadCountry) summary.telefonesJaComPais += 1;
    }

    const primary = hasDigits(telefone1) ? telefone1 : telefone2;
    let status: ImportedContactStatus;
    if (!primary || !hasDigits(primary)) status = 'sem_telefone';
    else status = statusFromPhone(primary, seen, blocked);

    if (status === 'valido' && primary?.normalized) {
      seen.add(primary.normalized);
      if (telefone2?.normalized && telefone2.normalized !== primary.normalized) {
        seen.add(telefone2.normalized);
      }
    }

    const optOut = status === 'opt_out';
    contacts.push({
      id: `${input.importId}-r${index + 1}`,
      importId: input.importId,
      rowNumber: index + 2,
      nome,
      primeiroNome: toPrimeiroNome(nome),
      telefone1,
      telefone2,
      status,
      optOut,
    });

    summary.total += 1;
    if (status === 'valido') summary.validos += 1;
    else if (status === 'invalido') summary.invalidos += 1;
    else if (status === 'duplicado') summary.duplicados += 1;
    else if (status === 'sem_telefone') summary.semTelefone += 1;
    else if (status === 'falta_ddd') summary.faltaDdd += 1;
    else summary.optOut += 1;
  });

  return { contacts, summary };
}

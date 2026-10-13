import { DISPAROS_MAX_CSV_ROWS } from '@/lib/disparos/constants';
import type { DisparoColumnMapping, ParsedCsv } from '@/lib/disparos/types';

export class DisparoCsvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DisparoCsvError';
  }
}

function foldHeader(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function detectDelimiter(headerLine: string): ',' | ';' | '\t' {
  const counts = { ',': 0, ';': 0, '\t': 0 };
  let inQuotes = false;
  for (let i = 0; i < headerLine.length; i += 1) {
    const ch = headerLine[i];
    if (ch === '"') {
      if (inQuotes && headerLine[i + 1] === '"') {
        i += 1;
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    if (inQuotes) continue;
    if (ch === ',' || ch === ';' || ch === '\t') counts[ch] += 1;
  }
  if (counts[';'] > counts[','] && counts[';'] >= counts['\t']) return ';';
  if (counts['\t'] > counts[','] && counts['\t'] > counts[';']) return '\t';
  return ',';
}

function parseDelimited(source: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < source.length; i += 1) {
    const ch = source[i];
    if (inQuotes) {
      if (ch === '"') {
        if (source[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === delimiter) {
      row.push(field);
      field = '';
      continue;
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && source[i + 1] === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      continue;
    }
    field += ch;
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  return rows;
}

function uniqueHeaders(headers: string[]): string[] {
  const seen = new Map<string, number>();
  return headers.map((header, index) => {
    const base = header.trim() || `Coluna ${index + 1}`;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    return count === 0 ? base : `${base} (${count + 1})`;
  });
}

export function parseCsv(text: string): ParsedCsv {
  if (text.includes('\u0000')) {
    throw new DisparoCsvError('Esse arquivo não parece um CSV de texto. Salve como CSV UTF-8.');
  }
  const source = text.replace(/^\uFEFF/, '');
  if (!source.trim()) {
    throw new DisparoCsvError('O arquivo está vazio.');
  }
  const firstLine = source.split(/\r?\n/, 1)[0] ?? '';
  const records = parseDelimited(source, detectDelimiter(firstLine));
  if (records.length < 2) {
    throw new DisparoCsvError('O CSV precisa de um cabeçalho e ao menos uma linha.');
  }
  const headers = uniqueHeaders(records[0] ?? []);
  const rows = records.slice(1).map((row) => headers.map((_, index) => row[index] ?? ''));
  if (rows.length > DISPAROS_MAX_CSV_ROWS) {
    throw new DisparoCsvError(
      `O arquivo tem mais de ${DISPAROS_MAX_CSV_ROWS.toLocaleString('pt-BR')} linhas. Divida a base antes de importar.`,
    );
  }
  return { headers, rows };
}

function findHeader(
  headers: string[],
  used: Set<number>,
  test: (folded: string) => boolean,
): string {
  const index = headers.findIndex((header, position) => !used.has(position) && test(foldHeader(header)));
  if (index < 0) return '';
  used.add(index);
  return headers[index] ?? '';
}

export function suggestColumnMapping(headers: string[]): DisparoColumnMapping {
  const used = new Set<number>();
  const telefone2 = findHeader(headers, used, (header) =>
    /telefone\s*2|celular\s*2|phone\s*2|whatsapp\s*2|fone\s*2/.test(header),
  );
  const telefone1 = findHeader(headers, used, (header) =>
    /telefone|celular|whatsapp|phone|fone|mobile/.test(header),
  );
  let nome = findHeader(
    headers,
    used,
    (header) =>
      header === 'nome' ||
      header === 'name' ||
      header === 'cliente' ||
      header === 'contato' ||
      header === 'nome completo',
  );
  if (!nome) {
    nome = findHeader(headers, used, (header) => header === 'primeiro nome' || header.startsWith('nome '));
  }
  return { nome, telefone1, telefone2 };
}

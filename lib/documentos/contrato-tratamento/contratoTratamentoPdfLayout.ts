/**
 * Parsing e classificação do texto do contrato para renderização jsPDF.
 * Renderiza o template integral — sem resumir, fundir parágrafos nem remover cláusulas.
 */

export type ContratoPdfLineKind =
  | 'doc_title'
  | 'doc_subtitle'
  | 'meta'
  | 'part'
  | 'clause'
  | 'subclause'
  | 'roman'
  | 'closing'
  | 'signature_hdr'
  | 'signature_line'
  | 'signature_space'
  | 'page_break_signatures'
  | 'body';

export const CONTRATO_SIGNATURE_PAGE_BREAK_MARKER = '__QUEBRA_PAGINA_ASSINATURAS__';
export const CONTRATO_SIGNATURE_PAGE_PADDING_LINES = 10;

export type ContratoPdfLine = {
  kind: ContratoPdfLineKind;
  text: string;
};

/** Remove artefatos de fonte (═, %P) sem alterar o conteúdo jurídico. */
export function sanitizeContratoLine(raw: string): string {
  return raw
    .replace(/\r/g, '')
    .replace(/═+/g, '')
    .replace(/%P+/g, '')
    .trimEnd();
}

/** Normaliza quebras: no máximo uma linha em branco consecutiva. */
export function normalizeContratoLines(texto: string): string[] {
  const lines = texto.split('\n').map(sanitizeContratoLine);
  const out: string[] = [];
  let blankStreak = 0;

  for (const line of lines) {
    if (!line.trim()) {
      blankStreak++;
      if (blankStreak <= 1) out.push('');
      continue;
    }
    blankStreak = 0;
    out.push(line);
  }

  return out;
}

export function classifyContratoLine(line: string): ContratoPdfLineKind {
  const t = line.trim();
  if (!t) return 'body';
  if (t === CONTRATO_SIGNATURE_PAGE_BREAK_MARKER) return 'page_break_signatures';
  if (t === 'CONTRATO DE TRATAMENTO') return 'doc_title';
  if (/^Tirzepatida —/i.test(t)) return 'doc_subtitle';
  if (/^Data de impressão:/i.test(t)) return 'meta';
  if (/^PARTE [IVXLC]+ —/i.test(t)) return 'part';
  if (/^CLÁUSULA \d+ —/i.test(t)) return 'clause';
  if (/^\d+\.\d+\./.test(t)) return 'subclause';
  if (/^[IVXLC]+ —/.test(t)) return 'roman';
  if (/^Assinatura do Paciente$/i.test(t)) return 'signature_hdr';
  if (/^Assinatura do Médico$/i.test(t)) return 'signature_hdr';
  if (/^ASSINATURA/i.test(t)) return 'signature_hdr';
  if (/^_{3,}/.test(t)) return 'signature_line';
  if (/^E, por estarem de acordo/i.test(t)) return 'closing';
  if (/^Identificador do documento:/i.test(t)) return 'meta';
  if (/^Data da assinatura do médico:/i.test(t)) return 'meta';
  if (/^Data da assinatura do paciente:/i.test(t)) return 'meta';
  if (/^Assinatura digital com validação/i.test(t)) return 'meta';
  return 'body';
}

/** Converte o texto preenchido do template em linhas classificadas (conteúdo integral). */
export function parseContratoTextoParaPdf(texto: string): ContratoPdfLine[] {
  const lines = normalizeContratoLines(texto);
  const out: ContratoPdfLine[] = [];
  let reserveSignatureSpace = false;

  for (const text of lines) {
    if (!text.trim()) {
      out.push({
        text,
        kind: reserveSignatureSpace ? 'signature_space' : 'body',
      });
      continue;
    }

    const kind = classifyContratoLine(text);
    if (kind === 'page_break_signatures') {
      reserveSignatureSpace = false;
      out.push({ text, kind });
      continue;
    }

    if (kind === 'signature_hdr') {
      reserveSignatureSpace = true;
      out.push({ text, kind });
      continue;
    }

    if (kind === 'closing' || kind === 'meta') {
      reserveSignatureSpace = false;
    }

    out.push({ text, kind });
  }

  return out;
}


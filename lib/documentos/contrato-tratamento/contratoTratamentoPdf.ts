import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';
import { addMedicoPdfLogoToDocument } from '@/utils/pdfMedicoLogo';
import type { JsPDFDoc as JsPDFDocLogo } from '@/utils/pdfMedicoLogo';
import { buildContratoTratamentoTexto } from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import type { ContratoTratamentoBuildContext } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import {
  CONTRATO_SIGNATURE_PAGE_PADDING_LINES,
  parseContratoTextoParaPdf,
  type ContratoPdfLine,
  type ContratoPdfLineKind,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdfLayout';

type JsPDFDoc = InstanceType<typeof jsPDF>;

export type ContratoTratamentoPdfOptions = {
  /** PDF enviado à assinatura digital BRy — reserva faixa inferior só na última página. */
  omitManualSignatureBlock?: boolean;
};

/** A4 jsPDF (mm). */
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;

const MARGIN_X = 18;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/** Topo do corpo após cabeçalho institucional (páginas 2+). */
const PAGE_TOP = 18;
/** Limite inferior do texto — acima da linha de numeração (y=292). */
const PAGE_BOTTOM_CONTENT = 283;
const PAGE_NUMBER_Y = 292;

/**
 * Faixa reservada na ÚLTIMA página quando o rodapé ICP-Brasil / EasySign é aplicado antes da assinatura BRy.
 * Inclui blocos de assinatura do paciente e do médico.
 */
const SIGNED_FOOTER_BAND_LAST_PAGE = 120;

const DARK: [number, number, number] = [30, 42, 58];
const MUTED: [number, number, number] = [90, 90, 90];

type PdfPageFillRecord = {
  page: number;
  endY: number;
  usedMm: number;
  capacityMm: number;
};

type PdfCursor = {
  doc: JsPDFDoc;
  y: number;
  firstPageTopY: number;
  reserveSignedFooterOnLastPage: boolean;
  pageEndYs?: PdfPageFillRecord[];
  /** Linhas ainda não renderizadas — evita reservar rodapé BRy antes da página final real. */
  pendingLines: ContratoPdfLine[];
};

function medicoTituloNomeForPdf(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

function isSignatureKind(kind: ContratoPdfLineKind): boolean {
  return (
    kind === 'signature_hdr' ||
    kind === 'signature_line' ||
    kind === 'signature_space' ||
    kind === 'page_break_signatures' ||
    kind === 'closing'
  );
}

function contentBottomForCursor(cursor: PdfCursor, line?: ContratoPdfLine): number {
  if (
    !line ||
    !isSignatureKind(line.kind) ||
    !cursor.reserveSignedFooterOnLastPage ||
    cursor.pendingLines.length > 0
  ) {
    return PAGE_BOTTOM_CONTENT;
  }
  return PAGE_BOTTOM_CONTENT - SIGNED_FOOTER_BAND_LAST_PAGE;
}

function newPage(cursor: PdfCursor): void {
  recordPageEndY(cursor);
  cursor.doc.addPage();
  cursor.y = PAGE_TOP;
}

function recordPageEndY(cursor: PdfCursor): void {
  if (!cursor.pageEndYs) return;
  const page = cursor.doc.getCurrentPageInfo().pageNumber;
  const bottom = PAGE_BOTTOM_CONTENT;
  const used = Math.max(0, cursor.y - (page === 1 ? cursor.firstPageTopY : PAGE_TOP));
  const capacity = bottom - (page === 1 ? cursor.firstPageTopY : PAGE_TOP);
  cursor.pageEndYs.push({ page, endY: cursor.y, usedMm: used, capacityMm: capacity });
}

function ensureSpace(cursor: PdfCursor, needed: number, line?: ContratoPdfLine): void {
  if (cursor.y + needed <= contentBottomForCursor(cursor, line)) return;
  newPage(cursor);
}

/** Evita título de PARTE/CLÁUSULA órfão no fim da página (só títulos curtos). */
function avoidOrphanHeading(
  cursor: PdfCursor,
  line: ContratoPdfLine,
  blockHeight: number
): void {
  const kind = line.kind;
  if (kind !== 'part' && kind !== 'clause' && kind !== 'signature_hdr') return;
  const bottom = contentBottomForCursor(cursor, line);
  const roomBelow = bottom - cursor.y;
  if (roomBelow < blockHeight && roomBelow < PAGE_BOTTOM_CONTENT * 0.25 && cursor.y > PAGE_TOP + 15) {
    newPage(cursor);
  }
}

function styleForKind(kind: ContratoPdfLineKind): {
  fontSize: number;
  bold: boolean;
  indent: number;
  lineHeight: number;
  gapBefore: number;
  align?: 'left' | 'center';
} {
  switch (kind) {
    case 'doc_title':
      return { fontSize: 12, bold: true, indent: 0, lineHeight: 5.5, gapBefore: 0, align: 'center' };
    case 'doc_subtitle':
      return { fontSize: 9.5, bold: true, indent: 0, lineHeight: 4.5, gapBefore: 1.5, align: 'center' };
    case 'meta':
      return { fontSize: 8, bold: false, indent: 0, lineHeight: 3.8, gapBefore: 0.8, align: 'center' };
    case 'part':
      return { fontSize: 10, bold: true, indent: 0, lineHeight: 4.5, gapBefore: 5 };
    case 'clause':
      return { fontSize: 9, bold: true, indent: 0, lineHeight: 4.2, gapBefore: 3.5 };
    case 'subclause':
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 3.5, gapBefore: 0.4 };
    case 'roman':
      return { fontSize: 8.5, bold: false, indent: 5, lineHeight: 3.5, gapBefore: 0.2 };
    case 'signature_hdr':
      return { fontSize: 9.5, bold: true, indent: 0, lineHeight: 4.5, gapBefore: 5 };
    case 'signature_line':
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 6, gapBefore: 2 };
    case 'signature_space':
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 7, gapBefore: 0 };
    case 'page_break_signatures':
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 3.5, gapBefore: 0 };
    case 'closing':
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 3.8, gapBefore: 3 };
    default:
      return { fontSize: 8.5, bold: false, indent: 0, lineHeight: 3.5, gapBefore: 0.4 };
  }
}

function drawContratoLine(cursor: PdfCursor, line: ContratoPdfLine): void {
  if (line.kind === 'page_break_signatures') {
    newPage(cursor);
    cursor.y += CONTRATO_SIGNATURE_PAGE_PADDING_LINES * 3.5;
    return;
  }

  if (line.kind === 'signature_space') {
    cursor.y += 7;
    return;
  }

  if (!line.text.trim()) {
    cursor.y += 1.2;
    return;
  }

  const style = styleForKind(line.kind);
  const maxWidth = CONTENT_WIDTH - style.indent;
  cursor.doc.setFontSize(style.fontSize);
  cursor.doc.setFont('helvetica', style.bold ? 'bold' : 'normal');
  cursor.doc.setTextColor(...DARK);

  const wrapped = cursor.doc.splitTextToSize(line.text, maxWidth) as string[];
  const blockHeight = style.gapBefore + wrapped.length * style.lineHeight;

  avoidOrphanHeading(cursor, line, blockHeight);
  ensureSpace(cursor, Math.min(blockHeight, style.lineHeight + style.gapBefore), line);

  cursor.y += style.gapBefore;

  for (const wline of wrapped) {
    ensureSpace(cursor, style.lineHeight, line);
    if (style.align === 'center') {
      cursor.doc.text(wline, PAGE_WIDTH / 2, cursor.y, { align: 'center' });
    } else {
      cursor.doc.text(wline, MARGIN_X + style.indent, cursor.y);
    }
    cursor.y += style.lineHeight;
  }
}

function drawInstitutionalHeader(doc: JsPDFDoc, medico: Medico | null): number {
  const medicoNome = medicoTituloNomeForPdf(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;

  doc.setTextColor(...DARK);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNome, MARGIN_X, 14);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.text(crmText, MARGIN_X, 19);
  if (medico?.email) {
    doc.setTextColor(...MUTED);
    doc.text(medico.email, MARGIN_X, 23);
    doc.setTextColor(...DARK);
  }

  const headerEnd = medico?.email ? 26 : 22;
  doc.setDrawColor(200, 200, 200);
  doc.line(MARGIN_X, headerEnd, MARGIN_X + CONTENT_WIDTH, headerEnd);
  return headerEnd + 6;
}

function drawPageNumbers(doc: JsPDFDoc, medicoNome: string, crmText: string): void {
  const total = doc.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.text(
      `Contrato de Tratamento — ${medicoNome} — ${crmText} — Página ${p}/${total}`,
      PAGE_WIDTH / 2,
      PAGE_NUMBER_Y,
      { align: 'center' }
    );
  }
}

export async function buildContratoTratamentoJsPdfDocument(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext,
  options?: ContratoTratamentoPdfOptions,
  paginationOut?: { pageEndYs: PdfPageFillRecord[] }
): Promise<JsPDFDoc> {
  const reserveSignedFooterOnLastPage = options?.omitManualSignatureBlock === true;
  const { texto } = await buildContratoTratamentoTexto(medico, paciente, {
    ...ctx,
    reservaAssinaturaDigitalNoPdf: reserveSignedFooterOnLastPage,
  });

  const doc = new jsPDF();
  await addMedicoPdfLogoToDocument(doc as JsPDFDocLogo, medico);

  const startY = drawInstitutionalHeader(doc, medico);
  const lines = parseContratoTextoParaPdf(texto);
  const cursor: PdfCursor = {
    doc,
    y: startY,
    firstPageTopY: startY,
    reserveSignedFooterOnLastPage,
    pageEndYs: [],
    pendingLines: lines.slice(),
  };

  for (const line of lines) {
    cursor.pendingLines.shift();
    drawContratoLine(cursor, line);
  }
  recordPageEndY(cursor);
  if (paginationOut && cursor.pageEndYs) {
    paginationOut.pageEndYs = cursor.pageEndYs;
  }

  const medicoNome = medicoTituloNomeForPdf(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;
  drawPageNumbers(doc, medicoNome, crmText);

  return doc;
}

export async function downloadContratoTratamentoPdf(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext
): Promise<void> {
  const doc = await buildContratoTratamentoJsPdfDocument(medico, paciente, ctx);
  const safeNome = (paciente.dadosIdentificacao?.nomeCompleto || paciente.nome || 'Paciente').replace(
    /\s+/g,
    '_'
  );
  const dataArquivo = new Date().toISOString().split('T')[0];
  doc.save(`Contrato_Tratamento_${safeNome}_${dataArquivo}.pdf`);
}

export async function printContratoTratamentoPdf(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext
): Promise<void> {
  const doc = await buildContratoTratamentoJsPdfDocument(medico, paciente, ctx);
  const blobUrl = doc.output('bloburl');
  const url = typeof blobUrl === 'string' ? blobUrl : blobUrl.href;
  const w = window.open(url, '_blank', 'noopener,noreferrer');
  if (w) {
    w.onload = () => {
      try {
        w.print();
      } catch {
        /* ignore */
      }
    };
  }
}

export function openContratoTratamentoPdfUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

/** Métricas de paginação (auditoria / testes). */
export type ContratoPdfPaginationMetrics = {
  pageCount: number;
  usableHeightMm: number;
  signedFooterReserveLastPageMm: number;
  avgFillRatio: number;
  perPage: PdfPageFillRecord[];
  avgWastedMmPerPage: number;
};

export function measureContratoPdfPagination(
  doc: JsPDFDoc,
  pageEndYs?: PdfPageFillRecord[]
): ContratoPdfPaginationMetrics {
  const pageCount = doc.getNumberOfPages();
  const usableHeightMm = PAGE_BOTTOM_CONTENT - PAGE_TOP;
  const perPage = pageEndYs ?? [];
  const fillRatios = perPage.map((p) => (p.capacityMm > 0 ? p.usedMm / p.capacityMm : 0));
  const avgFillRatio =
    fillRatios.length > 0
      ? fillRatios.reduce((a, b) => a + b, 0) / fillRatios.length
      : pageCount > 0
        ? usableHeightMm / (PAGE_HEIGHT - 20)
        : 0;
  const wasted = perPage.map((p) => Math.max(0, p.capacityMm - p.usedMm));
  const avgWastedMmPerPage =
    wasted.length > 0 ? wasted.reduce((a, b) => a + b, 0) / wasted.length : 0;

  return {
    pageCount,
    usableHeightMm,
    signedFooterReserveLastPageMm: SIGNED_FOOTER_BAND_LAST_PAGE,
    avgFillRatio,
    perPage,
    avgWastedMmPerPage,
  };
}

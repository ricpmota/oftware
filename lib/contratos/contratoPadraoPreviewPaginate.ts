import {
  CONTRATO_SIGNATURE_PAGE_PADDING_LINES,
  parseContratoTextoParaPdf,
  type ContratoPdfLine,
  type ContratoPdfLineKind,
} from '@/lib/documentos/contrato-tratamento/contratoTratamentoPdfLayout';

const PAGE_TOP_MM = 18;
const PAGE_BOTTOM_MM = 283;
/** Alinhado ao cabeçalho institucional do preview (fora do fluxo de linhas). */
const FIRST_PAGE_CONTENT_START_MM = 48;
const CONTENT_WIDTH_MM = 174;

export type ContratoPreviewPageBlock = { type: 'line'; line: ContratoPdfLine };

export type ContratoPreviewPage = {
  pageNumber: number;
  blocks: ContratoPreviewPageBlock[];
  isSignaturePage: boolean;
};

function styleForKind(kind: ContratoPdfLineKind): {
  fontSize: number;
  lineHeight: number;
  gapBefore: number;
} {
  switch (kind) {
    case 'doc_title':
      return { fontSize: 12, lineHeight: 5.5, gapBefore: 0 };
    case 'doc_subtitle':
      return { fontSize: 9.5, lineHeight: 4.5, gapBefore: 1.5 };
    case 'meta':
      return { fontSize: 8, lineHeight: 3.8, gapBefore: 0.8 };
    case 'part':
      return { fontSize: 10, lineHeight: 4.5, gapBefore: 5 };
    case 'clause':
      return { fontSize: 9, lineHeight: 4.2, gapBefore: 3.5 };
    case 'subclause':
      return { fontSize: 8.5, lineHeight: 3.5, gapBefore: 0.4 };
    case 'roman':
      return { fontSize: 8.5, lineHeight: 3.5, gapBefore: 0.2 };
    case 'page_break_signatures':
      return { fontSize: 8.5, lineHeight: 3.5, gapBefore: 0 };
    case 'closing':
      return { fontSize: 8.5, lineHeight: 3.8, gapBefore: 3 };
    default:
      return { fontSize: 8.5, lineHeight: 3.5, gapBefore: 0.35 };
  }
}

/** Estimativa alinhada ao jsPDF (~78–88 caracteres por linha em 174 mm). */
function estimateWrappedLines(text: string, fontSize: number): number {
  const charsPerLine = Math.max(48, Math.round((CONTENT_WIDTH_MM / fontSize) * 4.2));
  const len = text.trim().length;
  if (!len) return 0;
  return Math.max(1, Math.ceil(len / charsPerLine));
}

function lineBlockHeightMm(line: ContratoPdfLine): number {
  if (line.kind === 'page_break_signatures') {
    return CONTRATO_SIGNATURE_PAGE_PADDING_LINES * 3.5;
  }
  if (line.kind === 'signature_space') return 7;
  if (!line.text.trim()) return 1.1;

  const style = styleForKind(line.kind);
  const wrapped = estimateWrappedLines(line.text, style.fontSize);
  return style.gapBefore + wrapped * style.lineHeight;
}

function pageContentStartMm(pageIndex: number): number {
  return pageIndex === 0 ? FIRST_PAGE_CONTENT_START_MM : PAGE_TOP_MM;
}

function pageContentEndMm(): number {
  return PAGE_BOTTOM_MM;
}

/**
 * Pagina o texto para preview HTML. Páginas intermediárias usam toda a altura útil;
 * a reserva de assinatura é renderizada só no componente visual da última página.
 */
export function paginateContratoPreviewTexto(texto: string): ContratoPreviewPage[] {
  const parsed = parseContratoTextoParaPdf(texto);
  const pages: ContratoPreviewPage[] = [];
  let pageIndex = 0;
  let y = pageContentStartMm(0);
  let blocks: ContratoPreviewPageBlock[] = [];
  let isSignaturePage = false;

  const flushPage = () => {
    if (blocks.length === 0 && pages.length > 0) return;
    pages.push({
      pageNumber: pages.length + 1,
      blocks,
      isSignaturePage,
    });
    pageIndex += 1;
    blocks = [];
    y = pageContentStartMm(pageIndex);
  };

  for (const line of parsed) {
    if (line.kind === 'page_break_signatures') {
      const h = lineBlockHeightMm(line);
      if (y + h > pageContentEndMm() && blocks.length > 0) flushPage();
      if (blocks.length > 0) flushPage();
      isSignaturePage = true;
      y = pageContentStartMm(pageIndex) + h;
      continue;
    }

    const h = lineBlockHeightMm(line);
    if (h <= 0) continue;

    if (y + h > pageContentEndMm() && blocks.length > 0) {
      flushPage();
    }

    if (line.text.trim()) {
      blocks.push({ type: 'line', line });
    }
    y += h;
  }

  if (blocks.length > 0 || pages.length === 0) {
    flushPage();
  }

  return pages;
}

export function previewLineClassName(kind: ContratoPdfLineKind): string {
  switch (kind) {
    case 'doc_title':
      return 'text-center text-[12pt] font-bold text-[#1e2a3a] leading-snug';
    case 'doc_subtitle':
      return 'text-center text-[9.5pt] font-bold text-[#1e2a3a] leading-snug mt-1';
    case 'meta':
      return 'text-center text-[8pt] text-[#5a5a5a] leading-snug mt-1';
    case 'part':
      return 'text-[10pt] font-bold text-[#1e2a3a] mt-4 leading-snug';
    case 'clause':
      return 'text-[9pt] font-bold text-[#1e2a3a] mt-3 leading-snug';
    case 'subclause':
      return 'text-[8.5pt] text-[#1e2a3a] mt-0.5 leading-snug';
    case 'roman':
      return 'text-[8.5pt] text-[#1e2a3a] pl-4 mt-0.5 leading-snug';
    case 'closing':
      return 'text-[8.5pt] text-[#1e2a3a] mt-3 leading-relaxed';
    default:
      return 'text-[8.5pt] text-[#1e2a3a] leading-relaxed mt-0.5 whitespace-pre-wrap';
  }
}

/**
 * Rodapé visual institucional Oftware + ICP-Brasil — aplicado no PDF **antes** da assinatura HUB.
 * O PDF retornado pela BRy não deve ser alterado após a assinatura PAdES.
 */
import fs from 'fs/promises';
import path from 'path';
import type { PDFFont, PDFPage } from 'pdf-lib';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import QRCode from 'qrcode';
import {
  buildPrescriptionPublicDocumentPageDisplayUrl,
  ICP_BRASIL_VALIDATION_DISPLAY_URL,
} from '@/lib/signature/prescriptionPublicDocumentUrls';

export type PrescriptionSignedPdfFooterParams = {
  physicianName: string;
  crm?: string;
  crmUf?: string;
  signedAt?: Date;
  validationCode: string;
  /** URL completa para o QR Code (com ?codigo=). Não é impressa no PDF. */
  publicValidationUrl: string;
  publicPdfUrl: string;
  icpImagePath?: string;
  /** Aplica rodapé em todas as páginas (ex.: receituário de controle especial — 2 vias). */
  applyToAllPages?: boolean;
  /**
   * Linhas centrais do rodapé. Se omitido, usa textos de receituário/prescrição.
   * Contrato de Tratamento injeta linhas próprias sem alterar outros fluxos.
   */
  centerLines?: string[];
  /** Empilha o rodapé acima de outro (ex.: assinatura do paciente acima do médico). */
  footerBottomOffsetPt?: number;
  /** Altura da faixa do rodapé (padrão 108pt). Paciente EasySign usa faixa maior. */
  footerBandHeightPt?: number;
  /** Imagem embutida (PNG/JPG) no lugar do logo ICP — ex.: rubrica EasySign. */
  leadImageBytes?: Uint8Array;
  /** Não carrega icp.jpg quando leadImageBytes estiver ausente. */
  omitLeadImageFallback?: boolean;
  /** Dimensões máximas da imagem à esquerda (rubrica costuma ser mais baixa que o logo ICP). */
  leadImageMaxHeightPt?: number;
  leadImageMaxWidthPt?: number;
  /** Rubrica acima da faixa de evidências (não na coluna esquerda do texto). */
  leadImageAboveEvidenceBand?: boolean;
  /** Altura reservada para a faixa da rubrica acima das evidências. */
  leadImageAboveBandHeightPt?: number;
  /** Espaço entre a rubrica e a linha superior do bloco de evidências. */
  leadImageAboveBandGapPt?: number;
};

const DEFAULT_ICP_PATH = path.join(process.cwd(), 'public', 'icp.jpg');

export const PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT = 18;
export const PRESCRIPTION_FOOTER_BAND_HEIGHT_PT = 108;
export const PRESCRIPTION_FOOTER_STACK_GAP_PT = 12;
export const PRESCRIPTION_FOOTER_HORIZONTAL_MARGIN_PT = 36;
export const PRESCRIPTION_FOOTER_ROW_TOP_INSET_PT = 8;
export const PRESCRIPTION_FOOTER_ICP_TARGET_HEIGHT_PT = 56;
export const PRESCRIPTION_FOOTER_ICP_MAX_WIDTH_PT = 82;

export type FooterLayoutPt = {
  footerBottom: number;
  footerTop: number;
  signatureBandBottom: number;
  signatureBandTop: number;
  textRowTopY: number;
};

/** Geometria do rodapé — evidências abaixo, rubrica opcional na faixa superior. */
export function computePrescriptionFooterLayoutPt(
  params: Pick<
    PrescriptionSignedPdfFooterParams,
    | 'footerBottomOffsetPt'
    | 'footerBandHeightPt'
    | 'leadImageAboveEvidenceBand'
    | 'leadImageAboveBandHeightPt'
    | 'leadImageAboveBandGapPt'
  >
): FooterLayoutPt {
  const imageInSeparateBand = Boolean(params.leadImageAboveEvidenceBand);
  const signatureBandHeight = imageInSeparateBand
    ? (params.leadImageAboveBandHeightPt ?? 48)
    : 0;
  const signatureBandGap = imageInSeparateBand ? (params.leadImageAboveBandGapPt ?? 8) : 0;
  const signatureStackPt = imageInSeparateBand ? signatureBandHeight + signatureBandGap : 0;

  const footerBottom =
    PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT + (params.footerBottomOffsetPt ?? 0) + signatureStackPt;
  const bandHeight = params.footerBandHeightPt ?? PRESCRIPTION_FOOTER_BAND_HEIGHT_PT;
  const footerTop = footerBottom + bandHeight;
  const signatureBandBottom = footerTop + signatureBandGap;
  const signatureBandTop = signatureBandBottom + signatureBandHeight;

  return {
    footerBottom,
    footerTop,
    signatureBandBottom,
    signatureBandTop,
    textRowTopY: footerTop - PRESCRIPTION_FOOTER_ROW_TOP_INSET_PT,
  };
}

const FOOTER_BOTTOM_MARGIN_PT = PRESCRIPTION_FOOTER_BOTTOM_MARGIN_PT;
const FOOTER_BAND_HEIGHT_PT = PRESCRIPTION_FOOTER_BAND_HEIGHT_PT;
const ROW_TOP_INSET_PT = PRESCRIPTION_FOOTER_ROW_TOP_INSET_PT;
const ICP_TARGET_HEIGHT_PT = PRESCRIPTION_FOOTER_ICP_TARGET_HEIGHT_PT;
const ICP_MAX_WIDTH_PT = PRESCRIPTION_FOOTER_ICP_MAX_WIDTH_PT;
const QR_SIZE_PT = 52;
const HORIZONTAL_MARGIN_PT = PRESCRIPTION_FOOTER_HORIZONTAL_MARGIN_PT;
const TEXT_SIZE_PT = 6.5;
const FIRST_LINE_SIZE_PT = 7;
const CODE_VALUE_SIZE_PT = 7;
const CODE_QR_GAP_PT = 6;
const CODE_LETTER_SPACING_PT = 0.5;
/** Alinhamento do topo do texto com ICP/QR (Helvetica). */
const TEXT_CAP_HEIGHT_RATIO = 0.72;
const LINE_COLOR = rgb(0.82, 0.82, 0.82);
const TEXT_COLOR = rgb(0.18, 0.18, 0.18);

export function formatPhysicianDisplayNameForFooter(name: string): string {
  const trimmed = name?.trim();
  return trimmed || 'Médico';
}

/** @deprecated use formatPhysicianDisplayNameForFooter */
export function formatPhysicianNameForFooter(name: string): string {
  return formatPhysicianDisplayNameForFooter(name);
}

function formatSignedAtForFooter(signedAt?: Date): { date: string; time: string } {
  const d = signedAt instanceof Date && !Number.isNaN(signedAt.getTime()) ? signedAt : new Date();
  return {
    date: d.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }),
    time: d.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  };
}

/** Parágrafos do bloco central — endereços fixos, sem query string. */
export function buildPrescriptionSignatureFooterCenterLines(params: {
  physicianName: string;
  signedAt?: Date;
}): string[] {
  const name = formatPhysicianDisplayNameForFooter(params.physicianName);
  const { date, time } = formatSignedAtForFooter(params.signedAt);
  const documentPageUrl = buildPrescriptionPublicDocumentPageDisplayUrl();

  return [
    `Receituário assinado digitalmente por ${name} em ${date} às ${time}.`,
    'Documento assinado digitalmente conforme a MP nº 2.200-2/2001.',
    'Valide a assinatura ICP-Brasil:',
    ICP_BRASIL_VALIDATION_DISPLAY_URL,
    'Consulte este documento:',
    documentPageUrl,
  ];
}

function wrapTextToLines(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
    } else {
      if (current) lines.push(current);
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function measureTextWithLetterSpacing(
  font: PDFFont,
  text: string,
  size: number,
  letterSpacingPt: number
): number {
  if (!text.length) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    width += font.widthOfTextAtSize(text[i]!, size);
    if (i < text.length - 1) width += letterSpacingPt;
  }
  return width;
}

function drawTextWithLetterSpacing(
  page: PDFPage,
  text: string,
  centerX: number,
  y: number,
  size: number,
  font: PDFFont,
  letterSpacingPt: number
): void {
  const totalWidth = measureTextWithLetterSpacing(font, text, size, letterSpacingPt);
  let x = centerX - totalWidth / 2;
  for (let i = 0; i < text.length; i++) {
    const char = text[i]!;
    page.drawText(char, { x, y, size, font, color: TEXT_COLOR });
    x += font.widthOfTextAtSize(char, size) + (i < text.length - 1 ? letterSpacingPt : 0);
  }
}

async function loadIcpImageBytes(icpImagePath: string): Promise<Uint8Array | null> {
  try {
    return await fs.readFile(icpImagePath);
  } catch {
    return null;
  }
}

async function embedLeadImage(
  pdfDoc: PDFDocument,
  bytes: Uint8Array
): Promise<{ image: Awaited<ReturnType<PDFDocument['embedPng']>>; width: number; height: number } | null> {
  try {
    const image = await pdfDoc.embedPng(bytes);
    return { image, width: image.width, height: image.height };
  } catch {
    try {
      const image = await pdfDoc.embedJpg(bytes);
      return { image, width: image.width, height: image.height };
    } catch {
      return null;
    }
  }
}

async function drawLeadImageAboveBand(
  pdfDoc: PDFDocument,
  page: PDFPage,
  params: PrescriptionSignedPdfFooterParams,
  imageBytes: Uint8Array,
  signatureBandBottom: number,
  signatureBandTop: number
): Promise<void> {
  const { width } = page.getSize();
  const embedded = await embedLeadImage(pdfDoc, imageBytes);
  if (!embedded) return;

  const bandHeight = signatureBandTop - signatureBandBottom;
  const maxH = Math.min(params.leadImageMaxHeightPt ?? 40, Math.max(8, bandHeight - 8));
  const maxW = params.leadImageMaxWidthPt ?? 140;
  const scale = maxH / embedded.height;
  let imgW = embedded.width * scale;
  let imgH = maxH;
  if (imgW > maxW) {
    imgW = maxW;
    imgH = embedded.height * (imgW / embedded.width);
  }
  imgH = Math.min(imgH, bandHeight - 4);
  imgW = Math.min(imgW, width - HORIZONTAL_MARGIN_PT * 2);

  page.drawLine({
    start: { x: HORIZONTAL_MARGIN_PT, y: signatureBandTop },
    end: { x: width - HORIZONTAL_MARGIN_PT, y: signatureBandTop },
    thickness: 0.5,
    color: LINE_COLOR,
  });

  const imgX = HORIZONTAL_MARGIN_PT;
  const imgY = signatureBandBottom + (bandHeight - imgH) / 2;
  page.drawImage(embedded.image, {
    x: imgX,
    y: imgY,
    width: imgW,
    height: imgH,
  });
}

async function drawFooterOnPage(
  pdfDoc: PDFDocument,
  page: PDFPage,
  params: PrescriptionSignedPdfFooterParams,
  fonts: { font: PDFFont; fontBold: PDFFont },
  icpBytes: Uint8Array | null
): Promise<void> {
  const { width } = page.getSize();
  const { font, fontBold } = fonts;

  const imageInSeparateBand = Boolean(params.leadImageAboveEvidenceBand);
  const signatureBandHeight = imageInSeparateBand
    ? (params.leadImageAboveBandHeightPt ?? 48)
    : 0;
  const signatureBandGap = imageInSeparateBand ? (params.leadImageAboveBandGapPt ?? 8) : 0;
  const signatureStackPt = imageInSeparateBand ? signatureBandHeight + signatureBandGap : 0;

  const footerBottom =
    FOOTER_BOTTOM_MARGIN_PT + (params.footerBottomOffsetPt ?? 0) + signatureStackPt;
  const bandHeight = params.footerBandHeightPt ?? FOOTER_BAND_HEIGHT_PT;
  const footerTop = footerBottom + bandHeight;
  const signatureBandBottom = footerTop + signatureBandGap;
  const signatureBandTop = signatureBandBottom + signatureBandHeight;

  if (imageInSeparateBand && icpBytes?.length) {
    await drawLeadImageAboveBand(
      pdfDoc,
      page,
      params,
      icpBytes,
      signatureBandBottom,
      signatureBandTop
    );
  } else if (imageInSeparateBand && signatureBandHeight > 0) {
    page.drawLine({
      start: { x: HORIZONTAL_MARGIN_PT, y: signatureBandTop },
      end: { x: width - HORIZONTAL_MARGIN_PT, y: signatureBandTop },
      thickness: 0.5,
      color: LINE_COLOR,
    });
  }

  const rowTopY = footerTop - ROW_TOP_INSET_PT;

  page.drawLine({
    start: { x: HORIZONTAL_MARGIN_PT, y: footerTop },
    end: { x: width - HORIZONTAL_MARGIN_PT, y: footerTop },
    thickness: 0.5,
    color: LINE_COLOR,
  });

  let icpRightX = HORIZONTAL_MARGIN_PT;
  let icpH = 0;

  const bandLeadBytes = imageInSeparateBand ? null : icpBytes;

  if (bandLeadBytes?.length) {
    const embedded = await embedLeadImage(pdfDoc, bandLeadBytes);
    if (embedded) {
      const targetHeight = params.leadImageMaxHeightPt ?? ICP_TARGET_HEIGHT_PT;
      const maxWidth = params.leadImageMaxWidthPt ?? ICP_MAX_WIDTH_PT;
      const scale = targetHeight / embedded.height;
      let icpW = embedded.width * scale;
      icpH = targetHeight;
      if (icpW > maxWidth) {
        icpW = maxWidth;
        icpH = embedded.height * (icpW / embedded.width);
      }
      const icpY = rowTopY - icpH;
      page.drawImage(embedded.image, {
        x: HORIZONTAL_MARGIN_PT,
        y: icpY,
        width: icpW,
        height: icpH,
      });
      icpRightX = HORIZONTAL_MARGIN_PT + icpW + 12;
    }
  }

  const qrColumnWidth = Math.max(QR_SIZE_PT + 8, 72);
  const qrX = width - HORIZONTAL_MARGIN_PT - qrColumnWidth;
  const qrY = rowTopY - QR_SIZE_PT;
  const qrCenterX = qrX + qrColumnWidth / 2;

  const validationUrl = params.publicValidationUrl.trim();
  try {
    const qrPng = await QRCode.toBuffer(validationUrl, {
      type: 'png',
      margin: 1,
      width: 256,
      errorCorrectionLevel: 'M',
    });
    const qrImage = await pdfDoc.embedPng(qrPng);
    page.drawImage(qrImage, {
      x: qrCenterX - QR_SIZE_PT / 2,
      y: qrY,
      width: QR_SIZE_PT,
      height: QR_SIZE_PT,
    });
  } catch {
    /* QR opcional */
  }

  const codeValue = params.validationCode.trim();
  const codeCapHeight = CODE_VALUE_SIZE_PT * TEXT_CAP_HEIGHT_RATIO;
  const codeBaselineY = qrY - CODE_QR_GAP_PT - codeCapHeight;
  drawTextWithLetterSpacing(
    page,
    codeValue,
    qrCenterX,
    codeBaselineY,
    CODE_VALUE_SIZE_PT,
    fontBold,
    CODE_LETTER_SPACING_PT
  );

  const textLeft = icpRightX;
  const textRight = qrX - 10;
  const textMaxWidth = Math.max(140, textRight - textLeft);
  const approxCharsPerLine = Math.max(38, Math.floor(textMaxWidth / (TEXT_SIZE_PT * 0.52)));

  const centerParagraphs =
    params.centerLines ??
    buildPrescriptionSignatureFooterCenterLines({
      physicianName: params.physicianName,
      signedAt: params.signedAt,
    });

  const allLines: { text: string; bold?: boolean }[] = [];
  for (let i = 0; i < centerParagraphs.length; i++) {
    const para = centerParagraphs[i]!;
    const isUrlLine = para.startsWith('http://') || para.startsWith('https://');
    const wrapped = isUrlLine ? [para] : wrapTextToLines(para, approxCharsPerLine);
    for (const line of wrapped) {
      allLines.push({ text: line, bold: i === 0 });
    }
  }

  const lineHeight = 8;
  const firstLineSize = FIRST_LINE_SIZE_PT;
  let textY = rowTopY - firstLineSize * TEXT_CAP_HEIGHT_RATIO;

  for (const line of allLines) {
    const size = line.bold ? firstLineSize : TEXT_SIZE_PT;
    page.drawText(line.text, {
      x: textLeft,
      y: textY,
      size,
      font: line.bold ? fontBold : font,
      color: TEXT_COLOR,
      maxWidth: textMaxWidth,
    });
    textY -= lineHeight;
  }
}

export async function appendPrescriptionDigitalSignatureVisualFooter(
  signedPdfBytes: Buffer | Uint8Array,
  params: PrescriptionSignedPdfFooterParams
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.load(signedPdfBytes, { ignoreEncryption: true });
  const pages = pdfDoc.getPages();
  if (!pages.length) {
    throw new Error('PDF assinado sem páginas para aplicar rodapé visual.');
  }

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const icpBytes = params.leadImageBytes?.length
    ? params.leadImageBytes
    : params.omitLeadImageFallback
      ? null
      : await loadIcpImageBytes(params.icpImagePath ?? DEFAULT_ICP_PATH);

  const targetPages = params.applyToAllPages ? pages : [pages[pages.length - 1]!];
  for (const page of targetPages) {
    await drawFooterOnPage(pdfDoc, page, params, { font, fontBold }, icpBytes);
  }

  return pdfDoc.save();
}

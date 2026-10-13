import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { ReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import {
  formatMedicoCidade,
  formatMedicoEnderecoCompleto,
  formatMedicoTelefone,
} from '@/lib/prescricao/receituarioControleEspecialContext';
import { itensTemConteudoUtil } from '@/lib/prescricao/prescricaoConteudoUnificado';
import {
  controleEspecialPdfLabels,
  localizeControleEspecialPhrase,
  prescriptionPdfDateLocale,
} from '@/lib/prescricao/prescriptionPrintLabels';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';

type JsPDFDoc = InstanceType<typeof jsPDF>;

const DARK: [number, number, number] = [44, 62, 80];
const PAGE_LEFT = 15;
const PAGE_RIGHT = 195;
const CONTENT_WIDTH = PAGE_RIGHT - PAGE_LEFT;
const COL_GAP = 8;
const COL_WIDTH = (CONTENT_WIDTH - COL_GAP) / 2;
const SECTION_HEADER_H = 6;
const SECTION_PAD = 3;
const ADMIN_BOX_HEIGHT = 52;
const HEADER_FILL: [number, number, number] = [245, 245, 245];
const LINE_INSET = 2;

/** Espaço reservado para rodapé ICP-Brasil (aplicado no servidor antes da BRy). */
export const CONTROLE_ESPECIAL_SIGNED_FOOTER_RESERVE_MM = 46;

export type ReceituarioControleEspecialVia = 'farmacia' | 'paciente';

export type ReceituarioControleEspecialBuildOptions = {
  /** Reserva área inferior para o rodapé visual de assinatura digital. */
  reserveSignedFooterSpace?: boolean;
  language?: PrescriptionPrintLanguage;
};

function printLanguage(options?: ReceituarioControleEspecialBuildOptions): PrescriptionPrintLanguage {
  return options?.language === 'en' ? 'en' : 'pt';
}

function medicoTituloNome(m: Medico | null, language: PrescriptionPrintLanguage): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  const fallback = controleEspecialPdfLabels(language).physicianFallback;
  return `${titulo} ${m?.nome || fallback}`;
}

function addDaysLocalized(date: Date, days: number, language: PrescriptionPrintLanguage): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString(prescriptionPdfDateLocale(language));
}

function viaLabel(via: ReceituarioControleEspecialVia, language: PrescriptionPrintLanguage): string {
  const labels = controleEspecialPdfLabels(language);
  return via === 'farmacia' ? labels.viaFarmacia : labels.viaPaciente;
}

function maxContentBottom(options?: ReceituarioControleEspecialBuildOptions): number {
  const reserve = options?.reserveSignedFooterSpace ? CONTROLE_ESPECIAL_SIGNED_FOOTER_RESERVE_MM : 12;
  return 297 - reserve;
}

function setBoxStroke(doc: JsPDFDoc): void {
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
}

function drawSectionBox(
  doc: JsPDFDoc,
  x: number,
  y: number,
  width: number,
  title: string,
  contentHeight: number
): { contentTop: number; bottom: number } {
  const totalH = SECTION_HEADER_H + contentHeight;
  setBoxStroke(doc);
  doc.rect(x, y, width, totalH);

  doc.setFillColor(...HEADER_FILL);
  doc.rect(x + 0.15, y + 0.15, width - 0.3, SECTION_HEADER_H - 0.15, 'F');
  setBoxStroke(doc);
  doc.line(x, y + SECTION_HEADER_H, x + width, y + SECTION_HEADER_H);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...DARK);
  doc.text(title, x + width / 2, y + 4.2, { align: 'center' });

  return { contentTop: y + SECTION_HEADER_H + SECTION_PAD, bottom: y + totalH };
}

function drawFieldLine(doc: JsPDFDoc, x: number, y: number, width: number, label: string, value: string): number {
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  const labelText = `${label} `;
  doc.text(labelText, x, y);
  const labelW = doc.getTextWidth(labelText);
  const valueX = x + labelW;
  const maxValueW = width - labelW - LINE_INSET;
  const valueLines = doc.splitTextToSize(value, maxValueW);
  doc.text(valueLines, valueX, y);
  return y + Math.max(4.5, valueLines.length * 4);
}

function drawEmptyFillLine(
  doc: JsPDFDoc,
  x: number,
  y: number,
  width: number,
  label: string,
  lineStartExtra = 0
): number {
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);
  doc.text(label, x, y);
  const lineX = x + doc.getTextWidth(label) + lineStartExtra;
  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.2);
  doc.line(lineX, y + 0.6, x + width - LINE_INSET, y + 0.6);
  return y + 5.5;
}

function drawEmptyFillLinePair(
  doc: JsPDFDoc,
  x: number,
  y: number,
  totalWidth: number,
  leftLabel: string,
  rightLabel: string
): number {
  const half = totalWidth / 2 - 2;
  drawEmptyFillLine(doc, x, y, half, leftLabel);
  drawEmptyFillLine(doc, x + half + 4, y, half, rightLabel);
  return y + 5.5;
}

export function buildControleEspecialPatientBlock(
  doc: JsPDFDoc,
  ctx: ReceituarioControleEspecialPacienteContext,
  startY: number,
  language: PrescriptionPrintLanguage = 'pt'
): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const labels = controleEspecialPdfLabels(language);
  const endereco = localizeControleEspecialPhrase(ctx.enderecoCompleto || '—', language);
  const enderecoLines = doc.splitTextToSize(endereco, w - SECTION_PAD * 2 - 28);
  const contentH = 5 + 5 + enderecoLines.length * 4 + 5 + 3;

  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, labels.patientSection, contentH);
  let y = contentTop;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  y = drawFieldLine(doc, ix, y, innerW, labels.patient, ctx.pacienteNome || '—');
  y = drawFieldLine(doc, ix, y, innerW, 'CPF:', ctx.pacienteCpf?.trim() || '—');
  y = drawFieldLine(doc, ix, y, innerW, labels.address, endereco);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${labels.sex}: ${localizeControleEspecialPhrase(ctx.sexo, language)}`, ix, y);
  doc.text(`${labels.age}: ${localizeControleEspecialPhrase(ctx.idade, language)}`, ix + 55, y);
  doc.text(`UF: ${ctx.uf}`, ix + 105, y);

  return bottom + 3;
}

export function buildControleEspecialDoctorBlock(
  doc: JsPDFDoc,
  medico: Medico | null,
  startY: number,
  language: PrescriptionPrintLanguage = 'pt'
): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const endereco = formatMedicoEnderecoCompleto(medico);
  const enderecoLines = doc.splitTextToSize(endereco, w - SECTION_PAD * 2 - 32);
  const crmEstado = medico?.crm?.estado || 'XX';
  const crmNumero = medico?.crm?.numero || '00000';
  const cpf = medico?.cpfPessoal?.trim() || '—';
  const contentH = 5 + 5 + enderecoLines.length * 4 + 5 + 5 + 3;

  const labels = controleEspecialPdfLabels(language);
  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, labels.issuerSection, contentH);
  let y = contentTop;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  y = drawFieldLine(doc, ix, y, innerW, labels.name, medicoTituloNome(medico, language));
  y = drawFieldLine(doc, ix, y, innerW, 'CRM:', `${crmNumero} - ${crmEstado}`);
  y = drawFieldLine(doc, ix, y, innerW, 'CPF:', cpf);
  y = drawFieldLine(doc, ix, y, innerW, labels.address, localizeControleEspecialPhrase(endereco, language));
  y = drawFieldLine(doc, ix, y, innerW, labels.city, localizeControleEspecialPhrase(formatMedicoCidade(medico), language));
  drawFieldLine(doc, ix, y, innerW, labels.phone, localizeControleEspecialPhrase(formatMedicoTelefone(medico), language));

  return bottom + 3;
}

function measurePrescriptionContentHeight(doc: JsPDFDoc, prescricao: Prescricao, innerW: number): number {
  let h = 3;
  if (itensTemConteudoUtil(prescricao.itens)) {
    for (const item of prescricao.itens) {
      h += 5;
      if (item.dosagem?.trim()) h += 4;
      if (item.quantidade?.trim()) h += 4;
      const posologia = [item.frequencia, item.instrucoes].filter(Boolean).join(' — ');
      if (posologia) {
        const posLines = doc.splitTextToSize(`Posologia: ${posologia}`, innerW - 4);
        h += posLines.length * 3.8;
      }
      h += 2;
    }
  } else if (prescricao.descricao?.trim()) {
    const descLines = doc.splitTextToSize(prescricao.descricao, innerW);
    h += descLines.length * 4;
  }
  if (prescricao.observacoes?.trim()) {
    h += 6;
    const obsLines = doc.splitTextToSize(prescricao.observacoes, innerW);
    h += obsLines.length * 3.8;
  }
  return Math.max(h, 14);
}

function buildControleEspecialPrescriptionBlock(
  doc: JsPDFDoc,
  prescricao: Prescricao,
  startY: number,
  maxBottom: number,
  language: PrescriptionPrintLanguage = 'pt'
): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  const desiredContentH = measurePrescriptionContentHeight(doc, prescricao, innerW);
  const maxBoxBottom = maxBottom - ADMIN_BOX_HEIGHT - 6;
  const maxContentH = maxBoxBottom - startY - SECTION_HEADER_H - SECTION_PAD - 2;
  const contentH = Math.min(desiredContentH, Math.max(14, maxContentH));

  const labels = controleEspecialPdfLabels(language);
  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, labels.prescriptionSection, contentH);
  let y = contentTop;

  if (itensTemConteudoUtil(prescricao.itens)) {
    prescricao.itens.forEach((item, index) => {
      if (y > contentTop + contentH - 4) return;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...DARK);
      doc.text(`${index + 1}. ${item.medicamento}`, ix, y);
      y += 4.5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      if (item.dosagem?.trim()) {
        y = drawFieldLine(doc, ix, y, innerW, labels.strength, item.dosagem);
      }
      if (item.quantidade?.trim()) {
        y = drawFieldLine(doc, ix, y, innerW, labels.quantity, item.quantidade);
      }
      const posologia = [item.frequencia, item.instrucoes].filter(Boolean).join(' — ');
      if (posologia) {
        y = drawFieldLine(doc, ix, y, innerW, labels.directions, posologia);
      }
      y += 1.5;
    });
  } else if (prescricao.descricao?.trim()) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    const descLines = doc.splitTextToSize(prescricao.descricao, innerW);
    doc.text(descLines, ix, y);
    y += descLines.length * 4;
  }

  if (prescricao.observacoes?.trim() && y < contentTop + contentH - 6) {
    y += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text(labels.notes, ix, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(prescricao.observacoes, innerW);
    doc.text(obsLines, ix, y);
  }

  return bottom + 3;
}

function drawAdminSectionHeader(doc: JsPDFDoc, x: number, y: number, width: number, title: string): number {
  setBoxStroke(doc);
  doc.setFillColor(...HEADER_FILL);
  doc.rect(x + 0.15, y + 0.15, width - 0.3, SECTION_HEADER_H - 0.15, 'F');
  setBoxStroke(doc);
  doc.line(x, y + SECTION_HEADER_H, x + width, y + SECTION_HEADER_H);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...DARK);
  doc.text(title, x + width / 2, y + 4.2, { align: 'center' });
  return y + SECTION_HEADER_H + 2;
}

function buildControleEspecialAdminBlocks(
  doc: JsPDFDoc,
  topY: number,
  language: PrescriptionPrintLanguage = 'pt'
): number {
  const leftX = PAGE_LEFT;
  const rightX = PAGE_LEFT + COL_WIDTH + COL_GAP;
  const boxBottom = topY + ADMIN_BOX_HEIGHT;

  setBoxStroke(doc);
  doc.rect(leftX, topY, COL_WIDTH, ADMIN_BOX_HEIGHT);
  doc.rect(rightX, topY, COL_WIDTH, ADMIN_BOX_HEIGHT);

  const labels = controleEspecialPdfLabels(language);
  let ly = drawAdminSectionHeader(doc, leftX, topY, COL_WIDTH, labels.buyerSection);
  ly += 3;
  const innerLeftW = COL_WIDTH - SECTION_PAD * 2;
  const lix = leftX + SECTION_PAD;

  ly = drawEmptyFillLine(doc, lix, ly, innerLeftW, labels.name);
  ly = drawEmptyFillLinePair(doc, lix, ly, innerLeftW, labels.id, labels.issuer);
  ly = drawEmptyFillLine(doc, lix, ly, innerLeftW, labels.address);
  ly = drawEmptyFillLinePair(doc, lix, ly, innerLeftW, labels.city, 'UF:');
  drawEmptyFillLine(doc, lix, ly, innerLeftW, `${labels.phone} (____) `);

  drawAdminSectionHeader(doc, rightX, topY, COL_WIDTH, labels.supplierSection);
  const innerRightW = COL_WIDTH - SECTION_PAD * 2;
  const rix = rightX + SECTION_PAD;
  const signatureLineY = boxBottom - 16;
  const signatureLineW = innerRightW * 0.7;
  const signatureLineX = rix + (innerRightW - signatureLineW) / 2;

  doc.setDrawColor(0, 0, 0);
  doc.setLineWidth(0.25);
  doc.line(signatureLineX, signatureLineY, signatureLineX + signatureLineW, signatureLineY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(...DARK);
  doc.text(labels.pharmacistSignature, rightX + COL_WIDTH / 2, signatureLineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(labels.dateBlank, rightX + COL_WIDTH / 2, boxBottom - 4, { align: 'center' });

  return boxBottom + 4;
}

export function buildReceituarioControleEspecialPage(
  doc: JsPDFDoc,
  via: ReceituarioControleEspecialVia,
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext,
  options?: ReceituarioControleEspecialBuildOptions
): void {
  const language = printLanguage(options);
  const labels = controleEspecialPdfLabels(language);
  const maxY = maxContentBottom(options);
  const dataEmissao = new Date().toLocaleDateString(prescriptionPdfDateLocale(language));
  const dataValidade = addDaysLocalized(new Date(), 30, language);

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.title, PAGE_LEFT + CONTENT_WIDTH / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.text(viaLabel(via, language), PAGE_LEFT + CONTENT_WIDTH / 2, 25, { align: 'center' });

  let y = 32;
  y = buildControleEspecialPatientBlock(doc, ctx, y, language);
  y = buildControleEspecialDoctorBlock(doc, medico, y, language);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${labels.issueDate}: ${dataEmissao}`, PAGE_LEFT, y);
  doc.text(`${labels.validUntil}: ${dataValidade}`, PAGE_LEFT + 85, y);
  y += 7;

  buildControleEspecialPrescriptionBlock(doc, prescricao, y, maxY, language);

  const adminTop = maxY - ADMIN_BOX_HEIGHT;
  buildControleEspecialAdminBlocks(doc, adminTop, language);
}

export function buildReceituarioControleEspecialPages(
  doc: JsPDFDoc,
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext,
  options?: ReceituarioControleEspecialBuildOptions
): void {
  buildReceituarioControleEspecialPage(doc, 'farmacia', prescricao, medico, ctx, options);
  doc.addPage();
  buildReceituarioControleEspecialPage(doc, 'paciente', prescricao, medico, ctx, options);
}

/** Gera jsPDF do Receituário de Controle Especial (2 vias). */
export async function generateReceituarioControleEspecialPdf(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext,
  options?: ReceituarioControleEspecialBuildOptions
): Promise<JsPDFDoc> {
  const doc = new jsPDF();
  buildReceituarioControleEspecialPages(doc, prescricao, medico, ctx, options);
  return doc;
}

export async function buildReceituarioControleEspecialPdfBuffer(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext,
  options?: ReceituarioControleEspecialBuildOptions
): Promise<Buffer> {
  const doc = await generateReceituarioControleEspecialPdf(prescricao, medico, ctx, options);
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return Buffer.from(ab);
}

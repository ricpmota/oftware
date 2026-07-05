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
};

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

function addDaysPtBr(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString('pt-BR');
}

function viaLabel(via: ReceituarioControleEspecialVia): string {
  return via === 'farmacia' ? '1ª VIA FARMÁCIA' : '2ª VIA PACIENTE';
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
  startY: number
): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const enderecoLines = doc.splitTextToSize(ctx.enderecoCompleto || '—', w - SECTION_PAD * 2 - 28);
  const contentH = 5 + 5 + enderecoLines.length * 4 + 5 + 3;

  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, 'INFORMAÇÕES DO PACIENTE', contentH);
  let y = contentTop;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  y = drawFieldLine(doc, ix, y, innerW, 'Paciente:', ctx.pacienteNome || '—');
  y = drawFieldLine(doc, ix, y, innerW, 'CPF:', ctx.pacienteCpf?.trim() || '—');
  y = drawFieldLine(doc, ix, y, innerW, 'Endereço:', ctx.enderecoCompleto || '—');
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sexo: ${ctx.sexo}`, ix, y);
  doc.text(`Idade: ${ctx.idade}`, ix + 55, y);
  doc.text(`UF: ${ctx.uf}`, ix + 105, y);

  return bottom + 3;
}

export function buildControleEspecialDoctorBlock(doc: JsPDFDoc, medico: Medico | null, startY: number): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const endereco = formatMedicoEnderecoCompleto(medico);
  const enderecoLines = doc.splitTextToSize(endereco, w - SECTION_PAD * 2 - 32);
  const crmEstado = medico?.crm?.estado || 'XX';
  const crmNumero = medico?.crm?.numero || '00000';
  const contentH = 5 + enderecoLines.length * 4 + 5 + 5 + 3;

  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, 'IDENTIFICAÇÃO DO EMITENTE', contentH);
  let y = contentTop;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  y = drawFieldLine(doc, ix, y, innerW, 'Nome:', medicoTituloNome(medico));
  y = drawFieldLine(doc, ix, y, innerW, 'CRM:', `${crmNumero} - ${crmEstado}`);
  y = drawFieldLine(doc, ix, y, innerW, 'Endereço:', endereco);
  y = drawFieldLine(doc, ix, y, innerW, 'Cidade:', formatMedicoCidade(medico));
  drawFieldLine(doc, ix, y, innerW, 'Telefone:', formatMedicoTelefone(medico));

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
  maxBottom: number
): number {
  const x = PAGE_LEFT;
  const w = CONTENT_WIDTH;
  const innerW = w - SECTION_PAD * 2;
  const ix = x + SECTION_PAD;

  const desiredContentH = measurePrescriptionContentHeight(doc, prescricao, innerW);
  const maxBoxBottom = maxBottom - ADMIN_BOX_HEIGHT - 6;
  const maxContentH = maxBoxBottom - startY - SECTION_HEADER_H - SECTION_PAD - 2;
  const contentH = Math.min(desiredContentH, Math.max(14, maxContentH));

  const { contentTop, bottom } = drawSectionBox(doc, x, startY, w, 'PRESCRIÇÃO', contentH);
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
        y = drawFieldLine(doc, ix, y, innerW, 'Concentração:', item.dosagem);
      }
      if (item.quantidade?.trim()) {
        y = drawFieldLine(doc, ix, y, innerW, 'Quantidade:', item.quantidade);
      }
      const posologia = [item.frequencia, item.instrucoes].filter(Boolean).join(' — ');
      if (posologia) {
        y = drawFieldLine(doc, ix, y, innerW, 'Posologia:', posologia);
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
    doc.text('Observações / Justificativa:', ix, y);
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

function buildControleEspecialAdminBlocks(doc: JsPDFDoc, topY: number): number {
  const leftX = PAGE_LEFT;
  const rightX = PAGE_LEFT + COL_WIDTH + COL_GAP;
  const boxBottom = topY + ADMIN_BOX_HEIGHT;

  setBoxStroke(doc);
  doc.rect(leftX, topY, COL_WIDTH, ADMIN_BOX_HEIGHT);
  doc.rect(rightX, topY, COL_WIDTH, ADMIN_BOX_HEIGHT);

  let ly = drawAdminSectionHeader(doc, leftX, topY, COL_WIDTH, 'IDENTIFICAÇÃO DO COMPRADOR');
  ly += 3;
  const innerLeftW = COL_WIDTH - SECTION_PAD * 2;
  const lix = leftX + SECTION_PAD;

  ly = drawEmptyFillLine(doc, lix, ly, innerLeftW, 'Nome:');
  ly = drawEmptyFillLinePair(doc, lix, ly, innerLeftW, 'Ident.:', 'Órg. Emissor:');
  ly = drawEmptyFillLine(doc, lix, ly, innerLeftW, 'Endereço:');
  ly = drawEmptyFillLinePair(doc, lix, ly, innerLeftW, 'Cidade:', 'UF:');
  drawEmptyFillLine(doc, lix, ly, innerLeftW, 'Telefone: (____) ');

  drawAdminSectionHeader(doc, rightX, topY, COL_WIDTH, 'IDENTIFICAÇÃO DO FORNECEDOR');
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
  doc.text('ASSINATURA DO FARMACÊUTICO', rightX + COL_WIDTH / 2, signatureLineY + 4, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('DATA ____/____/______', rightX + COL_WIDTH / 2, boxBottom - 4, { align: 'center' });

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
  const maxY = maxContentBottom(options);
  const dataEmissao = new Date().toLocaleDateString('pt-BR');
  const dataValidade = addDaysPtBr(new Date(), 30);

  doc.setTextColor(...DARK);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text('RECEITUÁRIO DE CONTROLE ESPECIAL', PAGE_LEFT + CONTENT_WIDTH / 2, 18, { align: 'center' });

  doc.setFontSize(10);
  doc.text(viaLabel(via), PAGE_LEFT + CONTENT_WIDTH / 2, 25, { align: 'center' });

  let y = 32;
  y = buildControleEspecialPatientBlock(doc, ctx, y);
  y = buildControleEspecialDoctorBlock(doc, medico, y);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Data de Emissão: ${dataEmissao}`, PAGE_LEFT, y);
  doc.text(`Data de Validade: ${dataValidade}`, PAGE_LEFT + 85, y);
  y += 7;

  buildControleEspecialPrescriptionBlock(doc, prescricao, y, maxY);

  const adminTop = maxY - ADMIN_BOX_HEIGHT;
  buildControleEspecialAdminBlocks(doc, adminTop);
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

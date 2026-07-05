import jsPDF from 'jspdf';
import type { Prescricao } from '@/types/prescricao';
import type { PrescricaoCatalogoAba, PrescricaoPasta } from '@/types/prescricaoPasta';
import { tituloExibicaoPrescricao } from '@/lib/prescricao/prescricaoCatalogoDefaults';
import {
  isReciboMedicoPrescricao,
  unificarConteudoTextoLivre,
} from '@/lib/prescricao/prescricaoConteudoUnificado';

type JsPDFDoc = InstanceType<typeof jsPDF>;

const MARGIN_LEFT = 18;
const MARGIN_RIGHT = 18;
const PAGE_WIDTH = 210;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_LEFT - MARGIN_RIGHT;
const PAGE_BOTTOM = 280;

function ensureSpace(doc: JsPDFDoc, y: number, needed: number): number {
  if (y + needed <= PAGE_BOTTOM) return y;
  doc.addPage();
  return 22;
}

function writeWrapped(
  doc: JsPDFDoc,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight = 5
): number {
  const lines = doc.splitTextToSize(text, maxWidth) as string[];
  for (const line of lines) {
    y = ensureSpace(doc, y, lineHeight);
    doc.text(line, x, y);
    y += lineHeight;
  }
  return y;
}

function renderItem(
  doc: JsPDFDoc,
  item: Prescricao,
  catalogoAba: PrescricaoCatalogoAba,
  y: number
): number {
  const titulo = tituloExibicaoPrescricao(item.nome);
  y = ensureSpace(doc, y, 8);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  y = writeWrapped(doc, titulo, MARGIN_LEFT, y, CONTENT_WIDTH, 5.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);

  if (isReciboMedicoPrescricao(item)) {
    if (item.descricao?.trim()) {
      y = writeWrapped(doc, `Descricao: ${item.descricao.trim()}`, MARGIN_LEFT + 2, y, CONTENT_WIDTH - 2);
    }
    if (item.valorConsulta != null) {
      y = ensureSpace(doc, y, 5);
      doc.text(`Valor: R$ ${Number(item.valorConsulta).toFixed(2)}`, MARGIN_LEFT + 2, y);
      y += 5;
    }
    if (item.dataRecibo) {
      y = ensureSpace(doc, y, 5);
      doc.text(`Data: ${item.dataRecibo}`, MARGIN_LEFT + 2, y);
      y += 5;
    }
  } else {
    const texto = unificarConteudoTextoLivre(item);
    if (texto) {
      y = writeWrapped(doc, texto, MARGIN_LEFT + 2, y, CONTENT_WIDTH - 2);
    } else {
      y = ensureSpace(doc, y, 5);
      doc.setTextColor(120, 120, 120);
      doc.text('(sem conteudo)', MARGIN_LEFT + 2, y);
      doc.setTextColor(0, 0, 0);
      y += 5;
    }
  }

  if (item.observacoes?.trim()) {
    y = writeWrapped(doc, `Observacoes: ${item.observacoes.trim()}`, MARGIN_LEFT + 2, y, CONTENT_WIDTH - 2);
  }

  return y + 4;
}

/**
 * Gera e faz download de um PDF único com todo o catálogo SISTEMA (prescrições ou protocolos).
 */
export function downloadPrescricaoCatalogoPdf(
  catalogoAba: PrescricaoCatalogoAba,
  pastas: PrescricaoPasta[],
  itens: Prescricao[]
): void {
  const titulo =
    catalogoAba === 'protocolo' ? 'MetaAdmin Geral — Protocolos' : 'MetaAdmin Geral — Prescrições';
  const filename =
    catalogoAba === 'protocolo' ? 'protocolos-sistema.pdf' : 'prescricoes-sistema.pdf';

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(titulo, MARGIN_LEFT, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(80, 80, 80);
  doc.text(`Gerado em ${new Date().toLocaleString('pt-BR')}`, MARGIN_LEFT, 25);
  doc.setTextColor(0, 0, 0);
  doc.line(MARGIN_LEFT, 28, PAGE_WIDTH - MARGIN_RIGHT, 28);

  let y = 36;

  const itensPorPasta = new Map<string, Prescricao[]>();
  for (const pasta of pastas) itensPorPasta.set(pasta.id, []);
  for (const item of itens) {
    if (!item.pastaId) continue;
    itensPorPasta.set(item.pastaId, [...(itensPorPasta.get(item.pastaId) || []), item]);
  }

  for (const pasta of pastas) {
    const lista = itensPorPasta.get(pasta.id) || [];
    y = ensureSpace(doc, y, 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    y = writeWrapped(doc, `${pasta.nome} (${lista.length})`, MARGIN_LEFT, y, CONTENT_WIDTH, 6);
    doc.setDrawColor(200, 200, 200);
    doc.line(MARGIN_LEFT, y - 2, PAGE_WIDTH - MARGIN_RIGHT, y - 2);
    y += 2;

    if (lista.length === 0) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(10);
      doc.setTextColor(120, 120, 120);
      y = writeWrapped(doc, 'Pasta vazia.', MARGIN_LEFT + 2, y, CONTENT_WIDTH - 2);
      doc.setTextColor(0, 0, 0);
      y += 4;
      continue;
    }

    for (const item of lista) {
      y = renderItem(doc, item, catalogoAba, y);
    }
    y += 4;
  }

  if (pastas.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text('Nenhum item encontrado.', MARGIN_LEFT, y);
  }

  doc.save(filename);
}

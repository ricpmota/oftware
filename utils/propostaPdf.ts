/**
 * Gera o PDF da proposta preenchendo o template com nome do médico, tabela de valores e telefone.
 * Usa pdf-lib para overlay no template (não redesenha a página).
 */

import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import type { ProposalPricingRow } from '@/types/proposalPricing';

const NAME_MAX_WIDTH_PT = 380;
const NAME_FONT_SIZE_MIN = 14;   // +15% (12*1.15)
const NAME_FONT_SIZE_MAX = 21;   // +15% (18*1.15)
const NAME_Y_OFFSET_PT = 825;    // abaixar 1 mm (~2.8 pt) em relação a 828
const PHONE_FONT_SIZE = 10.5;
const PHONE_Y_PT = 49;           // baixar 1 mm (~2.8 pt) em relação a 52
const PHONE_COLOR = { r: 11 / 255, g: 77 / 255, b: 90 / 255 };

function formatBrCurrency(cents: number): string {
  if (cents < 0 || Number.isNaN(cents)) return 'R$ 0,00';
  const value = cents / 100;
  const [intPart, decPart] = value.toFixed(2).split('.');
  const withDots = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `R$ ${withDots},${decPart}`;
}

export interface PropostaPdfOptions {
  doctorName: string;
  doctorPhone: string;
  rows: ProposalPricingRow[];
  templateUrl?: string;
}

/**
 * Gera o PDF da proposta e retorna o ArrayBuffer (para download ou blob).
 */
export async function generatePropostaPdf(options: PropostaPdfOptions): Promise<ArrayBuffer> {
  const { doctorName, doctorPhone, rows } = options;
  const templateUrl = options.templateUrl ?? '/api/proposta-template';

  const res = await fetch(templateUrl);
  if (!res.ok) throw new Error('Template de proposta não encontrado');
  const templateBytes = await res.arrayBuffer();

  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const white = rgb(1, 1, 1);

  // 1) Nome do médico no cabeçalho: x=42, y=828 (subiu 1 cm), branco, 12–18pt
  let nameSize = NAME_FONT_SIZE_MAX;
  let nameWidth = helveticaBold.widthOfTextAtSize(doctorName || ' ', nameSize);
  while (nameWidth > NAME_MAX_WIDTH_PT && nameSize >= NAME_FONT_SIZE_MIN) {
    nameSize -= 1;
    nameWidth = helveticaBold.widthOfTextAtSize(doctorName || ' ', nameSize);
  }
  if (doctorName) {
    page.drawText(doctorName, {
      x: 42,
      y: NAME_Y_OFFSET_PT,
      size: nameSize,
      font: helveticaBold,
      color: white,
    });
  }

  // 2) Tabela dentro do retângulo azul: linhas mais próximas, 3 colunas centralizadas
  const tableX = 80;
  const tableYTop = 230;
  const rowHeight = 18; // mais compacto
  const col1W = 150;
  const col2W = 150;
  const col3W = 145;
  const fontSize = 11;

  // Centros das colunas para justificar central
  const centerCol1 = tableX + col1W / 2;
  const centerCol2 = tableX + col1W + col2W / 2;
  const centerCol3 = tableX + col1W + col2W + col3W / 2;

  const headerLabels = ['Dose Semanal', 'Total Mensal (mg)', 'Valor'];
  for (let c = 0; c < 3; c++) {
    const label = headerLabels[c];
    const w = helveticaBold.widthOfTextAtSize(label, fontSize);
    const centerX = c === 0 ? centerCol1 : c === 1 ? centerCol2 : centerCol3;
    page.drawText(label, {
      x: centerX - w / 2,
      y: tableYTop,
      size: fontSize,
      font: helveticaBold,
      color: white,
    });
  }

  const dataRows = [
    { dose: '2,5 mg', total: '10 mg', priceCents: rows[0]?.priceCents ?? 80000 },
    { dose: '5,0 mg', total: '20 mg', priceCents: rows[1]?.priceCents ?? 150000 },
    { dose: '7,5 mg', total: '30 mg', priceCents: rows[2]?.priceCents ?? 210000 },
    { dose: '10,0 mg', total: '40 mg', priceCents: rows[3]?.priceCents ?? 260000 },
    { dose: '12,5 mg', total: '50 mg', priceCents: rows[4]?.priceCents ?? 300000 },
    { dose: '15,0 mg', total: '60 mg', priceCents: rows[5]?.priceCents ?? 340000 },
  ];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const y = tableYTop - (i + 1) * rowHeight;
    const valorStr = formatBrCurrency(row.priceCents);

    const w1 = helvetica.widthOfTextAtSize(row.dose, fontSize);
    const w2 = helvetica.widthOfTextAtSize(row.total, fontSize);
    const w3 = helvetica.widthOfTextAtSize(valorStr, fontSize);

    page.drawText(row.dose, {
      x: centerCol1 - w1 / 2,
      y,
      size: fontSize,
      font: helvetica,
      color: white,
    });
    page.drawText(row.total, {
      x: centerCol2 - w2 / 2,
      y,
      size: fontSize,
      font: helvetica,
      color: white,
    });
    page.drawText(valorStr, {
      x: centerCol3 - w3 / 2,
      y,
      size: fontSize,
      font: helvetica,
      color: white,
    });
  }

  // Linhas horizontais entre as linhas da tabela (separar uma linha da outra)
  const tableRight = tableX + col1W + col2W + col3W;
  for (let i = 0; i <= dataRows.length; i++) {
    const lineY = tableYTop - (i + 1) * rowHeight;
    page.drawLine({
      start: { x: tableX, y: lineY },
      end: { x: tableRight, y: lineY },
      thickness: 0.5,
      color: white,
      opacity: 0.4,
    });
  }

  // 3) Telefone no rodapé: x=92, y=52 (subiu 5 mm), #0B4D5A
  if (doctorPhone) {
    let phoneSize = PHONE_FONT_SIZE;
    const maxPhoneWidth = 200;
    let phoneWidth = helvetica.widthOfTextAtSize(doctorPhone, phoneSize);
    while (phoneWidth > maxPhoneWidth && phoneSize >= 8) {
      phoneSize -= 1;
      phoneWidth = helvetica.widthOfTextAtSize(doctorPhone, phoneSize);
    }
    page.drawText(doctorPhone, {
      x: 92,
      y: PHONE_Y_PT,
      size: phoneSize,
      font: helvetica,
      color: rgb(PHONE_COLOR.r, PHONE_COLOR.g, PHONE_COLOR.b),
    });
  }

  return await pdfDoc.save();
}

/**
 * Nome do arquivo sugerido: Proposta_{doctorName}_{DD-MM-YYYY}.pdf
 */
export function getPropostaFilename(doctorName: string): string {
  const safe = (doctorName || 'Proposta').replace(/[^a-zA-Z0-9\u00C0-\u00FF\s]/g, '').trim().slice(0, 40) || 'Proposta';
  const d = new Date();
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `Proposta_${safe}_${day}-${month}-${year}.pdf`;
}

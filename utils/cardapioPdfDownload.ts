import jsPDF from 'jspdf';
import type { CardapioPdfContext } from '@/types/cardapioPrint';

type JsPDFDoc = InstanceType<typeof jsPDF>;

const PDF_LOGO_SRC = '/icones/logotipo-metodo-28.png';
const PDF_LOGO_MAX_W_MM = 52;
const PDF_LOGO_MAX_H_MM = 22;
const PDF_LOGO_Y_MM = 7;

function pdfLogoLayoutFromImage(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const maxW = PDF_LOGO_MAX_W_MM;
  const maxH = PDF_LOGO_MAX_H_MM;
  const nw = img.naturalWidth;
  const nh = img.naturalHeight;
  let w: number;
  let h: number;
  if (!nw || !nh || nw <= 0 || nh <= 0) {
    w = maxW;
    h = Math.min(maxH, maxW * (9 / 28));
  } else {
    const ratio = nh / nw;
    w = maxW;
    h = w * ratio;
    if (h > maxH) {
      h = maxH;
      w = h / ratio;
    }
  }
  const x = 190 - w - 10;
  const y = PDF_LOGO_Y_MM;
  return { x, y, w, h };
}

async function addLogoToPdf(doc: JsPDFDoc): Promise<void> {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        try {
          const { x, y, w, h } = pdfLogoLayoutFromImage(logoImg);
          doc.addImage(logoImg, 'PNG', x, y, w, h);
        } catch {
          doc.setFontSize(11);
          doc.setFont('helvetica', 'bold');
          doc.text('Oftware', 180, 15, { align: 'right' });
        }
        resolve();
      };
      logoImg.onerror = () => {
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('Oftware', 180, 15, { align: 'right' });
        resolve();
      };
      logoImg.src = PDF_LOGO_SRC;
    });
  } catch {
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('Oftware', 180, 15, { align: 'right' });
  }
}

/**
 * Gera o PDF do cardápio (mesmo fluxo da reimpressão de prescrição: jsPDF + download).
 * Sem bloco de assinatura ao final.
 */
export async function downloadCardapioPdfComoImpressao(ctx: CardapioPdfContext): Promise<void> {
  const darkColor: [number, number, number] = [44, 62, 80];
  const doc = new jsPDF();
  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('CARDÁPIO', 20, 15);
  await addLogoToPdf(doc);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 28, 190, 28);

  let yPos = 38;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paciente: ${ctx.pacienteNome}`, 20, yPos);
  yPos += 6;
  if (ctx.pacienteCpf) {
    doc.text(`CPF: ${ctx.pacienteCpf}`, 20, yPos);
    yPos += 6;
  }
  yPos += 3;

  const normalizeText = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();

  const findMeal = (term: string) => {
    const t = normalizeText(term);
    return ctx.refeicoes.find((r) => normalizeText(r.nomeRefeicao).includes(t)) || null;
  };

  const leftMeals = [findMeal('cafe da manha'), findMeal('lanche da manha'), findMeal('almoco')].filter(Boolean);
  const rightMeals = [findMeal('lanche da tarde'), findMeal('janta')].filter(Boolean);

  const renderRefeicaoCompacta = (
    x: number,
    startY: number,
    width: number,
    refeicao: NonNullable<ReturnType<typeof findMeal>>
  ) => {
    let y = startY;
    doc.setDrawColor(224, 231, 235);
    doc.roundedRect(x, y - 1.5, width, 6.5, 1.5, 1.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(refeicao.nomeRefeicao, x + 1.8, y + 2.7);
    y += 7.2;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.3);
    const escolha = doc.splitTextToSize(`Escolha: ${refeicao.tituloOpcao}`, width - 4).slice(0, 2);
    doc.text(escolha, x + 1.8, y);
    y += escolha.length * 3 + 1.4;

    if (refeicao.itens.length === 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.1);
      doc.text('(Sem itens detalhados)', x + 1.8, y);
      y += 4;
    } else {
      refeicao.itens.forEach((item) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.1);
        const desc = doc.splitTextToSize(item.descricao, width - 24).slice(0, 2);
        doc.text(desc, x + 1.8, y);
        const blockHeight = Math.max(desc.length * 2.9, 3.2);
        const macroTxt = `${item.proteinaG > 0 ? `${item.proteinaG.toFixed(1)}g` : '-'} | ${item.kcal > 0 ? `${Math.round(item.kcal)}kcal` : '-'}`;
        doc.text(macroTxt, x + width - 1.8, y, { align: 'right' });
        y += blockHeight + 0.9;
      });
      const subP = refeicao.itens.reduce((a, r) => a + r.proteinaG, 0);
      const subK = refeicao.itens.reduce((a, r) => a + r.kcal, 0);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(
        `Subtotal: ${subP > 0 ? `${subP.toFixed(1)}g` : '-'} | ${subK > 0 ? `${Math.round(subK)}kcal` : '-'}`,
        x + 1.8,
        y
      );
      y += 4.2;
    }
    return y + 1;
  };

  const leftX = 20;
  const rightX = 108;
  const colW = 82;
  let leftY = yPos + 3;
  let rightY = yPos + 3;

  leftMeals.forEach((meal) => {
    leftY = renderRefeicaoCompacta(leftX, leftY, colW, meal);
  });
  rightMeals.forEach((meal) => {
    rightY = renderRefeicaoCompacta(rightX, rightY, colW, meal);
  });

  yPos = Math.max(leftY, rightY) + 2;
  doc.setDrawColor(220, 226, 230);
  doc.line(20, yPos, 190, yPos);
  yPos += 5;

  if (yPos + 46 > 280) {
    doc.addPage();
    yPos = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Resumo total do dia', 20, yPos);
  yPos += 4.5;

  const tableX = 20;
  const tableW = 170;
  const colRefeicaoW = 68;
  const colProtW = 50;
  const colKcalW = tableW - colRefeicaoW - colProtW;
  const headerH = 5.6;
  const rowH = 5.2;

  doc.setDrawColor(196, 206, 212);
  doc.setFillColor(242, 246, 248);
  doc.rect(tableX, yPos, tableW, headerH, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.4);
  doc.text('Refeição', tableX + 1.8, yPos + 3.8);
  doc.text('Prot. atual/prev.', tableX + colRefeicaoW + colProtW - 1.8, yPos + 3.8, { align: 'right' });
  doc.text('Kcal atual/prev.', tableX + tableW - 1.8, yPos + 3.8, { align: 'right' });

  let yTable = yPos + headerH;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.3);
  ctx.resumoDia.forEach((linha, index) => {
    if (index % 2 === 1) {
      doc.setFillColor(248, 251, 252);
      doc.rect(tableX, yTable, tableW, rowH, 'F');
    }
    doc.setDrawColor(228, 233, 236);
    doc.line(tableX, yTable + rowH, tableX + tableW, yTable + rowH);
    doc.text(linha.nome, tableX + 1.8, yTable + 3.5);
    doc.text(
      `${linha.protAtual.toFixed(1)}/${linha.protPrev.toFixed(1)} g`,
      tableX + colRefeicaoW + colProtW - 1.8,
      yTable + 3.5,
      { align: 'right' }
    );
    doc.text(
      `${Math.round(linha.kcalAtual)}/${linha.kcalPrev}`,
      tableX + tableW - 1.8,
      yTable + 3.5,
      { align: 'right' }
    );
    yTable += rowH;
  });

  const totalH = 5.8;
  doc.setFillColor(228, 238, 242);
  doc.rect(tableX, yTable, tableW, totalH, 'F');
  doc.setDrawColor(196, 206, 212);
  doc.rect(tableX, yPos, tableW, headerH + rowH * ctx.resumoDia.length + totalH);
  doc.line(tableX + colRefeicaoW, yPos, tableX + colRefeicaoW, yTable + totalH);
  doc.line(tableX + colRefeicaoW + colProtW, yPos, tableX + colRefeicaoW + colProtW, yTable + totalH);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('Totais', tableX + 1.8, yTable + 3.8);
  doc.text(
    `${ctx.totais.protAtual.toFixed(1)}/${ctx.totais.protPrev.toFixed(1)} g`,
    tableX + colRefeicaoW + colProtW - 1.8,
    yTable + 3.8,
    { align: 'right' }
  );
  doc.text(
    `${Math.round(ctx.totais.kcalAtual)}/${ctx.totais.kcalPrev}`,
    tableX + tableW - 1.8,
    yTable + 3.8,
    { align: 'right' }
  );

  yPos = yTable + totalH + 4.2;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Data: ${ctx.dataImpressao}`, 20, yPos);

  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  const safeData = ctx.dataImpressao.replace(/\//g, '-');
  doc.save(`Cardapio_${safeNome}_${safeData}.pdf`);
}

import jsPDF from 'jspdf';
import type { CardapioPdfContext, CardapioPdfOpcao } from '@/types/cardapioPrint';
import {
  formatGramasPtBr,
  formatKcalPtBr,
  formatNumeroPtBr,
  macrosDaOpcao,
  opcoesDaRefeicaoPdf,
  rotuloOpcaoPdf,
  formatCardapioPdfItemCells,
  cardapioPdfItemColWidths,
  cardapioPdfMealPhotoBox,
} from '@/utils/cardapioPdfLayout';
import { cardapioPdfMealImageKey, coletarMealImageRefsDoCardapio, hydrateCardapioPdfMealImages } from '@/lib/nutri/cardapioPdfMealImages';
import { loadCardapioMealImageForJsPdf } from '@/utils/cardapioPdfMealImage';
import type { LoadedJsPdfImage } from '@/utils/loadImageForJsPdf';

type JsPDFDoc = InstanceType<typeof jsPDF>;

const PDF_LOGO_SRC = '/icones/logotipo-metodo-28.png';
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const MARGIN_TOP = 16;
const CONTENT_BOTTOM = 277;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const NAVY: [number, number, number] = [10, 31, 68];
const GREEN: [number, number, number] = [27, 107, 74];
const GREEN_SOFT: [number, number, number] = [232, 245, 237];
const GREEN_BORDER: [number, number, number] = [76, 203, 122];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [229, 231, 235];
const TABLE_HEAD: [number, number, number] = [247, 248, 250];
const WHITE: [number, number, number] = [255, 255, 255];
const MEAL_IMG_MAX_MM = 38;
const MEAL_IMG_GAP_MM = 3.5;

function pdfLogoLayoutFromImage(img: HTMLImageElement): { x: number; y: number; w: number; h: number } {
  const maxW = 48;
  const maxH = 22;
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
  return { x: PAGE_W - MARGIN_X - w, y: MARGIN_TOP - 1, w, h };
}

async function loadLogoImage(): Promise<HTMLImageElement | null> {
  try {
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    await new Promise<void>((resolve) => {
      logoImg.onload = () => resolve();
      logoImg.onerror = () => resolve();
      logoImg.src = PDF_LOGO_SRC;
    });
    if (!logoImg.naturalWidth) return null;
    return logoImg;
  } catch {
    return null;
  }
}

function horaAgoraPt(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Gera o documento jsPDF do plano alimentar (layout premium, coluna única).
 * Logo opcional — no browser a função de download carrega o arquivo oficial.
 */
export function buildCardapioJsPdfDocument(
  ctx: CardapioPdfContext,
  options?: {
    logo?: HTMLImageElement | null;
    horaEmissao?: string;
    mealImages?: Record<string, LoadedJsPdfImage>;
  }
): JsPDFDoc {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const horaEmissao = options?.horaEmissao || horaAgoraPt();
  let y = MARGIN_TOP;
  let currentMealName = '';
  let mealOpen = false;

  const setNavy = () => doc.setTextColor(...NAVY);
  const setMuted = () => doc.setTextColor(...MUTED);

  const drawCompactHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setNavy();
    doc.text('PLANO ALIMENTAR', MARGIN_X, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ctx.pacienteNome, PAGE_W - MARGIN_X, 11, { align: 'right' });
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.3);
    doc.line(MARGIN_X, 14, PAGE_W - MARGIN_X, 14);
  };

  const addPage = (continuacao?: string) => {
    doc.addPage();
    drawCompactHeader();
    y = 20;
    if (continuacao) {
      doc.setFillColor(247, 248, 250);
      doc.rect(MARGIN_X, y, CONTENT_W, 7, 'F');
      doc.setDrawColor(...LINE);
      doc.rect(MARGIN_X, y, CONTENT_W, 7);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      setMuted();
      doc.text(`${continuacao.toUpperCase()}  ·  continuação`, MARGIN_X + 2.2, y + 4.7);
      y += 10;
    }
  };

  const spaceLeft = () => CONTENT_BOTTOM - y;

  const ensureSpace = (needed: number, continuacao?: string) => {
    if (spaceLeft() >= needed) return;
    addPage(continuacao);
  };

  const drawFirstPageHeader = () => {
    const logo = options?.logo;
    if (logo) {
      try {
        const { x, y: ly, w, h } = pdfLogoLayoutFromImage(logo);
        doc.addImage(logo, 'PNG', x, ly, w, h);
      } catch {
        /* logo opcional */
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    setNavy();
    doc.text('PLANO ALIMENTAR', MARGIN_X, y + 6);
    y += 12;

    const meta: Array<{ label: string; value: string }> = [];
    if (ctx.pacienteNome?.trim()) meta.push({ label: 'PACIENTE', value: ctx.pacienteNome.trim() });
    if (ctx.pacienteCpf?.trim()) meta.push({ label: 'CPF', value: ctx.pacienteCpf.trim() });
    if (ctx.dataImpressao) meta.push({ label: 'EMITIDO EM', value: ctx.dataImpressao });

    const colW = (CONTENT_W - 6) / 2;
    meta.forEach((item, i) => {
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = MARGIN_X + col * (colW + 6);
      const yy = y + row * 11;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setMuted();
      doc.text(item.label, x, yy);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      setNavy();
      const lines = doc.splitTextToSize(item.value, colW);
      doc.text(lines.slice(0, 2), x, yy + 4.4);
    });
    y += Math.ceil(meta.length / 2) * 11 + 1.5;

    const profissionaisLinha = [
      ctx.medicoNome?.trim() ? `Médico  ${ctx.medicoNome.trim()}` : '',
      ctx.nutricionistaNome?.trim() ? `Nutricionista  ${ctx.nutricionistaNome.trim()}` : '',
    ].filter(Boolean);
    if (profissionaisLinha.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setMuted();
      const linha = profissionaisLinha.join('    ·    ');
      const lines = doc.splitTextToSize(linha, CONTENT_W);
      doc.text(lines.slice(0, 2), MARGIN_X, y + 3.2);
      y += 3.2 + lines.slice(0, 2).length * 3.4 + 2;
    } else {
      y += 1.5;
    }

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 5;
  };

  const drawResumoPlano = () => {
    const energia = ctx.totais?.kcalPrev;
    const proteina = ctx.totais?.protPrev;
    const campos: Array<{ label: string; value: string }> = [];
    if (typeof energia === 'number' && energia > 0) {
      campos.push({ label: 'Energia diária', value: `${formatKcalPtBr(energia)} kcal` });
    }
    if (typeof proteina === 'number' && proteina > 0) {
      campos.push({ label: 'Proteína', value: formatGramasPtBr(proteina) });
    }
    if (campos.length === 0) return;

    const h = 14;
    doc.setFillColor(247, 248, 250);
    doc.rect(MARGIN_X, y, CONTENT_W, h, 'F');
    doc.setDrawColor(...LINE);
    doc.rect(MARGIN_X, y, CONTENT_W, h);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    setMuted();
    doc.text('RESUMO DO PLANO', MARGIN_X + 3, y + 4.4);

    const slot = (CONTENT_W - 6) / Math.max(campos.length, 1);
    campos.forEach((c, i) => {
      const x = MARGIN_X + 3 + i * slot;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      setMuted();
      doc.text(c.label, x, y + 8.2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      setNavy();
      doc.text(c.value, x, y + 12.2);
    });
    y += h + 6;
  };

  const drawMealHeader = (nome: string) => {
    const h = 8;
    ensureSpace(h + 28, undefined);
    doc.setFillColor(...GREEN);
    doc.rect(MARGIN_X, y, CONTENT_W, h, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11.5);
    doc.setTextColor(...WHITE);
    doc.text(nome.toUpperCase(), MARGIN_X + 3, y + 5.5);
    y += h + 4;
    currentMealName = nome;
    mealOpen = true;
  };

  const loadedMealPhoto = (opcao: CardapioPdfOpcao) => {
    const ref = opcao.mealImageRef;
    if (!ref) return null;
    const img = options?.mealImages?.[cardapioPdfMealImageKey(ref)];
    return img?.dataUrl ? img : null;
  };

  const drawOptionBadge = (titulo: string) => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const label = titulo.toUpperCase();
    const tw = doc.getTextWidth(label) + 5;
    const h = 5.4;
    doc.setFillColor(...NAVY);
    doc.roundedRect(MARGIN_X, y, Math.min(tw, 70), h, 0.8, 0.8, 'F');
    doc.setTextColor(...WHITE);
    doc.text(label, MARGIN_X + 2.4, y + 3.7);
    y += h + 2.6;
  };

  const rowPad = 1.6;
  const lineH = 3.6;

  const colStops = (x: number, cols: ReturnType<typeof cardapioPdfItemColWidths>) => {
    const xQtd = x + cols.alimento;
    const xProt = xQtd + cols.quantidade;
    const xKcal = xProt + cols.proteina;
    return { xQtd, xProt, xKcal };
  };

  const drawVLines = (x: number, w: number, y0: number, h: number, cols: ReturnType<typeof cardapioPdfItemColWidths>) => {
    const { xQtd, xProt, xKcal } = colStops(x, cols);
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.rect(x, y0, w, h);
    doc.line(xQtd, y0, xQtd, y0 + h);
    doc.line(xProt, y0, xProt, y0 + h);
    doc.line(xKcal, y0, xKcal, y0 + h);
  };

  const drawTableHeaderAt = (x: number, w: number) => {
    const cols = cardapioPdfItemColWidths(w);
    const h = 6.2;
    doc.setFillColor(...TABLE_HEAD);
    doc.rect(x, y, w, h, 'F');
    drawVLines(x, w, y, h, cols);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    setMuted();
    const { xQtd, xProt, xKcal } = colStops(x, cols);
    doc.text('Alimento', x + 1.8, y + 4.1);
    doc.text('Qtd', xQtd + cols.quantidade - 1.8, y + 4.1, { align: 'right' });
    doc.text('Prot.', xProt + cols.proteina - 1.8, y + 4.1, { align: 'right' });
    doc.text('kcal', xKcal + cols.kcal - 1.8, y + 4.1, { align: 'right' });
    y += h;
    return cols;
  };

  const measureItemRow = (
    item: CardapioPdfOpcao['itens'][number],
    cols: ReturnType<typeof cardapioPdfItemColWidths>
  ) => {
    const cells = formatCardapioPdfItemCells(item);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    const foodLines = doc.splitTextToSize(cells.alimento, cols.alimento - 3.6);
    const qtyLines = doc.splitTextToSize(cells.quantidade, cols.quantidade - 3.4);
    const lines = Math.max(foodLines.length, qtyLines.length, 1);
    return { cells, foodLines, qtyLines, h: lines * lineH + rowPad * 2 };
  };

  const paintItemRow = (
    x: number,
    w: number,
    cols: ReturnType<typeof cardapioPdfItemColWidths>,
    measured: ReturnType<typeof measureItemRow>
  ) => {
    const { cells, foodLines, qtyLines, h } = measured;
    drawVLines(x, w, y, h, cols);
    const { xQtd, xProt, xKcal } = colStops(x, cols);
    const textY = y + rowPad + 3;
    setNavy();
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(foodLines, x + 1.8, textY);
    doc.setFontSize(8);
    doc.text(qtyLines, xQtd + cols.quantidade - 1.8, textY, { align: 'right' });
    doc.text(cells.proteina, xProt + cols.proteina - 1.8, textY, { align: 'right' });
    doc.text(cells.kcal, xKcal + cols.kcal - 1.8, textY, { align: 'right' });
    y += h;
  };

  const drawItemTable = (
    opcao: CardapioPdfOpcao,
    start: { x: number; w: number }
  ) => {
    let x = start.x;
    let w = start.w;
    let cols = cardapioPdfItemColWidths(w);

    const resetFullWidth = () => {
      x = MARGIN_X;
      w = CONTENT_W;
      cols = cardapioPdfItemColWidths(w);
    };

    const ensureHeaderSpace = (needed: number) => {
      if (y + needed <= CONTENT_BOTTOM) return;
      addPage(currentMealName);
      resetFullWidth();
      cols = drawTableHeaderAt(x, w);
    };

    if (!opcao.itens?.length) {
      ensureHeaderSpace(8);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setMuted();
      doc.text('Sem itens detalhados nesta opção.', x + 1, y + 3.5);
      y += 7;
      return;
    }

    ensureHeaderSpace(12);
    cols = drawTableHeaderAt(x, w);

    opcao.itens.forEach((item) => {
      const measured = measureItemRow(item, cols);
      if (y + measured.h > CONTENT_BOTTOM) {
        addPage(currentMealName);
        resetFullWidth();
        cols = drawTableHeaderAt(x, w);
      }
      paintItemRow(x, w, cols, measureItemRow(item, cols));
    });

    const totais = macrosDaOpcao(opcao.itens);
    if (typeof totais.proteina === 'number' || typeof totais.kcal === 'number') {
      const h = 6.4;
      if (y + h > CONTENT_BOTTOM) {
        addPage(currentMealName);
        resetFullWidth();
        cols = drawTableHeaderAt(x, w);
      }
      doc.setFillColor(247, 248, 250);
      doc.rect(x, y, w, h, 'F');
      drawVLines(x, w, y, h, cols);
      const { xProt, xKcal } = colStops(x, cols);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      setNavy();
      doc.text('Total da opção', x + 1.8, y + 4.2);
      doc.text(
        typeof totais.proteina === 'number' ? formatGramasPtBr(totais.proteina) : '—',
        xProt + cols.proteina - 1.8,
        y + 4.2,
        { align: 'right' }
      );
      doc.text(
        typeof totais.kcal === 'number' ? formatKcalPtBr(totais.kcal) : '—',
        xKcal + cols.kcal - 1.8,
        y + 4.2,
        { align: 'right' }
      );
      y += h;
    }
  };

  const drawOrientacao = (texto: string) => {
    const obs = texto.trim();
    if (!obs) return;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    const innerW = CONTENT_W - 8;
    const bodyLines = doc.splitTextToSize(obs, innerW);
    const titleH = 5.2;
    const bodyH = bodyLines.length * 4.1;
    const pad = 3.2;
    const totalH = titleH + bodyH + pad * 2;

    if (y + Math.min(totalH, 18) > CONTENT_BOTTOM) {
      addPage(currentMealName);
    }

    let remaining = [...bodyLines];
    let first = true;
    while (remaining.length > 0) {
      const avail = CONTENT_BOTTOM - y - pad - (first ? titleH : 0) - 2;
      const maxLines = Math.max(1, Math.floor(avail / 4.1));
      const chunk = remaining.slice(0, maxLines);
      remaining = remaining.slice(maxLines);
      const h = (first ? titleH : 2) + chunk.length * 4.1 + pad * 2;

      doc.setFillColor(...GREEN_SOFT);
      doc.rect(MARGIN_X, y, CONTENT_W, h, 'F');
      doc.setFillColor(...GREEN_BORDER);
      doc.rect(MARGIN_X, y, 1.3, h, 'F');

      let ty = y + pad + 3.4;
      if (first) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...GREEN);
        doc.text('ORIENTAÇÃO DA NUTRICIONISTA', MARGIN_X + 4.2, ty);
        ty += titleH;
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9.5);
      setNavy();
      doc.text(chunk, MARGIN_X + 4.2, ty);
      y += h + 1.5;
      first = false;
      if (remaining.length > 0) addPage(currentMealName);
    }
  };

  const estimateOpcaoMin = (opcao: CardapioPdfOpcao) => {
    const photo = loadedMealPhoto(opcao);
    const photoH = photo ? cardapioPdfMealPhotoBox(photo, MEAL_IMG_MAX_MM).h : 0;
    const rows = Math.min(2, opcao.itens?.length || 0);
    return 8 + Math.max(photoH, 6.2 + rows * 7.5) + 6;
  };

  const renderOpcao = (opcao: CardapioPdfOpcao, index: number) => {
    const titulo = rotuloOpcaoPdf(opcao.tituloOpcao, index);
    const photo = loadedMealPhoto(opcao);
    const photoBox = photo ? cardapioPdfMealPhotoBox(photo, MEAL_IMG_MAX_MM) : null;
    if (y + estimateOpcaoMin(opcao) > CONTENT_BOTTOM && y > 24) {
      addPage(mealOpen ? currentMealName : undefined);
    }
    drawOptionBadge(titulo);

    const pageBeforePhoto = doc.getNumberOfPages();
    const photoY = y;
    if (photo && photoBox) {
      try {
        doc.addImage(photo.dataUrl, photo.format || 'JPEG', MARGIN_X, photoY, photoBox.w, photoBox.h);
      } catch {
        /* foto opcional */
      }
    }

    const tableX = photoBox ? MARGIN_X + photoBox.w + MEAL_IMG_GAP_MM : MARGIN_X;
    const tableW = photoBox ? CONTENT_W - photoBox.w - MEAL_IMG_GAP_MM : CONTENT_W;
    drawItemTable(opcao, { x: tableX, w: tableW });
    if (photoBox && doc.getNumberOfPages() === pageBeforePhoto) {
      y = Math.max(y, photoY + photoBox.h) + 2.2;
    } else {
      y += 2;
    }
    if (opcao.observacao?.trim()) drawOrientacao(opcao.observacao);
  };

  const drawResumoDia = () => {
    const linhas = ctx.resumoDia || [];
    const needed = 22 + linhas.length * 7 + 28;
    if (y + Math.min(needed, 40) > CONTENT_BOTTOM) addPage();

    y += 4;
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN_X, y, CONTENT_W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('RESUMO DO DIA', MARGIN_X + 3, y + 5.5);
    y += 11;

    const nRefeicoes = ctx.refeicoes.filter((r) => opcoesDaRefeicaoPdf(r).length > 0).length;
    const nOpcoes = ctx.refeicoes.reduce((a, r) => a + opcoesDaRefeicaoPdf(r).length, 0);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    setMuted();
    const extras: string[] = [];
    if (nRefeicoes > 0) extras.push(`Total de refeições  ${nRefeicoes}`);
    if (nOpcoes > 0) extras.push(`Total de opções  ${nOpcoes}`);
    if (extras.length) {
      doc.text(extras.join('     ·     '), MARGIN_X + 1, y + 1);
      y += 5;
    }

    const col1 = CONTENT_W * 0.38;
    const col2 = CONTENT_W * 0.31;
    const headH = 6.2;
    const rowH = 6.4;

    const drawHead = () => {
      doc.setFillColor(...TABLE_HEAD);
      doc.rect(MARGIN_X, y, CONTENT_W, headH, 'F');
      doc.setDrawColor(...LINE);
      doc.rect(MARGIN_X, y, CONTENT_W, headH);
      doc.line(MARGIN_X + col1, y, MARGIN_X + col1, y + headH);
      doc.line(MARGIN_X + col1 + col2, y, MARGIN_X + col1 + col2, y + headH);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      setMuted();
      doc.text('Refeição', MARGIN_X + 2.2, y + 4.1);
      doc.text('Proteína (plano / meta)', MARGIN_X + col1 + 2.2, y + 4.1);
      doc.text('Energia (plano / meta)', MARGIN_X + col1 + col2 + 2.2, y + 4.1);
      y += headH;
    };

    drawHead();
    linhas.forEach((linha) => {
      if (y + rowH > CONTENT_BOTTOM) {
        addPage();
        drawHead();
      }
      doc.setDrawColor(...LINE);
      doc.rect(MARGIN_X, y, CONTENT_W, rowH);
      doc.line(MARGIN_X + col1, y, MARGIN_X + col1, y + rowH);
      doc.line(MARGIN_X + col1 + col2, y, MARGIN_X + col1 + col2, y + rowH);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setNavy();
      doc.text(linha.nome, MARGIN_X + 2.2, y + 4.3);
      doc.text(
        `${formatNumeroPtBr(linha.protAtual, 1)} / ${formatNumeroPtBr(linha.protPrev, 1)} g`,
        MARGIN_X + col1 + 2.2,
        y + 4.3
      );
      doc.text(
        `${formatKcalPtBr(linha.kcalAtual)} / ${formatKcalPtBr(linha.kcalPrev)} kcal`,
        MARGIN_X + col1 + col2 + 2.2,
        y + 4.3
      );
      y += rowH;
    });

    if (y + rowH > CONTENT_BOTTOM) addPage();
    doc.setFillColor(232, 236, 240);
    doc.rect(MARGIN_X, y, CONTENT_W, rowH, 'F');
    doc.setDrawColor(...LINE);
    doc.rect(MARGIN_X, y, CONTENT_W, rowH);
    doc.line(MARGIN_X + col1, y, MARGIN_X + col1, y + rowH);
    doc.line(MARGIN_X + col1 + col2, y, MARGIN_X + col1 + col2, y + rowH);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    setNavy();
    doc.text('TOTAL', MARGIN_X + 2.2, y + 4.3);
    doc.text(
      `${formatNumeroPtBr(ctx.totais.protAtual, 1)} / ${formatNumeroPtBr(ctx.totais.protPrev, 1)} g`,
      MARGIN_X + col1 + 2.2,
      y + 4.3
    );
    doc.text(
      `${formatKcalPtBr(ctx.totais.kcalAtual)} / ${formatKcalPtBr(ctx.totais.kcalPrev)} kcal`,
      MARGIN_X + col1 + col2 + 2.2,
      y + 4.3
    );
    y += rowH + 6;

    const barW = CONTENT_W;
    const drawBar = (label: string, atual: number, meta: number, unidade: string) => {
      if (!(meta > 0) && !(atual > 0)) return;
      ensureSpace(11);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setMuted();
      const txt = `${label}   ${
        unidade === 'kcal'
          ? `${formatKcalPtBr(atual)} / ${formatKcalPtBr(meta)} kcal`
          : `${formatGramasPtBr(atual)} / ${formatGramasPtBr(meta)}`
      }`;
      doc.text(txt, MARGIN_X, y + 2.2);
      y += 3.4;
      doc.setFillColor(...LINE);
      doc.rect(MARGIN_X, y, barW, 2.6, 'F');
      const ratio = meta > 0 ? Math.min(1, Math.max(0, atual / meta)) : 0;
      doc.setFillColor(...NAVY);
      if (ratio > 0) doc.rect(MARGIN_X, y, barW * ratio, 2.6, 'F');
      y += 6;
    };

    drawBar('Proteína', ctx.totais.protAtual, ctx.totais.protPrev, 'g');
    drawBar('Energia', ctx.totais.kcalAtual, ctx.totais.kcalPrev, 'kcal');
  };

  const drawFooters = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i += 1) {
      doc.setPage(i);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_X, PAGE_H - 15, PAGE_W - MARGIN_X, PAGE_H - 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setMuted();
      const left = ctx.dataImpressao
        ? `Emitido em ${ctx.dataImpressao}  ·  ${horaEmissao}`
        : horaEmissao;
      doc.text(left, MARGIN_X, PAGE_H - 10);
      doc.text(`Página ${i} de ${total}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
      const nutri = ctx.nutricionistaNome?.trim();
      const crn = ctx.nutricionistaCrn?.trim();
      const right = [nutri, crn ? `CRN ${crn}` : ''].filter(Boolean).join('  ·  ');
      if (right) doc.text(right, PAGE_W - MARGIN_X, PAGE_H - 10, { align: 'right' });
    }
  };

  drawFirstPageHeader();
  drawResumoPlano();

  ctx.refeicoes.forEach((refeicao) => {
    const opcoes = opcoesDaRefeicaoPdf(refeicao);
    if (opcoes.length === 0 && !refeicao.itens?.length) return;
    y += 2;
    drawMealHeader(refeicao.nomeRefeicao);
    opcoes.forEach((opcao, idx) => {
      if (idx > 0) {
        y += 3;
        doc.setDrawColor(...LINE);
        doc.setLineWidth(0.2);
        doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
        y += 4;
      }
      renderOpcao(opcao, idx);
    });
    y += 5;
    mealOpen = false;
  });

  drawResumoDia();
  drawFooters();
  return doc;
}

/**
 * Gera o PDF do cardápio (jsPDF) e dispara o download.
 * Mesmo gerador usado por MetaNutri, Meta e MetaPersonal via CardapioPrintModal.
 */
export async function downloadCardapioPdfComoImpressao(
  ctx: CardapioPdfContext,
  options?: { getToken?: () => Promise<string | null> }
): Promise<void> {
  const logo = await loadLogoImage();
  const getToken = options?.getToken;
  const hydrated = getToken ? await hydrateCardapioPdfMealImages(ctx, getToken) : ctx;
  const mealImages: Record<string, LoadedJsPdfImage> = {};
  if (getToken) {
    const refs = coletarMealImageRefsDoCardapio(hydrated);
    await Promise.all(
      refs.map(async (ref) => {
        const img = await loadCardapioMealImageForJsPdf(ref, getToken);
        if (img) mealImages[cardapioPdfMealImageKey(ref)] = img;
      })
    );
  }
  const doc = buildCardapioJsPdfDocument(hydrated, {
    logo,
    horaEmissao: horaAgoraPt(),
    mealImages,
  });
  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  const safeData = ctx.dataImpressao.replace(/\//g, '-');
  doc.save(`Cardapio_${safeNome}_${safeData}.pdf`);
}

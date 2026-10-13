import jsPDF from 'jspdf';
import type { WorkoutPrintData, WorkoutPrintExercise } from '@/lib/personal/workoutPrint';
import { formatPrintRestSec, workoutPrintFilename } from '@/lib/personal/workoutPrint';

type JsPDFDoc = InstanceType<typeof jsPDF>;

const PDF_LOGO_SRC = '/icones/logotipo-metodo-28.png';
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN_X = 16;
const MARGIN_TOP = 16;
const CONTENT_BOTTOM = 277;
const CONTENT_W = PAGE_W - MARGIN_X * 2;

const NAVY: [number, number, number] = [10, 31, 68];
const MUTED: [number, number, number] = [100, 116, 139];
const LINE: [number, number, number] = [229, 231, 235];
const TABLE_HEAD: [number, number, number] = [247, 248, 250];
const WHITE: [number, number, number] = [255, 255, 255];
const NOTE_BG: [number, number, number] = [232, 245, 237];

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

export function buildWorkoutJsPdfDocument(
  ctx: WorkoutPrintData,
  options?: { logo?: HTMLImageElement | null; horaEmissao?: string }
): JsPDFDoc {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const horaEmissao = options?.horaEmissao || horaAgoraPt();
  let y = MARGIN_TOP;

  const setNavy = () => doc.setTextColor(...NAVY);
  const setMuted = () => doc.setTextColor(...MUTED);

  const drawCompactHeader = () => {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    setNavy();
    doc.text('TREINO PERSONALIZADO', MARGIN_X, 11);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(ctx.patientName, PAGE_W - MARGIN_X, 11, { align: 'right' });
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
    doc.text('TREINO PERSONALIZADO', MARGIN_X, y + 6);
    y += 12;

    const meta: Array<{ label: string; value: string }> = [];
    if (ctx.patientName.trim()) meta.push({ label: 'PACIENTE', value: ctx.patientName.trim() });
    if (ctx.title.trim()) meta.push({ label: 'TREINO', value: ctx.title.trim() });
    if (ctx.scheduledDateLabel) meta.push({ label: 'DATA PROGRAMADA', value: ctx.scheduledDateLabel });
    if (ctx.trainerName?.trim()) meta.push({ label: 'PERSONAL', value: ctx.trainerName.trim() });

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
    y += Math.ceil(meta.length / 2) * 11 + 2;

    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.35);
    doc.line(MARGIN_X, y, PAGE_W - MARGIN_X, y);
    y += 6;
  };

  const colSerie = CONTENT_W * 0.14;
  const colReps = CONTENT_W * 0.28;
  const colCarga = CONTENT_W * 0.3;
  const colRest = CONTENT_W * 0.28;

  const drawTableHeader = () => {
    doc.setFillColor(...TABLE_HEAD);
    doc.rect(MARGIN_X, y, CONTENT_W, 7, 'F');
    doc.setDrawColor(...LINE);
    doc.rect(MARGIN_X, y, CONTENT_W, 7);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    setMuted();
    doc.text('SÉRIE', MARGIN_X + 2, y + 4.6);
    doc.text('REPETIÇÕES', MARGIN_X + colSerie + 2, y + 4.6);
    doc.text('CARGA', MARGIN_X + colSerie + colReps + 2, y + 4.6);
    doc.text('DESCANSO', MARGIN_X + colSerie + colReps + colCarga + 2, y + 4.6);
    y += 7;
  };

  const drawSeriesRow = (
    item: WorkoutPrintExercise['series'][number],
    stripe: boolean,
    continuacao: string
  ) => {
    ensureSpace(8, continuacao);
    if (stripe) {
      doc.setFillColor(252, 252, 253);
      doc.rect(MARGIN_X, y, CONTENT_W, 7, 'F');
    }
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN_X, y + 7, PAGE_W - MARGIN_X, y + 7);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setNavy();
    doc.text(String(item.order), MARGIN_X + 2, y + 4.8);
    doc.text(String(item.reps), MARGIN_X + colSerie + 2, y + 4.8);
    doc.text(item.loadLabel, MARGIN_X + colSerie + colReps + 2, y + 4.8);
    doc.text(formatPrintRestSec(item.restSec), MARGIN_X + colSerie + colReps + colCarga + 2, y + 4.8);
    y += 7;
  };

  const estimateExerciseHeight = (exercise: WorkoutPrintExercise) => {
    let h = 12;
    if (exercise.meta) h += 6;
    h += 7 + exercise.series.length * 7 + 2;
    if (exercise.trainerNote) {
      const lines = doc.splitTextToSize(exercise.trainerNote, CONTENT_W - 6);
      h += 8 + lines.length * 4.2 + 4;
    } else {
      h += 4;
    }
    return h;
  };

  const drawExercise = (exercise: WorkoutPrintExercise) => {
    const label = `${String(exercise.order).padStart(2, '0')}. ${exercise.name}`;
    const noteLines = exercise.trainerNote
      ? doc.splitTextToSize(exercise.trainerNote, CONTENT_W - 6)
      : [];
    const estimated = estimateExerciseHeight(exercise);
    const pageBody = CONTENT_BOTTOM - 20;
    if (estimated > spaceLeft() + 1 && estimated <= pageBody) {
      addPage();
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    setNavy();
    const titleLines = doc.splitTextToSize(label, CONTENT_W);
    doc.text(titleLines.slice(0, 2), MARGIN_X, y + 4);
    y += titleLines.slice(0, 2).length * 5 + 1;

    if (exercise.meta) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8.5);
      setMuted();
      doc.text(exercise.meta, MARGIN_X, y + 3);
      y += 6;
    }

    drawTableHeader();
    exercise.series.forEach((row, index) => {
      drawSeriesRow(row, index % 2 === 1, label);
    });
    y += 2;

    if (exercise.trainerNote && noteLines.length) {
      const noteH = 8 + noteLines.length * 4.2;
      ensureSpace(Math.min(noteH, 24), label);
      doc.setFillColor(...NOTE_BG);
      doc.roundedRect(MARGIN_X, y, CONTENT_W, noteH, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(27, 107, 74);
      doc.text('ORIENTAÇÃO DO PERSONAL', MARGIN_X + 3, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      setNavy();
      doc.text(noteLines, MARGIN_X + 3, y + 9);
      y += noteH + 4;
    } else {
      y += 4;
    }
  };

  const drawSummary = () => {
    ensureSpace(28);
    y += 2;
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN_X, y, CONTENT_W, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...WHITE);
    doc.text('RESUMO DO TREINO', MARGIN_X + 3, y + 5.5);
    y += 12;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    setNavy();
    doc.text(
      `${ctx.exerciseCount} exercício${ctx.exerciseCount === 1 ? '' : 's'}     ·     ${ctx.seriesCount} série${ctx.seriesCount === 1 ? '' : 's'}`,
      MARGIN_X + 1,
      y
    );
    y += 6;
    doc.setFontSize(9);
    setMuted();
    doc.text(`Treino: ${ctx.title}`, MARGIN_X + 1, y);
    y += 5;
    if (ctx.scheduledDateLabel) {
      doc.text(`Data programada: ${ctx.scheduledDateLabel}`, MARGIN_X + 1, y);
      y += 5;
    }
  };

  const drawFooters = () => {
    const total = doc.getNumberOfPages();
    for (let i = 1; i <= total; i++) {
      doc.setPage(i);
      doc.setDrawColor(...LINE);
      doc.setLineWidth(0.3);
      doc.line(MARGIN_X, PAGE_H - 15, PAGE_W - MARGIN_X, PAGE_H - 15);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      setMuted();
      doc.text('Plano de treino gerado pela Oftware', MARGIN_X, PAGE_H - 10);
      doc.text(`Página ${i} de ${total}`, PAGE_W / 2, PAGE_H - 10, { align: 'center' });
      doc.text(`Impresso em ${ctx.printedAt}  ·  ${horaEmissao}`, PAGE_W - MARGIN_X, PAGE_H - 10, {
        align: 'right',
      });
    }
  };

  drawFirstPageHeader();
  ctx.exercises.forEach((exercise) => drawExercise(exercise));
  drawSummary();
  drawFooters();
  return doc;
}

export async function downloadWorkoutPdfComoImpressao(ctx: WorkoutPrintData): Promise<void> {
  const logo = await loadLogoImage();
  const doc = buildWorkoutJsPdfDocument(ctx, { logo, horaEmissao: horaAgoraPt() });
  doc.save(workoutPrintFilename(ctx));
}

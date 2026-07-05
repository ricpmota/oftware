import type { RelatorioFinanceiroAplicacao } from '@/utils/relatorioFinanceiroAplicacoes';
import type { JsPDFDoc } from '@/utils/planoTerapeuticoPdfLayout';

const MARGEM_X = 20;
const MARGEM_DIREITA = 190;

function arredondarEixoMaxMg(max: number): number {
  if (max <= 0) return 10;
  const degraus = [2.5, 5, 7.5, 10, 12.5, 15, 20, 25, 30];
  for (const d of degraus) {
    if (max <= d) return d;
  }
  return Math.ceil(max / 5) * 5;
}

export function desenharGraficoAplicacoesRelatorioFinanceiro(
  doc: JsPDFDoc,
  yStart: number,
  aplicacoes: RelatorioFinanceiroAplicacao[],
  darkColor: [number, number, number]
): number {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkColor);
  doc.text('APLICAÇÕES DO TRATAMENTO', MARGEM_X, yStart);

  if (!aplicacoes.length) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(120, 120, 120);
    doc.text('Nenhuma aplicação registrada no plano terapêutico.', MARGEM_X, yStart + 6);
    doc.setTextColor(...darkColor);
    return yStart + 14;
  }

  let yPos = yStart + 6;
  const totalAplicadas = aplicacoes.filter((a) => a.aplicada).reduce((s, a) => s + a.doseMg, 0);
  const totalAbertas = aplicacoes.filter((a) => !a.aplicada).reduce((s, a) => s + a.doseMg, 0);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `${aplicacoes.filter((a) => a.aplicada).length} aplicada(s) · ${totalAplicadas.toFixed(1)} mg  |  ${aplicacoes.filter((a) => !a.aplicada).length} em aberto · ${totalAbertas.toFixed(1)} mg`,
    MARGEM_X,
    yPos
  );
  yPos += 8;

  const chartLeft = MARGEM_X + 10;
  const chartRight = MARGEM_DIREITA - 2;
  const chartTop = yPos + 2;
  const chartBottom = chartTop + 46;
  const chartH = chartBottom - chartTop;
  const chartW = chartRight - chartLeft;

  const maxDose = Math.max(...aplicacoes.map((a) => a.doseMg), 2.5);
  const yMax = arredondarEixoMaxMg(maxDose);

  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.2);
  const ticks = [0, yMax * 0.25, yMax * 0.5, yMax * 0.75, yMax];
  for (const tick of ticks) {
    const yTick = chartBottom - (tick / yMax) * chartH;
    doc.line(chartLeft, yTick, chartRight, yTick);
    if (tick > 0) {
      doc.setFontSize(6);
      doc.setTextColor(130, 130, 130);
      doc.text(`${tick % 1 === 0 ? tick.toFixed(0) : tick.toFixed(1)}`, chartLeft - 2, yTick + 1, {
        align: 'right',
      });
    }
  }

  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.35);
  doc.line(chartLeft, chartTop, chartLeft, chartBottom);
  doc.line(chartLeft, chartBottom, chartRight, chartBottom);

  const n = aplicacoes.length;
  const barGap = n > 24 ? 0.4 : n > 16 ? 0.6 : 1;
  const barW = Math.max(1.8, Math.min(7, (chartW - barGap * (n + 1)) / n));

  aplicacoes.forEach((app, i) => {
    const x = chartLeft + barGap + i * (barW + barGap);
    const h = Math.max(0.8, (app.doseMg / yMax) * chartH);
    const yBar = chartBottom - h;

    if (app.aplicada) {
      doc.setFillColor(16, 185, 129);
      doc.setDrawColor(5, 150, 105);
    } else {
      doc.setFillColor(253, 230, 138);
      doc.setDrawColor(217, 119, 6);
    }
    doc.rect(x, yBar, barW, h, 'FD');

    const labelEvery = n > 20 ? 4 : n > 12 ? 2 : 1;
    if (i % labelEvery === 0 || i === n - 1) {
      doc.setFontSize(5.5);
      doc.setTextColor(90, 90, 90);
      doc.text(`S${app.semana}`, x + barW / 2, chartBottom + 3.5, { align: 'center' });
    }
  });

  doc.setTextColor(...darkColor);
  yPos = chartBottom + 10;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setFillColor(16, 185, 129);
  doc.rect(MARGEM_X, yPos - 2.5, 3, 3, 'F');
  doc.text('Aplicadas', MARGEM_X + 5, yPos);
  doc.setFillColor(253, 230, 138);
  doc.setDrawColor(217, 119, 6);
  doc.rect(MARGEM_X + 28, yPos - 2.5, 3, 3, 'FD');
  doc.text('Em aberto', MARGEM_X + 33, yPos);
  doc.setDrawColor(...darkColor);

  return yPos + 6;
}

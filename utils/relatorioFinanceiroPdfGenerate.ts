import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import { addMedicoPdfLogoToDocument } from '@/utils/pdfMedicoLogo';
import { desenharNumeracaoPaginasPlanoTerapeuticoPdf, type JsPDFDoc } from '@/utils/planoTerapeuticoPdfLayout';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import type { RelatorioFinanceiroAplicacao } from '@/utils/relatorioFinanceiroAplicacoes';
import { desenharGraficoAplicacoesRelatorioFinanceiro } from '@/utils/relatorioFinanceiroAplicacoesChartPdf';

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

function fmtData(d: Date | null | undefined): string {
  if (!d || isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('pt-BR');
}

function statusParcelaLabel(status: RelatorioFinanceiroParcela['status']): string {
  if (status === 'paga') return 'Paga';
  if (status === 'atrasada') return 'Atrasada';
  return 'Pendente';
}

export type RelatorioFinanceiroParcela = {
  numero: number;
  valor: number;
  status: 'pendente' | 'paga' | 'atrasada';
  dataPagamento?: Date | null;
  dataVencimento?: Date | null;
};

export type RelatorioFinanceiroVenda = {
  label: string;
  data: Date;
  valorTotal: number;
  valorPago: number;
  valorPendente: number;
  parcelas: RelatorioFinanceiroParcela[];
};

export type RelatorioFinanceiroPdfContext = {
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteDataNascimento?: string;
  pacienteSexo?: string;
};

export type RelatorioFinanceiroPdfBuildInput = {
  vendas: RelatorioFinanceiroVenda[];
  medico: Medico | null;
  ctx: RelatorioFinanceiroPdfContext;
  observacoes?: string;
  totaisGerais: { valorTotal: number; valorPago: number; valorPendente: number };
  aplicacoes?: RelatorioFinanceiroAplicacao[];
  dataDocumento?: Date;
};

const Y_LIMITE = 278;
const MARGEM_X = 20;
const MARGEM_DIREITA = 190;
const LARGURA_TABELA = MARGEM_DIREITA - MARGEM_X;

async function desenharCabecalhoPagina(
  doc: JsPDFDoc,
  medico: Medico | null,
  darkColor: [number, number, number]
): Promise<void> {
  const medicoNomeCompleto = medicoTituloNome(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;

  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNomeCompleto, MARGEM_X, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(crmText, MARGEM_X, 22);

  await addMedicoPdfLogoToDocument(doc, medico);
}

function desenharTituloDocumento(doc: JsPDFDoc, darkColor: [number, number, number]): void {
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('RELATÓRIO FINANCEIRO', 105, 32, { align: 'center' });

  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.5);
  doc.line(MARGEM_X, 40, MARGEM_DIREITA, 40);
}

function desenharDadosPacienteMedico(
  doc: JsPDFDoc,
  medico: Medico | null,
  ctx: RelatorioFinanceiroPdfContext,
  darkColor: [number, number, number]
): number {
  const medicoNomeCompleto = medicoTituloNome(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;
  const colunaEsquerda = MARGEM_X;
  const colunaDireita = 115;

  let yPos = 52;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO PACIENTE', colunaEsquerda, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${ctx.pacienteNome}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`CPF: ${ctx.pacienteCpf || 'N/A'}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`Data Nasc.: ${ctx.pacienteDataNascimento || 'N/A'}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`Sexo: ${ctx.pacienteSexo || 'N/A'}`, colunaEsquerda, yPos);

  let yPosMedico = 52;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('DADOS DO MÉDICO', colunaDireita, yPosMedico);
  yPosMedico += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`Nome: ${medicoNomeCompleto}`, colunaDireita, yPosMedico);
  yPosMedico += 6;
  doc.text(crmText, colunaDireita, yPosMedico);
  yPosMedico += 6;

  if (medico?.localizacao?.endereco) {
    const endereco =
      medico.localizacao.endereco.length > 40
        ? `${medico.localizacao.endereco.substring(0, 37)}...`
        : medico.localizacao.endereco;
    doc.text(`Endereço: ${endereco}`, colunaDireita, yPosMedico);
    yPosMedico += 6;
  }
  if (medico?.telefone) {
    doc.text(`Telefone: ${medico.telefone}`, colunaDireita, yPosMedico);
  }

  return Math.max(yPos, yPosMedico) + 10;
}

async function garantirEspaco(
  doc: JsPDFDoc,
  y: number,
  necessario: number,
  medico: Medico | null,
  darkColor: [number, number, number]
): Promise<number> {
  if (y + necessario <= Y_LIMITE) return y;
  doc.addPage();
  await desenharCabecalhoPagina(doc, medico, darkColor);
  return 35;
}

function desenharLinhaTabelaVenda(
  doc: JsPDFDoc,
  y: number,
  cols: [string, string, string, string, string],
  bold = false
): number {
  doc.setFont('helvetica', bold ? 'bold' : 'normal');
  doc.setFontSize(7.5);
  doc.text(cols[0], MARGEM_X + 2, y);
  doc.text(cols[1], 36, y);
  doc.text(cols[2], 62, y);
  doc.text(cols[3], 92, y);
  doc.text(cols[4], 138, y);
  return y + 4.5;
}

function desenharTabelaVendaCompacta(doc: JsPDFDoc, y: number, venda: RelatorioFinanceiroVenda): number {
  doc.setFillColor(241, 245, 249);
  doc.rect(MARGEM_X, y - 3.5, LARGURA_TABELA, 6.5, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.2);
  doc.rect(MARGEM_X, y - 3.5, LARGURA_TABELA, 6.5);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`${venda.label} · ${fmtData(venda.data)}`, MARGEM_X + 2, y);
  doc.setFont('helvetica', 'normal');
  const resumo = `T ${formatarMoedaBRL(venda.valorTotal)}  |  P ${formatarMoedaBRL(venda.valorPago)}  |  Pend ${formatarMoedaBRL(venda.valorPendente)}`;
  doc.text(resumo, MARGEM_DIREITA - 2, y, { align: 'right' });
  y += 5;

  doc.setFillColor(248, 250, 252);
  doc.rect(MARGEM_X, y - 3, LARGURA_TABELA, 5, 'F');
  y = desenharLinhaTabelaVenda(doc, y, ['Parc.', 'Valor', 'Status', 'Pagamento', 'Vencimento'], true);

  if (venda.parcelas.length === 0) {
    y = desenharLinhaTabelaVenda(doc, y, ['—', '—', '—', '—', '—']);
  } else {
    for (const parcela of venda.parcelas) {
      const dataPag =
        parcela.status === 'paga'
          ? fmtData(parcela.dataPagamento ?? parcela.dataVencimento)
          : '—';
      const dataVenc =
        parcela.status === 'pendente' || parcela.status === 'atrasada'
          ? fmtData(parcela.dataVencimento)
          : '—';
      y = desenharLinhaTabelaVenda(doc, y, [
        String(parcela.numero),
        formatarMoedaBRL(parcela.valor),
        statusParcelaLabel(parcela.status),
        dataPag,
        dataVenc,
      ]);
    }
  }

  doc.setDrawColor(226, 232, 240);
  doc.line(MARGEM_X, y, MARGEM_DIREITA, y);
  return y + 4;
}

function desenharResumoGeralCompacto(
  doc: JsPDFDoc,
  y: number,
  totais: { valorTotal: number; valorPago: number; valorPendente: number }
): number {
  doc.setFillColor(30, 41, 59);
  doc.rect(MARGEM_X, y - 3.5, LARGURA_TABELA, 6.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('RESUMO GERAL', MARGEM_X + 2, y);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Total ${formatarMoedaBRL(totais.valorTotal)}  |  Pago ${formatarMoedaBRL(totais.valorPago)}  |  Pendente ${formatarMoedaBRL(totais.valorPendente)}`,
    MARGEM_DIREITA - 2,
    y,
    { align: 'right' }
  );
  doc.setTextColor(44, 62, 80);
  return y + 8;
}

export async function buildRelatorioFinanceiroJsPdfDocument(
  input: RelatorioFinanceiroPdfBuildInput
): Promise<JsPDFDoc> {
  const { vendas, medico, ctx, observacoes, totaisGerais, aplicacoes = [] } = input;
  const darkColor: [number, number, number] = [44, 62, 80];
  const dataDoc = input.dataDocumento ?? new Date();

  const doc = new jsPDF();
  await desenharCabecalhoPagina(doc, medico, darkColor);
  desenharTituloDocumento(doc, darkColor);
  let yPos = desenharDadosPacienteMedico(doc, medico, ctx, darkColor);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(100, 100, 100);
  doc.text(`Gerado em ${dataDoc.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`, MARGEM_X, yPos);
  yPos += 8;
  doc.setTextColor(...darkColor);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('VENDAS E PARCELAS', MARGEM_X, yPos);
  yPos += 6;

  for (const venda of vendas) {
    const alturaEstimada = 14 + Math.max(1, venda.parcelas.length) * 4.5;
    yPos = await garantirEspaco(doc, yPos, alturaEstimada, medico, darkColor);
    yPos = desenharTabelaVendaCompacta(doc, yPos, venda);
  }

  yPos = await garantirEspaco(doc, yPos, 12, medico, darkColor);
  yPos = desenharResumoGeralCompacto(doc, yPos, totaisGerais);

  if (observacoes?.trim()) {
    yPos += 2;
    yPos = await garantirEspaco(doc, yPos, 16, medico, darkColor);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('Observações', MARGEM_X, yPos);
    yPos += 5;
    doc.setFont('helvetica', 'normal');
    const linhas = doc.splitTextToSize(observacoes.trim(), LARGURA_TABELA);
    for (const linha of linhas) {
      yPos = await garantirEspaco(doc, yPos, 5, medico, darkColor);
      doc.text(linha, MARGEM_X, yPos);
      yPos += 4.5;
    }
  }

  yPos += 4;
  yPos = await garantirEspaco(doc, yPos, 72, medico, darkColor);
  yPos = desenharGraficoAplicacoesRelatorioFinanceiro(doc, yPos, aplicacoes, darkColor);

  desenharNumeracaoPaginasPlanoTerapeuticoPdf(doc);
  return doc;
}

export function saveRelatorioFinanceiroPdf(doc: JsPDFDoc, pacienteNome: string): void {
  const safeNome = pacienteNome.replace(/\s+/g, '_');
  const dataArquivo = new Date().toISOString().split('T')[0];
  doc.save(`Relatorio_Financeiro_${safeNome}_${dataArquivo}.pdf`);
}

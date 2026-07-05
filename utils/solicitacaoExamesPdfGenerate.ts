import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import {
  PDF_REQ_EXAMES_Y_ASSINATURA,
  desenharHipoteseDiagnosticaSolicitacaoPdf,
  desenharListaExamesSolicitacaoPdf,
  desenharNumeracaoPaginasSolicitacaoExamesPdf,
  desenharRodapeManualSolicitacaoExamesPdf,
  estimarAlturaQuadroHipotesePdf,
  type JsPDFDoc,
} from '@/utils/solicitacaoExamesPdfLayout';
import { addMedicoPdfLogoToDocument } from '@/utils/pdfMedicoLogo';
import type { SolicitacaoExamesPdfContext } from '@/utils/solicitacaoExamesPdfDownload';

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

export type SolicitacaoExamesPdfBuildInput = {
  exames: string[];
  hipoteseDiagnostica: string;
  medico: Medico | null;
  ctx: SolicitacaoExamesPdfContext;
  /** Data exibida no rodapé manual; padrão = hoje. */
  dataSolicitacao?: Date;
};

export type SolicitacaoExamesPdfBuildOptions = {
  /** Omitir linha/local/data de assinatura manual (PDF enviado à assinatura digital BRy). */
  omitManualSignatureBlock?: boolean;
};

export async function buildSolicitacaoExamesJsPdfDocument(
  input: SolicitacaoExamesPdfBuildInput,
  options?: SolicitacaoExamesPdfBuildOptions
): Promise<JsPDFDoc> {
  const omitManual = options?.omitManualSignatureBlock === true;
  const { exames, hipoteseDiagnostica, medico, ctx } = input;
  const darkColor: [number, number, number] = [44, 62, 80];
  const medicoNomeCompleto = medicoTituloNome(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;
  const dataExibicao =
    input.dataSolicitacao instanceof Date
      ? input.dataSolicitacao.toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');

  const yLimiteConteudo = omitManual ? 278 : PDF_REQ_EXAMES_Y_ASSINATURA - 2;

  const doc = new jsPDF();
  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNomeCompleto, 20, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(crmText, 20, 22);

  await addMedicoPdfLogoToDocument(doc, medico);

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('REQUISIÇÃO DE EXAMES', 105, 32, { align: 'center' });

  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);

  let yPos = 52;
  const colunaEsquerda = 20;
  const colunaDireita = 115;

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
  if (medico?.localizacao?.cep) {
    doc.text(`CEP: ${medico.localizacao.cep}`, colunaDireita, yPosMedico);
    yPosMedico += 6;
  }
  if (medico?.telefone) {
    doc.text(`Telefone: ${medico.telefone}`, colunaDireita, yPosMedico);
  }

  yPos = Math.max(yPos, yPosMedico) + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('EXAMES SOLICITADOS', 20, yPos);
  yPos += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const temHipotesePdf = hipoteseDiagnostica.trim().length > 0;
  const gapEntreExamesEHD = temHipotesePdf ? 5 : 0;
  const alturaHDReservada = temHipotesePdf ? estimarAlturaQuadroHipotesePdf(doc, hipoteseDiagnostica) : 0;
  const yMaxFimBlocoExames = Math.max(
    yPos + 4,
    yLimiteConteudo - gapEntreExamesEHD - alturaHDReservada - (temHipotesePdf ? 0 : 2)
  );

  if (exames.length === 0) {
    doc.text('Nenhum exame selecionado', 25, yPos);
    yPos += 5;
  } else {
    yPos = desenharListaExamesSolicitacaoPdf(doc, yPos, exames, yMaxFimBlocoExames);
  }

  if (temHipotesePdf) {
    yPos += gapEntreExamesEHD;
    desenharHipoteseDiagnosticaSolicitacaoPdf(
      doc,
      yPos,
      hipoteseDiagnostica,
      darkColor,
      yLimiteConteudo
    );
  }

  const local = medico?.localizacao?.endereco
    ? `${medico.localizacao.endereco}${medico.localizacao.cep ? ` - CEP: ${medico.localizacao.cep}` : ''}`
    : 'Local não informado';

  if (omitManual) {
    desenharNumeracaoPaginasSolicitacaoExamesPdf(doc);
  } else {
    desenharRodapeManualSolicitacaoExamesPdf(doc, darkColor, local, dataExibicao);
  }

  return doc;
}

export function saveSolicitacaoExamesPdf(doc: JsPDFDoc, pacienteNome: string): void {
  const safeNome = pacienteNome.replace(/\s+/g, '_');
  const dataArquivo = new Date().toISOString().split('T')[0];
  doc.save(`Requisicao_Exames_${safeNome}_${dataArquivo}.pdf`);
}

export function openSolicitacaoExamesPdfUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

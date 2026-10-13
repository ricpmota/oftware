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
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import { prescriptionPdfDateLocale } from '@/lib/prescricao/prescriptionPrintLabels';

function medicoTituloNome(m: Medico | null, language: PrescriptionPrintLanguage): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  const fallback = language === 'en' ? 'Physician' : 'Médico';
  return `${titulo} ${m?.nome || fallback}`;
}

function sexoExibicao(sexo: string | undefined, language: PrescriptionPrintLanguage): string {
  const valor = (sexo || '').trim();
  if (language !== 'en') return valor || 'N/A';
  if (valor === 'Masculino') return 'Male';
  if (valor === 'Feminino') return 'Female';
  if (valor === 'N/A' || !valor) return 'N/A';
  return valor;
}

const LABELS = {
  pt: {
    title: 'REQUISIÇÃO DE EXAMES',
    patientSection: 'DADOS DO PACIENTE',
    name: 'Nome',
    birth: 'Data Nasc.',
    sex: 'Sexo',
    doctorSection: 'DADOS DO MÉDICO',
    address: 'Endereço',
    phone: 'Telefone',
    examsSection: 'EXAMES SOLICITADOS',
    noExams: 'Nenhum exame selecionado',
    hypothesis: 'Hipótese Diagnóstica',
    signature: 'Assinatura do Médico',
    location: 'Local',
    date: 'Data',
    locationMissing: 'Local não informado',
    filePrefix: 'Requisicao_Exames',
    page: (current: number, total: number) => `Página ${current} de ${total}`,
  },
  en: {
    title: 'LABORATORY TEST REQUEST',
    patientSection: 'PATIENT INFORMATION',
    name: 'Name',
    birth: 'Date of birth',
    sex: 'Sex',
    doctorSection: 'PHYSICIAN INFORMATION',
    address: 'Address',
    phone: 'Phone',
    examsSection: 'REQUESTED TESTS',
    noExams: 'No tests selected',
    hypothesis: 'Diagnostic hypothesis',
    signature: "Physician's signature",
    location: 'Location',
    date: 'Date',
    locationMissing: 'Location not provided',
    filePrefix: 'Exam_Request',
    page: (current: number, total: number) => `Page ${current} of ${total}`,
  },
} as const;

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
  language?: PrescriptionPrintLanguage;
};

export async function buildSolicitacaoExamesJsPdfDocument(
  input: SolicitacaoExamesPdfBuildInput,
  options?: SolicitacaoExamesPdfBuildOptions
): Promise<JsPDFDoc> {
  const omitManual = options?.omitManualSignatureBlock === true;
  const language: PrescriptionPrintLanguage = options?.language === 'en' ? 'en' : 'pt';
  const labels = LABELS[language];
  const { exames, hipoteseDiagnostica, medico, ctx } = input;
  const darkColor: [number, number, number] = [44, 62, 80];
  const medicoNomeCompleto = medicoTituloNome(medico, language);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;
  const dataLocale = prescriptionPdfDateLocale(language);
  const dataExibicao =
    input.dataSolicitacao instanceof Date
      ? input.dataSolicitacao.toLocaleDateString(dataLocale)
      : new Date().toLocaleDateString(dataLocale);

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
  doc.text(labels.title, 105, 32, { align: 'center' });

  doc.setDrawColor(...darkColor);
  doc.setLineWidth(0.5);
  doc.line(20, 40, 190, 40);

  let yPos = 52;
  const colunaEsquerda = 20;
  const colunaDireita = 115;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.patientSection, colunaEsquerda, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${labels.name}: ${ctx.pacienteNome}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`CPF: ${ctx.pacienteCpf || 'N/A'}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`${labels.birth}: ${ctx.pacienteDataNascimento || 'N/A'}`, colunaEsquerda, yPos);
  yPos += 6;
  doc.text(`${labels.sex}: ${sexoExibicao(ctx.pacienteSexo, language)}`, colunaEsquerda, yPos);

  let yPosMedico = 52;
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.doctorSection, colunaDireita, yPosMedico);
  yPosMedico += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`${labels.name}: ${medicoNomeCompleto}`, colunaDireita, yPosMedico);
  yPosMedico += 6;
  doc.text(crmText, colunaDireita, yPosMedico);
  yPosMedico += 6;

  if (medico?.localizacao?.endereco) {
    const endereco =
      medico.localizacao.endereco.length > 40
        ? `${medico.localizacao.endereco.substring(0, 37)}...`
        : medico.localizacao.endereco;
    doc.text(`${labels.address}: ${endereco}`, colunaDireita, yPosMedico);
    yPosMedico += 6;
  }
  if (medico?.localizacao?.cep) {
    doc.text(`CEP: ${medico.localizacao.cep}`, colunaDireita, yPosMedico);
    yPosMedico += 6;
  }
  if (medico?.telefone) {
    doc.text(`${labels.phone}: ${medico.telefone}`, colunaDireita, yPosMedico);
  }

  yPos = Math.max(yPos, yPosMedico) + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(labels.examsSection, 20, yPos);
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
    doc.text(labels.noExams, 25, yPos);
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
      yLimiteConteudo,
      labels.hypothesis
    );
  }

  const local = medico?.localizacao?.endereco
    ? `${medico.localizacao.endereco}${medico.localizacao.cep ? ` - CEP: ${medico.localizacao.cep}` : ''}`
    : labels.locationMissing;

  if (omitManual) {
    desenharNumeracaoPaginasSolicitacaoExamesPdf(doc, labels.page);
  } else {
    desenharRodapeManualSolicitacaoExamesPdf(doc, darkColor, local, dataExibicao, labels);
  }

  return doc;
}

export function saveSolicitacaoExamesPdf(
  doc: JsPDFDoc,
  pacienteNome: string,
  language: PrescriptionPrintLanguage = 'pt'
): void {
  const safeNome = pacienteNome.replace(/\s+/g, '_');
  const dataArquivo = new Date().toISOString().split('T')[0];
  const prefix = LABELS[language === 'en' ? 'en' : 'pt'].filePrefix;
  doc.save(`${prefix}_${safeNome}_${dataArquivo}.pdf`);
}

export function openSolicitacaoExamesPdfUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

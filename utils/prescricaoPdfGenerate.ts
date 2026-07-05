import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescricaoPdfPacienteContext } from '@/utils/prescricaoPdfDownload';
import { itensTemConteudoUtil } from '@/lib/prescricao/prescricaoConteudoUnificado';

import type { JsPDFDoc } from '@/utils/pdfMedicoLogo';
import { addMedicoPdfLogoToDocument } from '@/utils/pdfMedicoLogo';

type JsPDFDocLocal = InstanceType<typeof jsPDF>;

function isDataReciboISOValid(iso: string): boolean {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) return false;
  const [y, m, d] = iso.trim().split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

function formatDataReciboISOToPtBr(iso: string): string {
  if (!isDataReciboISOValid(iso)) return '';
  const [Ty, Tm, Td] = iso.trim().split('-').map(Number);
  return new Date(Ty, Tm - 1, Td).toLocaleDateString('pt-BR');
}

async function addLogoToPdf(doc: JsPDFDocLocal, medico: Medico | null): Promise<void> {
  await addMedicoPdfLogoToDocument(doc as JsPDFDoc, medico);
}

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

export type PrescricaoPdfBuildOptions = {
  /** Omitir linha/data "Assinatura do Médico" (PDF enviado à assinatura digital BRy). */
  omitManualSignatureBlock?: boolean;
};

/** Gera o jsPDF (prescrição ou recibo) sem salvar. */
export async function buildPrescricaoJsPdfDocument(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: PrescricaoPdfPacienteContext,
  options?: PrescricaoPdfBuildOptions
): Promise<JsPDFDoc> {
  const omitSignature = options?.omitManualSignatureBlock === true;
  const darkColor: [number, number, number] = [44, 62, 80];
  const medicoNomeCompleto = medicoTituloNome(medico);
  const crmEstado = medico?.crm?.estado || 'XX';
  const crmNumero = medico?.crm?.numero || '00000';

  if (prescricao.tipoDocumento === 'recibo_medico') {
    const valorNum =
      prescricao.valorConsulta != null && !Number.isNaN(Number(prescricao.valorConsulta))
        ? Number(prescricao.valorConsulta)
        : null;
    if (valorNum === null) {
      throw new Error('Valor do recibo inválido.');
    }
    const dataIsoPrint = (prescricao.dataRecibo || '').trim();
    if (!isDataReciboISOValid(dataIsoPrint)) {
      throw new Error('Data do recibo inválida.');
    }
    const dataReciboExibicao = formatDataReciboISOToPtBr(dataIsoPrint);

    const docRec = new jsPDF();
    docRec.setTextColor(...darkColor);
    docRec.setFontSize(18);
    docRec.setFont('helvetica', 'bold');
    docRec.text(medicoNomeCompleto, 20, 15);
    docRec.setFontSize(9);
    docRec.setFont('helvetica', 'normal');
    docRec.text(`CRM-${crmEstado} ${crmNumero}`, 20, 22);
    if (medico?.email) {
      docRec.text(`E-mail: ${medico.email}`, 20, 27);
    }
    await addLogoToPdf(docRec, medico);
    const yHeaderEnd = medico?.email ? 32 : 28;
    docRec.setDrawColor(200, 200, 200);
    docRec.line(20, yHeaderEnd, 190, yHeaderEnd);
    let yPos = yHeaderEnd + 12;
    docRec.setFontSize(16);
    docRec.setFont('helvetica', 'bold');
    docRec.setTextColor(13, 148, 136);
    docRec.text('RECIBO DE PAGAMENTO', 20, yPos);
    docRec.setTextColor(...darkColor);
    yPos += 12;
    docRec.setFontSize(10);
    docRec.setFont('helvetica', 'bold');
    docRec.text('Dados do paciente', 20, yPos);
    yPos += 6;
    docRec.setFont('helvetica', 'normal');
    docRec.text(`Nome: ${ctx.pacienteNome}`, 20, yPos);
    yPos += 6;
    if (ctx.pacienteCpf) {
      docRec.text(`CPF: ${ctx.pacienteCpf}`, 20, yPos);
      yPos += 6;
    }
    yPos += 6;
    docRec.setFont('helvetica', 'bold');
    docRec.text('Profissional', 20, yPos);
    yPos += 6;
    docRec.setFont('helvetica', 'normal');
    docRec.text(medicoNomeCompleto, 20, yPos);
    yPos += 5;
    docRec.text(`CRM-${crmEstado} ${crmNumero}`, 20, yPos);
    const docProfRec = prescricao.reciboDocumentoProfissional || 'omitir';
    if (docProfRec === 'cpf' && medico?.cpfPessoal?.trim()) {
      yPos += 5;
      docRec.text(`CPF: ${medico.cpfPessoal.trim()}`, 20, yPos);
    } else if (docProfRec === 'cnpj' && medico?.cnpjEmpresa?.trim()) {
      yPos += 5;
      docRec.text(`CNPJ: ${medico.cnpjEmpresa.trim()}`, 20, yPos);
    }
    yPos += 10;
    docRec.setFontSize(12);
    docRec.setFont('helvetica', 'bold');
    docRec.text(prescricao.nome || 'Recibo', 20, yPos);
    yPos += 8;
    docRec.setFontSize(10);
    docRec.setFont('helvetica', 'bold');
    docRec.text('Descrição da consulta', 20, yPos);
    yPos += 6;
    docRec.setFont('helvetica', 'normal');
    const descTxt = prescricao.descricao || '—';
    const descLines = docRec.splitTextToSize(descTxt, 170);
    docRec.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 8;
    docRec.setFontSize(12);
    docRec.setFont('helvetica', 'bold');
    docRec.text(`Valor: ${valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`, 20, yPos);
    yPos += 10;
    if (prescricao.observacoes?.trim()) {
      docRec.setFontSize(10);
      docRec.setFont('helvetica', 'bold');
      docRec.text('Observações', 20, yPos);
      yPos += 6;
      docRec.setFont('helvetica', 'normal');
      const obsL = docRec.splitTextToSize(prescricao.observacoes, 170);
      docRec.text(obsL, 20, yPos);
      yPos += obsL.length * 5;
    }
    if (yPos > 250) {
      docRec.addPage();
      yPos = 20;
    }
    if (!omitSignature) {
      yPos += 10;
      docRec.setFontSize(9);
      docRec.setFont('helvetica', 'normal');
      docRec.text(`Data: ${dataReciboExibicao}`, 20, yPos);
      yPos += 15;
      docRec.line(20, yPos, 100, yPos);
      docRec.setFontSize(8);
      docRec.text('Assinatura do Médico', 20, yPos + 5);
    }
    return docRec;
  }

  const prescricaoParaImprimir = { ...prescricao, pesoPaciente: prescricao.pesoPaciente };
  const doc = new jsPDF();
  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNomeCompleto, 20, 15);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(`CRM-${crmEstado} ${crmNumero}`, 20, 22);
  await addLogoToPdf(doc, medico);
  doc.setDrawColor(200, 200, 200);
  doc.line(20, 28, 190, 28);

  let yPos = 40;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESCRIÇÃO MÉDICA', 20, yPos);
  yPos += 10;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Paciente: ${ctx.pacienteNome}`, 20, yPos);
  yPos += 6;
  if (ctx.pacienteCpf) {
    doc.text(`CPF: ${ctx.pacienteCpf}`, 20, yPos);
    yPos += 6;
  }
  if (prescricaoParaImprimir.pesoPaciente != null) {
    doc.text(`Peso: ${Number(prescricaoParaImprimir.pesoPaciente).toFixed(1)} kg`, 20, yPos);
    yPos += 6;
  }
  yPos += 5;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(prescricaoParaImprimir.nome, 20, yPos);
  yPos += 8;
  if (prescricaoParaImprimir.descricao) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const descLines = doc.splitTextToSize(prescricaoParaImprimir.descricao, 170);
    doc.text(descLines, 20, yPos);
    yPos += descLines.length * 5 + 5;
  }
  if (itensTemConteudoUtil(prescricaoParaImprimir.itens)) {
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('MEDICAMENTOS/SUPLEMENTOS:', 20, yPos);
  yPos += 8;
  prescricaoParaImprimir.itens.forEach((item, index) => {
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(`${index + 1}. ${item.medicamento}`, 25, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    doc.text(`   Dosagem: ${item.dosagem}`, 25, yPos);
    yPos += 5;
    doc.text(`   Frequência: ${item.frequencia}`, 25, yPos);
    yPos += 5;
    const instrucoesLines = doc.splitTextToSize(`   ${item.instrucoes}`, 165);
    doc.text(instrucoesLines, 25, yPos);
    yPos += instrucoesLines.length * 5 + 3;
    if (item.quantidade) {
      doc.text(`   Quantidade: ${item.quantidade}`, 25, yPos);
      yPos += 5;
    }
    yPos += 3;
  });
  }
  if (prescricaoParaImprimir.observacoes) {
    if (yPos > 250) {
      doc.addPage();
      yPos = 20;
    }
    yPos += 5;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('OBSERVAÇÕES:', 20, yPos);
    yPos += 6;
    doc.setFont('helvetica', 'normal');
    const obsLines = doc.splitTextToSize(prescricaoParaImprimir.observacoes, 170);
    doc.text(obsLines, 20, yPos);
    yPos += obsLines.length * 5;
  }
  if (yPos > 250) {
    doc.addPage();
    yPos = 20;
  }
  if (!omitSignature) {
    yPos += 10;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    doc.text(`Data: ${dataAtual}`, 20, yPos);
    yPos += 15;
    doc.line(20, yPos, 100, yPos);
    doc.setFontSize(8);
    doc.text('Assinatura do Médico', 20, yPos + 5);
  }
  return doc;
}

export async function buildPrescricaoPdfBuffer(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: PrescricaoPdfPacienteContext
): Promise<Buffer> {
  const doc = await buildPrescricaoJsPdfDocument(prescricao, medico, ctx);
  const ab = doc.output('arraybuffer') as ArrayBuffer;
  return Buffer.from(ab);
}

export function openPrescricaoPdfUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

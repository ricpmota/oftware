import jsPDF from 'jspdf';
import type { Medico } from '@/types/medico';
import type { EscolhaPlanoPaciente } from '@/types/planoTerapeuticoInterativo';
import type { OrganizationBrandingStored } from '@/lib/organization/organizationBrandingTypes';
import { addMedicoPdfLogoToDocument } from '@/utils/pdfMedicoLogo';
import { loadImageForJsPdf } from '@/utils/loadImageForJsPdf';
import {
  desenharNumeracaoPaginasPlanoTerapeuticoPdf,
  PDF_PLANO_Y_ASSINATURA,
  type JsPDFDoc,
} from '@/utils/planoTerapeuticoPdfLayout';
import { desenharPaginaAssinaturasReservadaPlanoTerapeutico } from '@/utils/planoTerapeuticoSignaturePageDraw';
import { formatarMoedaBRL } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { formatarMetaKg, formatarPrazoMeses } from '@/lib/planoTerapeutico/planoTerapeuticoPlanoUi';
import { RITMOS_ESCALONAMENTO } from '@/lib/planoTerapeutico/modalidadesPlano';

function medicoTituloNome(m: Medico | null): string {
  const titulo = m?.genero === 'F' ? 'Dra.' : 'Dr.';
  return `${titulo} ${m?.nome || 'Médico'}`;
}

async function drawLogoOrganizacaoTopo(doc: JsPDFDoc, logoUrl: string): Promise<boolean> {
  const loaded = await loadImageForJsPdf(logoUrl);
  if (!loaded) return false;
  try {
    const maxW = 52;
    const maxH = 22;
    const ratio = loaded.height / loaded.width;
    let w = maxW;
    let h = w * ratio;
    if (h > maxH) {
      h = maxH;
      w = h / ratio;
    }
    doc.addImage(loaded.dataUrl, loaded.format, 190 - w - 10, 7, w, h);
    return true;
  } catch {
    return false;
  }
}

export type PlanoTerapeuticoPdfContext = {
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteDataNascimento?: string;
  pacienteSexo?: string;
  metaDescricao?: string;
};

export type PlanoTerapeuticoPdfResumo = {
  prazoMeses: number;
  perdaSemanalMinKg: number;
  perdaSemanalMaxKg: number;
  doseTotalMg: number;
  aplicacoes: number;
  consultas: number;
};

export type PlanoTerapeuticoPdfBuildInput = {
  escolha: EscolhaPlanoPaciente;
  resumo: PlanoTerapeuticoPdfResumo;
  medico: Medico | null;
  ctx: PlanoTerapeuticoPdfContext;
  dataDocumento?: Date;
  pacienteAceitoEm?: Date;
  organizationBranding?: OrganizationBrandingStored | null;
};

export type PlanoTerapeuticoPdfBuildOptions = {
  omitManualSignatureBlock?: boolean;
};

function linhaResumoPlano(
  doc: JsPDFDoc,
  y: number,
  rotulo: string,
  valor: string
): number {
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(rotulo, 25, y);
  doc.setFont('helvetica', 'bold');
  doc.text(valor, 190, y, { align: 'right' });
  return y + 6;
}

export async function buildPlanoTerapeuticoJsPdfDocument(
  input: PlanoTerapeuticoPdfBuildInput,
  options?: PlanoTerapeuticoPdfBuildOptions
): Promise<JsPDFDoc> {
  const omitManual = options?.omitManualSignatureBlock === true;
  const { escolha, resumo, medico, ctx } = input;
  const darkColor: [number, number, number] = [44, 62, 80];
  const medicoNomeCompleto = medicoTituloNome(medico);
  const crmText = `CRM-${medico?.crm?.estado || 'XX'} ${medico?.crm?.numero || '00000'}`;
  const pacienteAceitoFmt = input.pacienteAceitoEm
    ? input.pacienteAceitoEm.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
    : undefined;

  const yLimiteConteudo = omitManual ? 278 : PDF_PLANO_Y_ASSINATURA - 4;

  const doc = new jsPDF();
  doc.setTextColor(...darkColor);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(medicoNomeCompleto, 20, 15);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text(crmText, 20, 22);

  const orgLogoUrl = input.organizationBranding?.pdfLogoUrl?.trim();
  const drewOrgLogo = orgLogoUrl ? await drawLogoOrganizacaoTopo(doc, orgLogoUrl) : false;
  if (!drewOrgLogo) {
    await addMedicoPdfLogoToDocument(doc, medico, null, input.organizationBranding ?? null);
  }

  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANO TERAPÊUTICO PERSONALIZADO', 105, 32, { align: 'center' });

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
  if (medico?.telefone) {
    doc.text(`Telefone: ${medico.telefone}`, colunaDireita, yPosMedico);
  }

  yPos = Math.max(yPos, yPosMedico) + 10;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANO ESCOLHIDO PELO PACIENTE', 20, yPos);
  yPos += 8;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  if (ctx.metaDescricao?.trim()) {
    yPos = linhaResumoPlano(doc, yPos, 'Meta cadastrada', ctx.metaDescricao.trim());
  }
  yPos = linhaResumoPlano(doc, yPos, 'Modalidade', escolha.rotuloExibicao);
  yPos = linhaResumoPlano(doc, yPos, 'Prazo estimado', formatarPrazoMeses(resumo.prazoMeses, { usarClampSlider: false }));
  yPos = linhaResumoPlano(
    doc,
    yPos,
    'Ritmo médio esperado',
    resumo.perdaSemanalMinKg === resumo.perdaSemanalMaxKg
      ? `${resumo.perdaSemanalMinKg.toFixed(1)} kg/semana`
      : `${resumo.perdaSemanalMinKg.toFixed(1)}–${resumo.perdaSemanalMaxKg.toFixed(1)} kg/semana`
  );
  yPos = linhaResumoPlano(doc, yPos, 'Dose total prevista', `${resumo.doseTotalMg.toFixed(0)} mg`);
  yPos = linhaResumoPlano(doc, yPos, 'Aplicações previstas', String(resumo.aplicacoes));
  yPos = linhaResumoPlano(doc, yPos, 'Consultas previstas', String(resumo.consultas));
  yPos = linhaResumoPlano(doc, yPos, 'Investimento', formatarMoedaBRL(escolha.valorTotal));

  if (escolha.modalidade === 'personalizado') {
    if (escolha.metaKg != null) {
      yPos = linhaResumoPlano(doc, yPos, 'Meta personalizada', formatarMetaKg(escolha.metaKg));
    }
    if (escolha.doseMensalMg != null) {
      yPos = linhaResumoPlano(doc, yPos, 'Dose mensal', `${escolha.doseMensalMg} mg`);
    }
    if (escolha.ritmoEscalonamento) {
      const ritmo = RITMOS_ESCALONAMENTO.find((r) => r.id === escolha.ritmoEscalonamento);
      yPos = linhaResumoPlano(doc, yPos, 'Ritmo de evolução', ritmo?.rotulo ?? escolha.ritmoEscalonamento);
    }
  }

  yPos += 4;
  if (yPos < yLimiteConteudo - 28) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 100, 100);
    const disclaimer =
      'Documento de estimativa terapêutica. Valores e prazos são projeções e podem ser ajustados clinicamente conforme evolução do tratamento.';
    const linhas = doc.splitTextToSize(disclaimer, 170);
    doc.text(linhas, 20, yPos);
    yPos += linhas.length * 4 + 6;
    doc.setTextColor(...darkColor);
  }

  if (input.pacienteAceitoEm && pacienteAceitoFmt) {
    if (yPos < yLimiteConteudo - 20) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('CONFIRMAÇÃO DO PACIENTE', 20, yPos);
      yPos += 6;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const confirmacao = [
        `Plano terapêutico confirmado eletronicamente por ${ctx.pacienteNome} em ${pacienteAceitoFmt}.`,
        'Documento assinado eletronicamente conforme a MP nº 2.200-2/2001.',
      ];
      for (const linha of confirmacao) {
        const wrapped = doc.splitTextToSize(linha, 170);
        doc.text(wrapped, 20, yPos);
        yPos += wrapped.length * 4.5 + 2;
      }
    }
  }

  if (omitManual) {
    const cidade = medico?.localizacao?.cidade?.trim();
    const uf = medico?.localizacao?.estado?.trim();
    const localData =
      cidade && uf
        ? `${cidade}/${uf}, ${(input.dataDocumento ?? new Date()).toLocaleDateString('pt-BR')}.`
        : (input.dataDocumento ?? new Date()).toLocaleDateString('pt-BR');
    desenharPaginaAssinaturasReservadaPlanoTerapeutico(doc, {
      localData,
      hashDocumento: undefined,
    });
  }

  desenharNumeracaoPaginasPlanoTerapeuticoPdf(doc);

  return doc;
}

export function openPlanoTerapeuticoPdfUrl(url: string): void {
  if (typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import { prescriptionPdfDateLocale, simplePrescriptionPdfLabels } from '@/lib/prescricao/prescriptionPrintLabels';
import { buildPrescricaoJsPdfDocument } from '@/utils/prescricaoPdfGenerate';

export interface PrescricaoPdfPacienteContext {
  pacienteNome: string;
  pacienteCpf?: string;
}

/**
 * Gera o mesmo PDF usado na impressão do metaadmin (prescrição ou recibo), para reimpressão pelo paciente.
 */
export async function downloadPrescricaoPdfComoImpressao(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: PrescricaoPdfPacienteContext,
  options?: { language?: PrescriptionPrintLanguage }
): Promise<void> {
  const language: PrescriptionPrintLanguage = options?.language === 'en' ? 'en' : 'pt';
  const doc = await buildPrescricaoJsPdfDocument(prescricao, medico, ctx, { language });
  if (prescricao.tipoDocumento === 'recibo_medico') {
    const dataIsoPrint = (prescricao.dataRecibo || '').trim();
    const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
    doc.save(`Recibo_${safeNome}_${dataIsoPrint.replace(/\//g, '-')}.pdf`);
    return;
  }
  const dataAtual = new Date().toLocaleDateString(prescriptionPdfDateLocale(language));
  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  const prefix = simplePrescriptionPdfLabels(language).filePrefix;
  doc.save(`${prefix}_${safeNome}_${dataAtual.replace(/\//g, '_')}.pdf`);
}

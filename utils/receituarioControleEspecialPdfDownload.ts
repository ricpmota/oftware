import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { PrescriptionPrintLanguage } from '@/types/prescriptionPrintLanguage';
import type { ReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import { controleEspecialPdfLabels, prescriptionPdfDateLocale } from '@/lib/prescricao/prescriptionPrintLabels';
import { generateReceituarioControleEspecialPdf } from '@/utils/receituarioControleEspecialPdfGenerate';

export async function downloadReceituarioControleEspecialPdfComoImpressao(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext,
  options?: { language?: PrescriptionPrintLanguage }
): Promise<void> {
  const language: PrescriptionPrintLanguage = options?.language === 'en' ? 'en' : 'pt';
  const doc = await generateReceituarioControleEspecialPdf(prescricao, medico, ctx, { language });
  const dataAtual = new Date().toLocaleDateString(prescriptionPdfDateLocale(language));
  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  const prefix = controleEspecialPdfLabels(language).filePrefix;
  doc.save(`${prefix}_${safeNome}_${dataAtual.replace(/\//g, '_')}.pdf`);
}

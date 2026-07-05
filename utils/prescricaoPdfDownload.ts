import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
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
  ctx: PrescricaoPdfPacienteContext
): Promise<void> {
  const doc = await buildPrescricaoJsPdfDocument(prescricao, medico, ctx);
  if (prescricao.tipoDocumento === 'recibo_medico') {
    const dataIsoPrint = (prescricao.dataRecibo || '').trim();
    const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
    doc.save(`Recibo_${safeNome}_${dataIsoPrint.replace(/\//g, '-')}.pdf`);
    return;
  }
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  doc.save(`Prescricao_${safeNome}_${dataAtual.replace(/\//g, '_')}.pdf`);
}

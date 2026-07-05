import type { Medico } from '@/types/medico';
import type { Prescricao } from '@/types/prescricao';
import type { ReceituarioControleEspecialPacienteContext } from '@/lib/prescricao/receituarioControleEspecialContext';
import { generateReceituarioControleEspecialPdf } from '@/utils/receituarioControleEspecialPdfGenerate';

export async function downloadReceituarioControleEspecialPdfComoImpressao(
  prescricao: Prescricao,
  medico: Medico | null,
  ctx: ReceituarioControleEspecialPacienteContext
): Promise<void> {
  const doc = await generateReceituarioControleEspecialPdf(prescricao, medico, ctx);
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  const safeNome = ctx.pacienteNome.replace(/\s/g, '_');
  doc.save(`Receituario_Controle_Especial_${safeNome}_${dataAtual.replace(/\//g, '_')}.pdf`);
}

import { buildContratoTratamentoTexto } from '@/lib/documentos/contrato-tratamento/contratoTratamentoService';
import type { ContratoTratamentoBuildContext } from '@/lib/documentos/contrato-tratamento/contratoTratamentoTypes';
import type { Medico } from '@/types/medico';
import type { PacienteCompleto } from '@/types/obesidade';

const MARCO_ASSINATURA_PACIENTE = '__QUEBRA_PAGINA_ASSINATURAS__';

/** Texto do contrato para leitura no portal do paciente — corpo jurídico, sem blocos de assinatura. */
export async function buildContratoTratamentoTextoLeituraPaciente(
  medico: Medico | null,
  paciente: PacienteCompleto,
  ctx: ContratoTratamentoBuildContext
): Promise<string> {
  const { texto } = await buildContratoTratamentoTexto(medico, paciente, {
    ...ctx,
    assinaturaMedicoEm: undefined,
    assinaturaPacienteEm: undefined,
    assinaturaDigitalMedico: undefined,
    assinaturaDigitalPaciente: undefined,
  });

  const idx = texto.indexOf(MARCO_ASSINATURA_PACIENTE);
  if (idx >= 0) {
    return texto.slice(0, idx).trimEnd();
  }

  return texto.trimEnd();
}

import type { Medico } from '@/types/medico';
import {
  buildSolicitacaoExamesJsPdfDocument,
  saveSolicitacaoExamesPdf,
} from '@/utils/solicitacaoExamesPdfGenerate';

export interface SolicitacaoExamesSalva {
  id: string;
  pacienteId: string;
  medicoId: string;
  exames: string[];
  hipoteseDiagnostica: string;
  criadoEm: Date;
}

export interface SolicitacaoExamesPdfContext {
  pacienteNome: string;
  pacienteCpf?: string;
  pacienteDataNascimento?: string;
  pacienteSexo?: string;
}

export async function downloadSolicitacaoExamesPdf(
  solicitacao: SolicitacaoExamesSalva,
  medico: Medico | null,
  ctx: SolicitacaoExamesPdfContext
): Promise<void> {
  const doc = await buildSolicitacaoExamesJsPdfDocument(
    {
      exames: solicitacao.exames,
      hipoteseDiagnostica: solicitacao.hipoteseDiagnostica,
      medico,
      ctx,
      dataSolicitacao: solicitacao.criadoEm,
    },
    { omitManualSignatureBlock: false }
  );
  saveSolicitacaoExamesPdf(doc, ctx.pacienteNome);
}

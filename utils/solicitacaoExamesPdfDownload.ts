import type { Medico } from '@/types/medico';
import {
  buildSolicitacaoExamesJsPdfDocument,
  openSolicitacaoExamesPdfUrl,
  saveSolicitacaoExamesPdf,
} from '@/utils/solicitacaoExamesPdfGenerate';

export interface SolicitacaoExamesSalva {
  id: string;
  pacienteId: string;
  medicoId: string;
  exames: string[];
  hipoteseDiagnostica: string;
  criadoEm: Date;
  /** PDF com assinatura digital no Storage (sandbox/BRy). */
  signedPdfUrl?: string;
}

function toDateFromFirestore(value: unknown): Date {
  if (value instanceof Date) return value;
  if (
    value &&
    typeof value === 'object' &&
    'toDate' in value &&
    typeof (value as { toDate: () => Date }).toDate === 'function'
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return new Date();
}

export function pickSignedPdfUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function mapSolicitacaoExamesFromFirestore(
  id: string,
  pacienteId: string,
  data: Record<string, unknown>
): SolicitacaoExamesSalva {
  const examesRaw = data.exames;
  return {
    id,
    pacienteId,
    medicoId: typeof data.medicoId === 'string' ? data.medicoId : '',
    exames: Array.isArray(examesRaw)
      ? examesRaw.filter((item): item is string => typeof item === 'string')
      : [],
    hipoteseDiagnostica:
      typeof data.hipoteseDiagnostica === 'string' ? data.hipoteseDiagnostica : '',
    criadoEm: toDateFromFirestore(data.criadoEm),
    signedPdfUrl: pickSignedPdfUrl(data.signedPdfUrl),
  };
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
  if (solicitacao.signedPdfUrl) {
    openSolicitacaoExamesPdfUrl(solicitacao.signedPdfUrl);
    return;
  }
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

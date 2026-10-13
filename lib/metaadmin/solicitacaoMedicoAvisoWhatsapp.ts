import { formatMedicoBoasVindas } from '@/lib/whatsapp/boasVindasTratamentoMessage';
import { resolvePrescriptionDocumentPublicBaseUrl } from '@/lib/signature/prescriptionPublicDocumentUrls';

export function buildMetaadminPacientesUrl(): string {
  return `${resolvePrescriptionDocumentPublicBaseUrl()}/metaadmin?menu=pacientes`;
}

export function buildSolicitacaoAcompanhamentoMedicoTexto(input: {
  medicoNome: string;
  medicoGenero?: string | null;
  pacienteNome: string;
}): string {
  const medico = formatMedicoBoasVindas(input.medicoNome, input.medicoGenero);
  const paciente = input.pacienteNome.trim() || 'um paciente';
  const link = buildMetaadminPacientesUrl();

  return [
    `Olá, ${medico}!`,
    ``,
    `O paciente ${paciente} solicitou acompanhamento e está aguardando aprovação.`,
    ``,
    `Abra o painel de pacientes para aceitar:`,
    link,
  ].join('\n');
}

import { auth } from '@/lib/firebase';
import type { PacienteSelfGateReason } from '@/lib/server/requirePacienteSelfGate';

const REASON_FALLBACK: Partial<Record<string, string>> = {
  easysign_not_configured:
    'Assinatura eletrônica ainda não está configurada no servidor. Tente novamente mais tarde ou fale com a clínica.',
  easysign_auth_failed:
    'Não foi possível autenticar no EasySign BRy. Verifique BRY_EASYSIGN_* / SIGNATURE_BRY_* no Vercel (hom vs prod).',
  easysign_envelope_failed:
    'Não foi possível criar o envelope de assinatura. Tente novamente ou fale com a clínica.',
  contrato_not_found: 'Contrato não encontrado para este paciente. Atualize a página ou fale com a clínica.',
  paciente_sem_email: 'Seu cadastro está sem e-mail. Atualize seus dados no portal antes de assinar.',
  signer_phone_invalid:
    'Telefone do cadastro em formato inválido para assinatura. Atualize seu telefone ou fale com a clínica.',
  contrato_sem_pdf_medico: 'O PDF assinado pelo médico ainda não está disponível. Aguarde ou fale com a clínica.',
  missing_body_fields: 'Não foi possível identificar o contrato. Atualize a página e tente de novo.',
  contrato_sem_opcao_entrega: 'Escolha como deseja receber o tratamento antes de assinar.',
  contrato_sem_medico: 'Contrato incompleto (sem médico responsável). Fale com a clínica.',
  internal_error: 'Erro ao preparar assinatura. Tente novamente em instantes.',
  paciente_fallback_ambiguous:
    'Encontramos mais de um cadastro vinculado a esta conta. Entre em contato com sua equipe médica.',
};

function messageFromApi(data: Record<string, unknown>, status: number): string {
  const reason = typeof data.reason === 'string' ? data.reason : undefined;
  const apiError = typeof data.error === 'string' ? data.error : undefined;

  if (apiError) return apiError;
  if (reason && REASON_FALLBACK[reason]) return REASON_FALLBACK[reason]!;

  if (status === 401) return 'Faça login novamente para preparar sua assinatura.';
  if (status === 403) {
    return (
      'Esta conta não está vinculada ao paciente deste contrato. ' +
      'Entre com o mesmo e-mail usado no cadastro ou peça ajuda à clínica.'
    );
  }
  if (status === 404) return 'Cadastro de paciente não encontrado.';
  if (status === 409) return REASON_FALLBACK.paciente_fallback_ambiguous!;
  if (status === 503) return REASON_FALLBACK.easysign_not_configured!;

  return 'Não foi possível abrir a assinatura.';
}

export type ContratoPacienteEnsureSignLinkResult = {
  pacienteSignLinkUrl: string;
  resolvedPacienteId?: string;
  resolvedDocumentoId?: string;
};

export async function requestContratoPacienteEnsureSignLink(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<ContratoPacienteEnsureSignLinkResult> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');
  const token = await user.getIdToken();
  const res = await fetch('/api/meta/contrato-tratamento/ensure-sign-link', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const err = new Error(messageFromApi(data, res.status)) as Error & {
      status?: number;
      reason?: PacienteSelfGateReason | string;
    };
    err.status = res.status;
    err.reason = typeof data.reason === 'string' ? data.reason : undefined;
    throw err;
  }
  const url = String(data.pacienteSignLinkUrl || '').trim();
  if (!url) throw new Error('Link de assinatura indisponível.');

  const resolvedPacienteId = String(data.resolvedPacienteId || '').trim() || undefined;
  const resolvedDocumentoId = String(data.resolvedDocumentoId || '').trim() || undefined;

  return {
    pacienteSignLinkUrl: url,
    resolvedPacienteId,
    resolvedDocumentoId,
  };
}

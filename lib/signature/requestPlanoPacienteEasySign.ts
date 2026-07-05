const REASON_FALLBACK: Partial<Record<string, string>> = {
  easysign_not_configured:
    'Assinatura digital ainda não está disponível. Tente novamente mais tarde ou fale com a clínica.',
  easysign_auth_failed:
    'Não foi possível preparar a assinatura digital. Tente novamente ou fale com a clínica.',
  easysign_envelope_failed:
    'Não foi possível criar o envelope de assinatura. Tente novamente ou fale com a clínica.',
  plano_not_found: 'Plano não encontrado. Atualize a página ou fale com a clínica.',
  paciente_sem_email: 'Seu cadastro está sem e-mail. Atualize seus dados antes de assinar.',
  signer_phone_invalid:
    'Telefone do cadastro em formato inválido para assinatura. Atualize seu telefone ou fale com a clínica.',
  plano_sem_pdf: 'O PDF do plano ainda não está disponível. Aguarde ou fale com a clínica.',
  internal_error: 'Erro ao preparar assinatura. Tente novamente em instantes.',
};

function messageFromApi(data: Record<string, unknown>, status: number): string {
  const reason = typeof data.reason === 'string' ? data.reason : undefined;
  const apiError = typeof data.error === 'string' ? data.error : undefined;

  if (apiError) return apiError;
  if (reason && REASON_FALLBACK[reason]) return REASON_FALLBACK[reason]!;

  if (status === 404) return 'Plano não encontrado.';
  if (status === 503) return REASON_FALLBACK.easysign_not_configured!;

  return 'Não foi possível abrir a assinatura.';
}

export type PlanoPacienteEnsureSignLinkResult = {
  pacienteSignLinkUrl: string;
};

export async function requestPlanoPacienteEnsureSignLink(args: {
  orcamentoId: string;
  token: string;
}): Promise<PlanoPacienteEnsureSignLinkResult> {
  const res = await fetch(
    `/api/plano-terapeutico/${encodeURIComponent(args.orcamentoId)}/easysign/ensure-sign-link?t=${encodeURIComponent(args.token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(messageFromApi(data, res.status));
  }
  const url = String(data.pacienteSignLinkUrl || '').trim();
  if (!url) throw new Error('Link de assinatura indisponível.');
  return { pacienteSignLinkUrl: url };
}

export type PlanoPacienteSyncSignStatusResult =
  | {
      ok: true;
      pending: true;
      statusAssinatura: 'aguardando_paciente';
    }
  | {
      ok: true;
      pending: false;
      statusAssinatura: 'aceito';
      pdfFinalAssinadoUrl: string;
      pacienteAssinadoEm: string;
      newlySynced?: boolean;
      plano?: Record<string, unknown>;
    };

export async function requestPlanoPacienteSyncSignStatus(args: {
  orcamentoId: string;
  token: string;
}): Promise<PlanoPacienteSyncSignStatusResult> {
  const res = await fetch(
    `/api/plano-terapeutico/${encodeURIComponent(args.orcamentoId)}/easysign/sync?t=${encodeURIComponent(args.token)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }
  );
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error(
      (typeof data.error === 'string' && data.error) || 'Não foi possível verificar sua assinatura.'
    );
  }

  if (data.pending === true || data.statusAssinatura === 'aguardando_paciente') {
    return {
      ok: true,
      pending: true,
      statusAssinatura: 'aguardando_paciente',
    };
  }

  const pdfFinalAssinadoUrl = String(data.pdfFinalAssinadoUrl || '').trim();
  if (!pdfFinalAssinadoUrl) {
    throw new Error('Plano assinado sem URL do PDF final.');
  }

  return {
    ok: true,
    pending: false,
    statusAssinatura: 'aceito',
    pdfFinalAssinadoUrl,
    pacienteAssinadoEm: String(data.pacienteAssinadoEm || new Date().toISOString()),
    newlySynced: data.newlySynced === true,
    plano: typeof data.plano === 'object' && data.plano ? (data.plano as Record<string, unknown>) : undefined,
  };
}

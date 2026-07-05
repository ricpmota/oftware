export type EasySignFlowStep =
  | 'pdf_downloaded'
  | 'patient_email_resolved'
  | 'payload_built'
  | 'requesting_token'
  | 'token_ok'
  | 'creating_envelope'
  | 'envelope_ok';

export type EasySignFlowContext = {
  step: EasySignFlowStep | 'unknown';
  pacienteId?: string;
  documentoId?: string;
};

export function createEasySignFlowContext(args?: {
  pacienteId?: string;
  documentoId?: string;
}): EasySignFlowContext {
  return {
    step: 'unknown',
    pacienteId: args?.pacienteId,
    documentoId: args?.documentoId,
  };
}

export function logEasySignFlow(
  ctx: EasySignFlowContext | undefined,
  step: EasySignFlowStep,
  meta?: Record<string, string | number | boolean | undefined>
): void {
  if (ctx) ctx.step = step;
  console.info('[contrato.easysign.flow]', {
    step,
    pacienteId: ctx?.pacienteId,
    documentoId: ctx?.documentoId,
    ...meta,
  });
}

function inferEasySignErrorReason(message: string): string {
  const m = message.toLowerCase();
  if (m.includes('obter token easysign') || m.includes('token easysign')) return 'token_failed';
  if (m.includes('credenciais easysign')) return 'credentials_missing';
  if (m.includes('falha ao criar envelope easysign')) return 'envelope_http_failed';
  if (m.includes('resposta easysign incompleta')) return 'envelope_incomplete_response';
  if (m.includes('sem e-mail') || m.includes('sem email')) return 'patient_missing_email';
  if (m.includes('sem nome cadastrado')) return 'patient_missing_name';
  if (m.includes('pdf assinado pelo médico não encontrado')) return 'pdf_url_missing';
  if (m.includes('não foi possível baixar o pdf assinado')) return 'pdf_download_failed';
  if (m.includes('pdf assinado pelo médico está vazio')) return 'pdf_empty';
  if (m.includes('pdf muito grande')) return 'pdf_too_large';
  if (m.includes('telefone do paciente em formato inválido') || m.includes('e164')) {
    return 'signer_phone_invalid';
  }
  return 'unknown';
}

export function logEasySignError(
  ctx: EasySignFlowContext | undefined,
  error: unknown,
  reason?: string
): void {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[contrato.easysign.error]', {
    step: ctx?.step ?? 'unknown',
    reason: reason || inferEasySignErrorReason(message),
    errorName: error instanceof Error ? error.name : 'Error',
    message,
    pacienteId: ctx?.pacienteId,
    documentoId: ctx?.documentoId,
  });
}

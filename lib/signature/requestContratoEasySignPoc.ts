import { auth } from '@/lib/firebase';

async function authFetch(path: string, body: Record<string, string>) {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');
  const token = await user.getIdToken();
  const res = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    throw new Error((typeof data.error === 'string' && data.error) || 'Operação EasySign falhou.');
  }
  return data;
}

export async function requestContratoEasySignCreateLink(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<{
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  bryEasySignEnvelopeId: string;
  bryEasySignDocumentUuid: string;
}> {
  const data = await authFetch('/api/signature/bry/easysign/contrato-tratamento/create', args);
  return {
    pacienteSignLinkUrl: String(data.pacienteSignLinkUrl || ''),
    pacienteSignIframeUrl:
      typeof data.pacienteSignIframeUrl === 'string' ? data.pacienteSignIframeUrl : undefined,
    bryEasySignEnvelopeId: String(data.bryEasySignEnvelopeId || ''),
    bryEasySignDocumentUuid: String(data.bryEasySignDocumentUuid || ''),
  };
}

export async function requestContratoEasySignDownloadFinal(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<{
  pdfFinalAssinadoUrl: string;
  pacienteAssinadoEm: string;
  statusAssinatura: string;
}> {
  const data = await authFetch('/api/signature/bry/easysign/contrato-tratamento/download', args);
  return {
    pdfFinalAssinadoUrl: String(data.pdfFinalAssinadoUrl || ''),
    pacienteAssinadoEm: String(data.pacienteAssinadoEm || ''),
    statusAssinatura: String(data.statusAssinatura || 'assinado_completo'),
  };
}

export async function requestContratoEasySignSyncStatus(args: {
  pacienteId: string;
  documentoId: string;
}): Promise<{
  pending: boolean;
  statusAssinatura: string;
  pdfFinalAssinadoUrl?: string;
  pacienteAssinadoEm?: string;
  emailSent?: boolean;
}> {
  const data = await authFetch('/api/signature/bry/easysign/contrato-tratamento/sync', args);
  return {
    pending: data.pending === true,
    statusAssinatura: String(data.statusAssinatura || 'aguardando_paciente'),
    pdfFinalAssinadoUrl:
      typeof data.pdfFinalAssinadoUrl === 'string' ? data.pdfFinalAssinadoUrl : undefined,
    pacienteAssinadoEm:
      typeof data.pacienteAssinadoEm === 'string' ? data.pacienteAssinadoEm : undefined,
    emailSent: data.emailSent === true,
  };
}

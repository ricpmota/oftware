import { auth } from '@/lib/firebase';

export async function requestSolicitarContratoAssinaturaPaciente(args: {
  pacienteId: string;
  medicoId: string;
  hashDocumento: string;
  documentoId?: string;
}): Promise<{ documentoId: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');
  const token = await user.getIdToken();
  const res = await fetch('/api/metaadmin/contrato-tratamento/solicitar-paciente', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(args),
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok || data.ok === false) {
    const apiError = typeof data.error === 'string' ? data.error : undefined;
    throw new Error(apiError || 'Não foi possível solicitar assinatura do paciente.');
  }
  const documentoId = String(data.documentoId || '').trim();
  if (!documentoId) throw new Error('Resposta inválida do servidor.');
  return { documentoId };
}

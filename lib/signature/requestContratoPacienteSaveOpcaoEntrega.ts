import { auth } from '@/lib/firebase';
import type { ContratoOpcaoEntregaMaterial } from '@/lib/contratos/contratoOpcaoEntregaMaterial';

export async function requestContratoPacienteSaveOpcaoEntrega(args: {
  pacienteId: string;
  documentoId: string;
  opcaoEntregaMaterial: ContratoOpcaoEntregaMaterial;
}): Promise<{ pdfParaAssinaturaPacienteUrl: string }> {
  const user = auth.currentUser;
  if (!user) throw new Error('Faça login para continuar.');
  const token = await user.getIdToken();
  const res = await fetch('/api/meta/contrato-tratamento/opcao-entrega', {
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
    throw new Error(apiError || 'Não foi possível salvar sua escolha.');
  }
  const pdfUrl = String(data.pdfParaAssinaturaPacienteUrl || '').trim();
  if (!pdfUrl) {
    throw new Error('Não foi possível preparar o PDF do contrato.');
  }
  return { pdfParaAssinaturaPacienteUrl: pdfUrl };
}

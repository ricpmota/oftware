import { auth } from '@/lib/firebase';
import type { CompartilhamentoAceiteRole } from '@/lib/compartilhamento/buildCompartilhamentoAceiteWhatsappMessages';

export type AvisoSolicitacaoResult = {
  status: 'sent' | 'failed' | 'skipped';
  via?: 'medico' | 'canal_chat';
  error?: string;
};

async function authHeader(): Promise<Record<string, string>> {
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** Consulta o provedor (mesma rota do painel de WhatsApp do médico). */
export async function checkMedicoWhatsappConectado(): Promise<boolean> {
  try {
    const res = await fetch('/api/metaadmin/whatsapp/status', {
      headers: await authHeader(),
      cache: 'no-store',
    });
    const data = (await res.json().catch(() => null)) as { status?: string } | null;
    return res.ok && data?.status === 'connected';
  } catch {
    return false;
  }
}

export async function enviarAvisoSolicitacaoCompartilhamento(
  solicitacaoId: string,
  role: CompartilhamentoAceiteRole
): Promise<AvisoSolicitacaoResult> {
  try {
    const res = await fetch('/api/send-whatsapp-compartilhamento-solicitacao', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await authHeader()) },
      body: JSON.stringify({ solicitacaoId, role }),
    });
    const data = (await res.json().catch(() => null)) as AvisoSolicitacaoResult | null;
    if (data?.status) return data;
    return { status: 'failed', error: (data as { error?: string } | null)?.error || 'Erro ao enviar.' };
  } catch {
    return { status: 'failed', error: 'Sem conexão com o servidor.' };
  }
}

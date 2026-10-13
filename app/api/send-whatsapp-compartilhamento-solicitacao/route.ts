import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  notifyCompartilhamentoSolicitacaoWhatsapp,
  solicitacaoCollectionForRole,
} from '@/services/compartilhamentoSolicitacaoWhatsappService';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

/**
 * Após o médico criar a solicitação de compartilhamento:
 * WhatsApp do médico → nutricionista/personal pedindo para autorizar o vínculo.
 */
export async function POST(request: NextRequest) {
  const auth = await requireMedicoMetaadmin(request);
  if (!auth.ok) return auth.res;

  try {
    const body = await request.json().catch(() => null);
    const solicitacaoId =
      typeof body?.solicitacaoId === 'string' ? body.solicitacaoId.trim() : '';
    const role =
      body?.role === 'nutricionista' || body?.role === 'personal_trainer' ? body.role : null;
    if (!solicitacaoId || !role) {
      return NextResponse.json(
        { error: 'solicitacaoId e role (nutricionista|personal_trainer) são obrigatórios.' },
        { status: 400 }
      );
    }

    const snap = await getFirestoreAdmin()
      .collection(solicitacaoCollectionForRole(role))
      .doc(solicitacaoId)
      .get();
    if (!snap.exists || snap.data()?.medicoId !== auth.medicoDocId) {
      return NextResponse.json({ error: 'Solicitação não encontrada.' }, { status: 404 });
    }

    const result = await notifyCompartilhamentoSolicitacaoWhatsapp({ solicitacaoId, role });
    return NextResponse.json(
      { success: result.status !== 'failed', ...result },
      { status: result.status === 'failed' ? 502 : 200 }
    );
  } catch (error) {
    console.error('send-whatsapp-compartilhamento-solicitacao:', error);
    return NextResponse.json(
      { error: 'Erro ao avisar o profissional pelo WhatsApp.' },
      { status: 500 }
    );
  }
}

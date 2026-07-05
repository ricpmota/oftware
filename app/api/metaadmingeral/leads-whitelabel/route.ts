import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { METAADMIN_GERAL_EMAIL } from '@/lib/meta/anamneseInteligenteGate';
import { mapLeadWhiteLabelDoc } from '@/lib/whiteLabel/leadApiMapper';
import { computeCrmKpis, updateLeadCrmStage } from '@/lib/whiteLabel/leadCrmService';
import { deleteWhiteLabelLead } from '@/lib/whiteLabel/leadService';
import type { WhiteLabelCrmStage } from '@/types/leadWhiteLabelCrm';
import { WHITELABEL_CRM_STAGES } from '@/types/leadWhiteLabelCrm';

const VALID_STAGES = new Set(WHITELABEL_CRM_STAGES.map((s) => s.value));

async function requireAdmin(request: NextRequest): Promise<{ email: string } | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token de autenticação obrigatório.' }, { status: 401 });
  }
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    const email = (decoded.email || '').trim().toLowerCase();
    if (email !== METAADMIN_GERAL_EMAIL.trim().toLowerCase()) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    return { email: decoded.email! };
  } catch {
    return NextResponse.json({ error: 'Token inválido ou expirado.' }, { status: 401 });
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection('leadsWhiteLabel').orderBy('createdAt', 'desc').get();
    const rawDocs = snap.docs.map((doc) => doc.data());
    const leads = snap.docs.map((doc) => mapLeadWhiteLabelDoc(doc.id, doc.data()));
    const kpis = computeCrmKpis(rawDocs);

    return NextResponse.json({ leads, kpis });
  } catch (error) {
    console.error('[API metaadmingeral/leads-whitelabel] GET:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar leads.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      id?: string;
      observacoes?: string;
      crmStage?: string;
      crmMedico?: string;
      especialidade?: string;
      cidade?: string;
      estado?: string;
      projectedRevenue?: number;
      realizedRevenue?: number;
    };

    const id = typeof body.id === 'string' ? body.id.trim() : '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    if (body.crmStage) {
      if (!VALID_STAGES.has(body.crmStage as WhiteLabelCrmStage)) {
        return NextResponse.json({ error: 'Estágio CRM inválido.' }, { status: 400 });
      }
      await updateLeadCrmStage(id, body.crmStage as WhiteLabelCrmStage, authResult.email);
    }

    const update: Record<string, unknown> = {};
    if (body.observacoes !== undefined) {
      update.observacoes = typeof body.observacoes === 'string' ? body.observacoes.trim() : '';
    }
    if (body.crmMedico !== undefined) update.crmMedico = body.crmMedico.trim();
    if (body.especialidade !== undefined) update.especialidade = body.especialidade.trim();
    if (body.cidade !== undefined) update.cidade = body.cidade.trim();
    if (body.estado !== undefined) update.estado = body.estado.trim();

    const db = getFirestoreAdmin();
    const leadRef = db.collection('leadsWhiteLabel').doc(id);

    if (body.projectedRevenue !== undefined || body.realizedRevenue !== undefined) {
      const snap = await leadRef.get();
      if (!snap.exists) {
        return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
      }
      const existingMetrics = (snap.data()?.crmMetrics || {}) as {
        projectedRevenue?: number;
        realizedRevenue?: number;
      };
      update.crmMetrics = {
        projectedRevenue:
          body.projectedRevenue !== undefined
            ? Math.max(0, Number(body.projectedRevenue) || 0)
            : existingMetrics.projectedRevenue ?? 0,
        realizedRevenue:
          body.realizedRevenue !== undefined
            ? Math.max(0, Number(body.realizedRevenue) || 0)
            : existingMetrics.realizedRevenue ?? 0,
      };
    }

    if (Object.keys(update).length > 0) {
      update.updatedAt = FieldValue.serverTimestamp();
      await leadRef.update(update);
    }

    if (!body.crmStage && Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'Nenhum campo para atualizar.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[API metaadmingeral/leads-whitelabel] PATCH:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao atualizar lead.' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const id = request.nextUrl.searchParams.get('id')?.trim() || '';
    if (!id) {
      return NextResponse.json({ error: 'id é obrigatório.' }, { status: 400 });
    }

    await deleteWhiteLabelLead(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[API metaadmingeral/leads-whitelabel] DELETE:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao excluir lead.' },
      { status: 400 }
    );
  }
}

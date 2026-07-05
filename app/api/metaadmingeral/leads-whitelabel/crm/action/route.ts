import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { executeLeadCrmAction, type CrmQuickAction } from '@/lib/whiteLabel/leadCrmService';

const VALID_ACTIONS: CrmQuickAction[] = [
  'meeting_completed',
  'proposal_sent',
  'negotiation_started',
  'closed',
  'lost',
  'qualified',
  'note',
];

export async function POST(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  const body = (await request.json().catch(() => ({}))) as {
    leadId?: string;
    action?: string;
    note?: string;
  };

  const leadId = typeof body.leadId === 'string' ? body.leadId.trim() : '';
  const action = body.action as CrmQuickAction;

  if (!leadId || !action || !VALID_ACTIONS.includes(action)) {
    return NextResponse.json({ error: 'leadId e action válidos são obrigatórios.' }, { status: 400 });
  }

  try {
    const result = await executeLeadCrmAction({
      leadId,
      action,
      note: body.note,
      createdBy: authResult.email,
    });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    console.error('[API leads-whitelabel/crm/action]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao executar ação.' },
      { status: 400 }
    );
  }
}

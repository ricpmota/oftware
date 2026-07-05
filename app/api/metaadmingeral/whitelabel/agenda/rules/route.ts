import { NextRequest, NextResponse } from 'next/server';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { listAvailabilityRules, upsertAvailabilityRule } from '@/lib/whiteLabel/availabilityRulesService';
import type { WhiteLabelAvailabilityRule } from '@/types/whiteLabelAgenda';

export async function GET(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const rules = await listAvailabilityRules();
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[API agenda/rules GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar regras.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const authResult = await requireMetaAdminGeral(request);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      rule?: Pick<WhiteLabelAvailabilityRule, 'weekday' | 'enabled' | 'periods'>;
      rules?: Pick<WhiteLabelAvailabilityRule, 'weekday' | 'enabled' | 'periods'>[];
    };

    const items = body.rules || (body.rule ? [body.rule] : []);
    if (items.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos uma regra.' }, { status: 400 });
    }

    const saved = [];
    for (const rule of items) {
      saved.push(await upsertAvailabilityRule(rule));
    }

    return NextResponse.json({ success: true, rules: saved });
  } catch (error) {
    console.error('[API agenda/rules PUT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar regras.' },
      { status: 400 }
    );
  }
}

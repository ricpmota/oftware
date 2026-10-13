import { NextRequest, NextResponse } from 'next/server';
import { requireAgendaMedico } from '@/lib/metaadmin/agenda/requireAgendaMedico';
import {
  listMedicoAvailabilityRules,
  upsertMedicoAvailabilityRule,
} from '@/lib/metaadmin/agenda/availabilityRulesService';
import type { MedicoAvailabilityRule } from '@/types/medicoAgenda';

export async function GET(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rules = await listMedicoAvailabilityRules(auth.medicoDocId);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[metaadmin/agenda/rules GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar regras.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAgendaMedico(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      rules?: Pick<MedicoAvailabilityRule, 'weekday' | 'enabled' | 'periods'>[];
    };
    const items = body.rules || [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos uma regra.' }, { status: 400 });
    }

    const saved = [];
    for (const rule of items) {
      saved.push(await upsertMedicoAvailabilityRule(auth.medicoDocId, rule));
    }
    return NextResponse.json({ success: true, rules: saved });
  } catch (error) {
    console.error('[metaadmin/agenda/rules PUT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar regras.' },
      { status: 400 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { requirePersonalMetaPersonal } from '@/lib/metapersonal/requirePersonalMetaPersonal';
import {
  listPersonalAvailabilityRules,
  upsertPersonalAvailabilityRule,
} from '@/lib/personal/agenda/availabilityRulesService';
import type { PersonalAvailabilityRule } from '@/types/personalAgenda';

export async function GET(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const rules = await listPersonalAvailabilityRules(auth.uid);
    return NextResponse.json({ rules });
  } catch (error) {
    console.error('[metapersonal/agenda/rules GET]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao listar regras.' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePersonalMetaPersonal(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      rules?: Pick<PersonalAvailabilityRule, 'weekday' | 'enabled' | 'periods'>[];
    };
    const items = body.rules || [];
    if (items.length === 0) {
      return NextResponse.json({ error: 'Informe ao menos uma regra.' }, { status: 400 });
    }

    const saved = [];
    for (const rule of items) {
      saved.push(await upsertPersonalAvailabilityRule(auth.uid, rule));
    }
    return NextResponse.json({ success: true, rules: saved });
  } catch (error) {
    console.error('[metapersonal/agenda/rules PUT]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar regras.' },
      { status: 400 }
    );
  }
}

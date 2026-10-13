import { NextRequest, NextResponse } from 'next/server';
import { deleteTrailLessonDoc } from '@/lib/mentorados/curriculum.server';
import { isNextResponse, requireMentorManager } from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function DELETE(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  if (!id) return NextResponse.json({ error: 'id obrigatório.' }, { status: 400 });
  await deleteTrailLessonDoc(id);
  return NextResponse.json({ ok: true });
}

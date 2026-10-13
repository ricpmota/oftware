import { NextRequest, NextResponse } from 'next/server';
import { getMentorTrailDoc, reorderTrailStructure } from '@/lib/mentorados/curriculum.server';
import { isNextResponse, requireMentorManager } from '@/lib/mentorados/requireMentorAccess.server';

type Ctx = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, ctx: Ctx) {
  const access = await requireMentorManager(request);
  if (isNextResponse(access)) return access;
  const { id } = await ctx.params;
  const trail = await getMentorTrailDoc(id);
  if (!trail) return NextResponse.json({ error: 'Trilha não encontrada.' }, { status: 404 });
  try {
    const body = (await request.json()) as {
      modules?: { id: string; order: number }[];
      lessons?: { id: string; moduleId: string; order: number }[];
    };
    await reorderTrailStructure({
      trailId: id,
      modules: Array.isArray(body.modules) ? body.modules : [],
      lessons: Array.isArray(body.lessons) ? body.lessons : [],
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[videosmentorados/trails reorder]', error);
    return NextResponse.json({ error: 'Falha ao reordenar a trilha.' }, { status: 500 });
  }
}

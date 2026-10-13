import { NextRequest, NextResponse } from 'next/server';
import { buildMentorHome, mentorFirstName } from '@/lib/mentorados/assembleCurriculum.server';
import { isNextResponse, requireMentorAccess } from '@/lib/mentorados/requireMentorAccess.server';

export async function GET(request: NextRequest) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;
  try {
    const home = await buildMentorHome({
      uid: access.uid,
      firstName: mentorFirstName(access.medico?.nome),
      canManage: access.canManage,
    });
    return NextResponse.json(home);
  } catch (error) {
    console.error('[videosmentorados/home]', error);
    return NextResponse.json({ error: 'Falha ao carregar a Central do Mentorado.' }, { status: 500 });
  }
}

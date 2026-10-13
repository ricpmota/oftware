import { NextRequest, NextResponse } from 'next/server';
import { requireMentorAccess, isNextResponse } from '@/lib/mentorados/requireMentorAccess.server';

export async function GET(request: NextRequest) {
  const access = await requireMentorAccess(request);
  if (isNextResponse(access)) return access;

  return NextResponse.json({
    canAccess: true,
    canManage: access.canManage,
    medico: access.medico
      ? {
          id: access.medico.id,
          nome: access.medico.nome,
          email: access.medico.email,
          isVerificado: access.medico.isVerificado === true,
          uploadMentor: access.medico.uploadMentor === true,
        }
      : null,
  });
}

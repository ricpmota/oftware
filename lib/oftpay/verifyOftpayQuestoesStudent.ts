import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getOftPayUserAccessInfo } from '@/services/oftpayAccessService';
import { OFTPAY_COURSES } from '@/app/oftpay/coursesConfig';
import { OFTPAY_OWNER_EMAIL } from '@/types/oftpayAccess';

export interface OftpayQuestoesStudentAuth {
  uid: string;
  email: string;
}

export async function verifyOftpayQuestoesStudent(
  request: NextRequest
): Promise<OftpayQuestoesStudentAuth | NextResponse> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 });
  }

  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    const email = decoded.email?.trim();
    const uid = decoded.uid;
    if (!email || !uid) {
      return NextResponse.json({ error: 'Token inválido.' }, { status: 400 });
    }

    const isOwner = email.toLowerCase() === OFTPAY_OWNER_EMAIL.toLowerCase();
    if (!isOwner) {
      const allCourseIds = OFTPAY_COURSES.map((c) => c.id);
      const { questoesEnabled } = await getOftPayUserAccessInfo(email, allCourseIds);
      if (!questoesEnabled) {
        return NextResponse.json({ error: 'Banco de Questões não liberado.' }, { status: 403 });
      }
    }

    return { uid, email };
  } catch {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 401 });
  }
}

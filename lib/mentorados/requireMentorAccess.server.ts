import type { DocumentData } from 'firebase-admin/firestore';
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';
import { canAccessMentorCenter, canManageMentorContent } from '@/lib/mentorados/permissions';

export type MentorMedicoRecord = {
  id: string;
  userId?: string;
  email?: string;
  nome?: string;
  isVerificado?: boolean;
  uploadMentor?: boolean;
};

export type MentorAccessContext = {
  uid: string;
  email: string | null;
  medico: MentorMedicoRecord | null;
  canAccess: boolean;
  canManage: boolean;
};

function mapMedicoDoc(
  id: string,
  data: DocumentData
): MentorMedicoRecord {
  return {
    id,
    userId: typeof data.userId === 'string' ? data.userId : undefined,
    email: typeof data.email === 'string' ? data.email : undefined,
    nome: typeof data.nome === 'string' ? data.nome : undefined,
    isVerificado: data.isVerificado === true,
    uploadMentor: data.uploadMentor === true,
  };
}

export async function findMedicoByAuth(
  uid: string,
  email: string | null
): Promise<MentorMedicoRecord | null> {
  const db = getFirestoreAdmin();
  const byUid = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (!byUid.empty) {
    return mapMedicoDoc(byUid.docs[0].id, byUid.docs[0].data());
  }
  if (!email) return null;
  const byEmail = await db.collection('medicos').where('email', '==', email).limit(1).get();
  if (byEmail.empty) return null;
  return mapMedicoDoc(byEmail.docs[0].id, byEmail.docs[0].data());
}

export async function resolveMentorAccess(
  request: NextRequest
): Promise<MentorAccessContext | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json(
      { error: 'Faça login para acessar a Central do Mentorado.' },
      { status: 401 }
    );
  }

  let uid: string;
  let email: string | null;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email?.trim().toLowerCase() || null;
  } catch {
    return NextResponse.json(
      { error: 'Sessão expirada. Faça login novamente.' },
      { status: 401 }
    );
  }

  const medico = await findMedicoByAuth(uid, email);
  const permissionUser = {
    email: email || medico?.email || null,
    isVerificado: medico?.isVerificado === true,
    uploadMentor: medico?.uploadMentor === true,
  };

  return {
    uid,
    email,
    medico,
    canAccess: canAccessMentorCenter(permissionUser),
    canManage: canManageMentorContent(permissionUser),
  };
}

export async function requireMentorAccess(
  request: NextRequest
): Promise<MentorAccessContext | NextResponse> {
  const result = await resolveMentorAccess(request);
  if (result instanceof NextResponse) return result;
  if (!result.canAccess) {
    return NextResponse.json(
      {
        error: 'Esta área é exclusiva para médicos verificados da plataforma.',
        canAccess: false,
        canManage: false,
      },
      { status: 403 }
    );
  }
  return result;
}

export async function requireMentorManager(
  request: NextRequest
): Promise<MentorAccessContext | NextResponse> {
  const result = await requireMentorAccess(request);
  if (result instanceof NextResponse) return result;
  if (!result.canManage) {
    return NextResponse.json(
      { error: 'Você não tem permissão para gerenciar a Central do Mentorado.' },
      { status: 403 }
    );
  }
  return result;
}

export function isNextResponse(value: MentorAccessContext | NextResponse): value is NextResponse {
  return value instanceof NextResponse;
}

export function mentorActorFromAccess(access: MentorAccessContext) {
  return {
    uid: access.uid,
    name: access.medico?.nome,
    email: access.email || access.medico?.email,
  };
}

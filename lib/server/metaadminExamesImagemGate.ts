import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

export function getBearerToken(request: NextRequest): string | null {
  const h = request.headers.get('Authorization');
  if (!h?.startsWith('Bearer ')) return null;
  const t = h.slice(7).trim();
  return t || null;
}

/** Evita path traversal: objeto deve estar na pasta do paciente. */
export function assertStoragePathBelongsToPaciente(pacienteId: string, storagePath: string): boolean {
  const p = storagePath.trim();
  if (!p || p.includes('..') || p.startsWith('/')) return false;
  const expected = `pacientes-exames-imagem/${pacienteId}/`;
  return p.startsWith(expected);
}

export async function requireMedicoPacienteMetaadmin(
  request: NextRequest,
  pacienteId: string
): Promise<{ ok: true; medicoDocId: string } | { ok: false; res: NextResponse }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 }),
    };
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Token inválido ou expirado.' }, { status: 401 }),
    };
  }

  const db = getFirestoreAdmin();
  const medSnap = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (medSnap.empty) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Apenas médicos cadastrados podem usar este recurso.' }, { status: 403 }),
    };
  }
  const medicoDocId = medSnap.docs[0].id;

  const pacSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacSnap.exists) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Paciente não encontrado.' }, { status: 404 }) };
  }
  const pac = pacSnap.data() as { medicoResponsavelId?: string | null };
  if (!pac.medicoResponsavelId || pac.medicoResponsavelId !== medicoDocId) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Você não tem permissão para este paciente.' }, { status: 403 }),
    };
  }

  return { ok: true, medicoDocId };
}

/** Médico autenticado em /metaadmin (sem vínculo com paciente). */
export async function requireMedicoMetaadmin(
  request: NextRequest
): Promise<{ ok: true; medicoDocId: string; uid: string } | { ok: false; res: NextResponse }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 }),
    };
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Token inválido ou expirado.' }, { status: 401 }),
    };
  }

  const db = getFirestoreAdmin();
  const medSnap = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (medSnap.empty) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Apenas médicos cadastrados podem usar este recurso.' }, { status: 403 }),
    };
  }

  return { ok: true, medicoDocId: medSnap.docs[0].id, uid };
}

/**
 * Leitura de exames de imagem (ex.: URL assinada): médico responsável **ou** o próprio paciente (`userId` no documento).
 */
export async function requireLeituraExamesImagemAutorizado(
  request: NextRequest,
  pacienteId: string
): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Não autenticado. Faça login novamente.' }, { status: 401 }),
    };
  }

  let uid: string;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
  } catch {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Token inválido ou expirado.' }, { status: 401 }),
    };
  }

  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
  if (!pacSnap.exists) {
    return { ok: false, res: NextResponse.json({ ok: false, error: 'Paciente não encontrado.' }, { status: 404 }) };
  }
  const pac = pacSnap.data() as { medicoResponsavelId?: string | null; userId?: string | null };

  if (pac.userId && pac.userId === uid) {
    return { ok: true };
  }

  const medSnap = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (medSnap.empty) {
    return {
      ok: false,
      res: NextResponse.json({ ok: false, error: 'Sem permissão para este recurso.' }, { status: 403 }),
    };
  }
  const medicoDocId = medSnap.docs[0].id;
  if (pac.medicoResponsavelId && pac.medicoResponsavelId === medicoDocId) {
    return { ok: true };
  }

  return {
    ok: false,
    res: NextResponse.json({ ok: false, error: 'Você não tem permissão para este paciente.' }, { status: 403 }),
  };
}

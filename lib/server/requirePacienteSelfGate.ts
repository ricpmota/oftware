import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { getBearerToken } from '@/lib/server/metaadminExamesImagemGate';

export type PacienteSelfGateReason =
  | 'missing_authorization'
  | 'invalid_token'
  | 'paciente_not_found'
  | 'paciente_ownership_mismatch'
  | 'paciente_fallback_not_found'
  | 'paciente_fallback_ambiguous';

export type PacienteSelfGateMatchBy = 'uid' | 'email';

export type RequirePacienteSelfOptions = {
  /** Apenas rotas /meta do paciente — nunca metaadmin/médico. */
  enablePacienteIdFallback?: boolean;
  routeContext?: string;
};

export type PacienteSelfGateDiagnostics = {
  reason: PacienteSelfGateReason;
  hasAuthorizationHeader: boolean;
  hasPacienteId: boolean;
  hasDocumentoId?: boolean;
  userUid?: string;
  pacienteId?: string;
  routeContext?: string;
  ownsByUid?: boolean;
  ownsByEmail?: boolean;
  pacienteHasUserId?: boolean;
  pacienteHasEmail?: boolean;
  userHasEmail?: boolean;
};

export function pacienteSelfGateUserMessage(reason: PacienteSelfGateReason): string {
  switch (reason) {
    case 'missing_authorization':
      return 'Faça login novamente para preparar sua assinatura.';
    case 'invalid_token':
      return 'Sua sessão expirou. Faça login novamente.';
    case 'paciente_not_found':
      return 'Cadastro de paciente não encontrado.';
    case 'paciente_ownership_mismatch':
    case 'paciente_fallback_not_found':
      return (
        'Esta conta não está vinculada ao paciente deste contrato. ' +
        'Entre com o mesmo e-mail usado no cadastro ou peça ajuda à clínica.'
      );
    case 'paciente_fallback_ambiguous':
      return 'Encontramos mais de um cadastro vinculado a esta conta. Entre em contato com sua equipe médica.';
  }
}

function gateFailResponse(reason: PacienteSelfGateReason, status: number): NextResponse {
  return NextResponse.json(
    { ok: false, error: pacienteSelfGateUserMessage(reason), reason },
    { status }
  );
}

function pacienteEmailFromData(data: Record<string, unknown>): string {
  const dadosId = data.dadosIdentificacao as { email?: string } | undefined;
  return String(dadosId?.email || data.email || '')
    .trim()
    .toLowerCase();
}

async function findPacientesByAuth(
  uid: string,
  userEmail: string
): Promise<{ ids: string[]; matchBy: Map<string, PacienteSelfGateMatchBy> }> {
  const db = getFirestoreAdmin();
  const col = db.collection('pacientes_completos');
  const byId = new Map<string, PacienteSelfGateMatchBy>();

  const uidSnap = await col.where('userId', '==', uid).get();
  for (const doc of uidSnap.docs) {
    byId.set(doc.id, 'uid');
  }

  if (userEmail) {
    const emailsToQuery = [...new Set([userEmail, (email || '').trim()].filter(Boolean))];
    for (const em of emailsToQuery) {
      const emailSnap = await col.where('email', '==', em).get();
      for (const doc of emailSnap.docs) {
        if (!byId.has(doc.id)) byId.set(doc.id, 'email');
      }

      const idEmailSnap = await col.where('dadosIdentificacao.email', '==', em).get();
      for (const doc of idEmailSnap.docs) {
        if (!byId.has(doc.id)) byId.set(doc.id, 'email');
      }
    }
  }

  return { ids: [...byId.keys()], matchBy: byId };
}

async function tryResolvePacienteIdFallback(args: {
  originalPacienteId: string;
  uid: string;
  userEmail: string;
  routeContext?: string;
}): Promise<
  | {
      ok: true;
      pacienteId: string;
      resolvedPacienteId: string;
      matchBy: PacienteSelfGateMatchBy;
    }
  | { ok: false; res: NextResponse; reason: PacienteSelfGateReason; userUid: string }
> {
  const { originalPacienteId, uid, userEmail, routeContext } = args;

  console.warn('[paciente_self_gate] fallback_attempt', {
    originalPacienteId,
    userUid: uid,
    routeContext,
    hasUserEmail: Boolean(userEmail),
  });

  const { ids, matchBy } = await findPacientesByAuth(uid, userEmail);

  if (ids.length === 0) {
    console.warn('[paciente_self_gate] fallback_not_found', {
      originalPacienteId,
      userUid: uid,
      routeContext,
    });
    return {
      ok: false,
      reason: 'paciente_fallback_not_found',
      userUid: uid,
      res: gateFailResponse('paciente_fallback_not_found', 403),
    };
  }

  if (ids.length > 1) {
    console.warn('[paciente_self_gate] fallback_ambiguous', {
      originalPacienteId,
      userUid: uid,
      routeContext,
      matchCount: ids.length,
    });
    return {
      ok: false,
      reason: 'paciente_fallback_ambiguous',
      userUid: uid,
      res: gateFailResponse('paciente_fallback_ambiguous', 409),
    };
  }

  const resolvedPacienteId = ids[0]!;
  const resolvedMatchBy = matchBy.get(resolvedPacienteId) || 'uid';

  console.warn('[paciente_self_gate] fallback_resolved', {
    originalPacienteId,
    resolvedPacienteId,
    matchBy: resolvedMatchBy,
    userUid: uid,
    routeContext,
  });

  return {
    ok: true,
    pacienteId: resolvedPacienteId,
    resolvedPacienteId,
    matchBy: resolvedMatchBy,
  };
}

export async function requirePacienteSelf(
  request: NextRequest,
  pacienteId: string,
  options?: RequirePacienteSelfOptions
): Promise<
  | {
      ok: true;
      uid: string;
      email: string | undefined;
      pacienteId: string;
      resolvedPacienteId?: string;
      matchBy?: PacienteSelfGateMatchBy;
    }
  | {
      ok: false;
      res: NextResponse;
      reason: PacienteSelfGateReason;
      userUid?: string;
      gate?: {
        ownsByUid?: boolean;
        ownsByEmail?: boolean;
        pacienteHasUserId?: boolean;
        pacienteHasEmail?: boolean;
        userHasEmail?: boolean;
      };
    }
> {
  const token = getBearerToken(request);
  if (!token) {
    return {
      ok: false,
      reason: 'missing_authorization',
      res: gateFailResponse('missing_authorization', 401),
    };
  }

  let uid: string;
  let email: string | undefined;
  try {
    const decoded = await getAuthAdmin().verifyIdToken(token);
    uid = decoded.uid;
    email = decoded.email;
  } catch {
    return {
      ok: false,
      reason: 'invalid_token',
      res: gateFailResponse('invalid_token', 401),
    };
  }

  const userEmail = (email || '').trim().toLowerCase();
  const enableFallback = options?.enablePacienteIdFallback === true;
  const routeContext = options?.routeContext;

  const db = getFirestoreAdmin();
  const pacSnap = await db.collection('pacientes_completos').doc(pacienteId).get();

  if (!pacSnap.exists) {
    if (enableFallback) {
      const fallback = await tryResolvePacienteIdFallback({
        originalPacienteId: pacienteId,
        uid,
        userEmail,
        routeContext,
      });
      if (!fallback.ok) return fallback;
      return {
        ok: true,
        uid,
        email,
        pacienteId: fallback.pacienteId,
        resolvedPacienteId: fallback.resolvedPacienteId,
        matchBy: fallback.matchBy,
      };
    }
    return {
      ok: false,
      reason: 'paciente_not_found',
      userUid: uid,
      res: gateFailResponse('paciente_not_found', 404),
    };
  }

  const pac = pacSnap.data() as Record<string, unknown>;
  const pacEmail = pacienteEmailFromData(pac);
  const ownsByUid = pac.userId === uid;
  const ownsByEmail = Boolean(userEmail && pacEmail && userEmail === pacEmail);

  if (!ownsByUid && !ownsByEmail) {
    if (enableFallback) {
      const fallback = await tryResolvePacienteIdFallback({
        originalPacienteId: pacienteId,
        uid,
        userEmail,
        routeContext,
      });
      if (!fallback.ok) return fallback;
      return {
        ok: true,
        uid,
        email,
        pacienteId: fallback.pacienteId,
        resolvedPacienteId: fallback.resolvedPacienteId,
        matchBy: fallback.matchBy,
      };
    }
    return {
      ok: false,
      reason: 'paciente_ownership_mismatch',
      userUid: uid,
      res: gateFailResponse('paciente_ownership_mismatch', 403),
      gate: {
        ownsByUid,
        ownsByEmail,
        pacienteHasUserId: Boolean(String(pac.userId || '').trim()),
        pacienteHasEmail: Boolean(pacEmail),
        userHasEmail: Boolean(userEmail),
      },
    };
  }

  return { ok: true, uid, email, pacienteId };
}

export function buildPacienteSelfGateDiagnostics(args: {
  request: NextRequest;
  pacienteId: string;
  documentoId?: string;
  routeContext: string;
  reason: PacienteSelfGateReason;
  userUid?: string;
  gate?: {
    ownsByUid?: boolean;
    ownsByEmail?: boolean;
    pacienteHasUserId?: boolean;
    pacienteHasEmail?: boolean;
    userHasEmail?: boolean;
  };
}): PacienteSelfGateDiagnostics {
  return {
    reason: args.reason,
    hasAuthorizationHeader: Boolean(getBearerToken(args.request)),
    hasPacienteId: Boolean(args.pacienteId.trim()),
    hasDocumentoId: args.documentoId ? Boolean(args.documentoId.trim()) : undefined,
    userUid: args.userUid,
    pacienteId: args.pacienteId,
    routeContext: args.routeContext,
    ownsByUid: args.gate?.ownsByUid,
    ownsByEmail: args.gate?.ownsByEmail,
    pacienteHasUserId: args.gate?.pacienteHasUserId,
    pacienteHasEmail: args.gate?.pacienteHasEmail,
    userHasEmail: args.gate?.userHasEmail,
  };
}

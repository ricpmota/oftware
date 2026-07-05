import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { isAnamneseInteligenteAtivoParaMedico } from '@/lib/meta/anamneseInteligenteGate';
import { gerarAnamneseInteligenciaComGemini } from '@/services/anamneseInteligenciaGeminiService';
import type { AnamneseInteligenteV3, PacienteCompleto } from '@/types/obesidade';

export const runtime = 'nodejs';
export const maxDuration = 60;

function pacientePertenceAoUsuario(
  paciente: Record<string, unknown>,
  uid: string,
  email: string | undefined
): boolean {
  const emailNorm = email?.toLowerCase().trim();
  if (paciente.userId === uid) return true;
  if (emailNorm && String(paciente.email || '').toLowerCase().trim() === emailNorm) return true;
  const dadosId = paciente.dadosIdentificacao as { email?: string } | undefined;
  if (emailNorm && String(dadosId?.email || '').toLowerCase().trim() === emailNorm) return true;
  return false;
}

async function medicoPodeAcessarPaciente(
  uid: string,
  email: string | undefined,
  paciente: Record<string, unknown>
): Promise<{ ok: boolean; iaAtivo: boolean }> {
  const db = getFirestoreAdmin();
  const medSnap = await db.collection('medicos').where('userId', '==', uid).limit(1).get();
  if (medSnap.empty) return { ok: false, iaAtivo: false };
  const medicoDoc = medSnap.docs[0];
  const medicoData = medicoDoc.data() as { email?: string; anamneseInteligenteAtivo?: boolean };
  const medicoId = medicoDoc.id;
  const responsavel = String(paciente.medicoResponsavelId || '').trim();
  const anterior = String(paciente.medicoResponsavelAnteriorId || '').trim();
  const vinculado =
    (responsavel && responsavel === medicoId) || (anterior && anterior === medicoId);
  if (!vinculado) return { ok: false, iaAtivo: false };
  const iaAtivo = isAnamneseInteligenteAtivoParaMedico({
    email: medicoData.email || email,
    anamneseInteligenteAtivo: medicoData.anamneseInteligenteAtivo,
  });
  return { ok: true, iaAtivo };
}

/**
 * POST /api/meta/anamnese-intelligence
 * Body: { pacienteId: string, idToken: string, paciente?: PacienteCompleto }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const pacienteId = typeof body.pacienteId === 'string' ? body.pacienteId.trim() : '';
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    const pacienteBody = body.paciente as PacienteCompleto | undefined;

    if (!pacienteId || !idToken) {
      return NextResponse.json({ error: 'pacienteId e idToken são obrigatórios.' }, { status: 400 });
    }

    const decoded = await getAuthAdmin().verifyIdToken(idToken);
    const db = getFirestoreAdmin();
    const pacienteRef = db.collection('pacientes_completos').doc(pacienteId);
    const pacienteSnap = await pacienteRef.get();

    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado.' }, { status: 404 });
    }

    const firestoreData = pacienteSnap.data()!;
    const isOwner = pacientePertenceAoUsuario(firestoreData, decoded.uid, decoded.email);
    const medicoAccess = await medicoPodeAcessarPaciente(decoded.uid, decoded.email, firestoreData);
    if (!isOwner && !medicoAccess.ok) {
      return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
    }
    if (!isOwner && medicoAccess.ok && !medicoAccess.iaAtivo) {
      return NextResponse.json(
        {
          error:
            'Análise inteligente não está ativa para sua conta. Solicite a liberação ao administrador do sistema.',
          code: 'ANAMNESE_IA_INATIVA',
        },
        { status: 403 }
      );
    }

    const pacienteParaIA: PacienteCompleto = {
      ...(pacienteBody || {}),
      ...firestoreData,
      id: pacienteId,
      dadosClinicos: {
        ...(firestoreData.dadosClinicos as object),
        ...(pacienteBody?.dadosClinicos || {}),
      },
    } as PacienteCompleto;

    let inteligencia: AnamneseInteligenteV3;
    try {
      inteligencia = await gerarAnamneseInteligenciaComGemini(pacienteParaIA);
    } catch (geminiErr) {
      const msg = geminiErr instanceof Error ? geminiErr.message : 'Falha ao gerar análise.';
      const isConfig = /não configurado|VERTEX|credenciais/i.test(msg);
      return NextResponse.json(
        { error: msg, code: isConfig ? 'GEMINI_NOT_CONFIGURED' : 'GEMINI_ERROR' },
        { status: isConfig ? 503 : 502 }
      );
    }

    const payload: AnamneseInteligenteV3 = {
      ...inteligencia,
      geradoEm: new Date(),
    };

    await pacienteRef.update({
      'dadosClinicos.anamneseInteligenteV3': {
        ...payload,
        geradoEm: FieldValue.serverTimestamp(),
      },
    });

    return NextResponse.json({ ok: true, anamneseInteligenteV3: payload });
  } catch (err) {
    console.error(
      '[anamnese-intelligence]',
      err instanceof Error ? err.message : 'Erro desconhecido'
    );
    const message = err instanceof Error ? err.message : 'Erro ao processar análise.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

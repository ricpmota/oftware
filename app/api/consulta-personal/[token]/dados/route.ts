import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_PERSONAL_TRAINERS } from '@/features/metaPersonal/metaPersonal.constants';
import { loadPersonalConsultaLinkByToken } from '@/lib/personal/agenda/consultaLinkService';
import { loadAvaliacaoTreinoPublic } from '@/lib/personal/agenda/avaliacaoTreinoPublicService';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';

function publicError(status: number, message: string) {
  return NextResponse.json({ valid: false, error: message }, { status });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return publicError(400, 'Este link não é válido.');
    }

    const link = await loadPersonalConsultaLinkByToken(token);
    if (!link || link.status === 'revoked') {
      return publicError(404, 'Este link não é válido.');
    }

    const db = getFirestoreAdmin();
    const [pacienteSnap, personalSnap, avaliacao] = await Promise.all([
      db.collection('pacientes_completos').doc(link.pacienteId).get(),
      db.collection(COL_PERSONAL_TRAINERS).doc(link.personalTrainerId).get(),
      loadAvaliacaoTreinoPublic(link.pacienteId),
    ]);

    if (!pacienteSnap.exists) {
      return publicError(404, 'Este link não é válido.');
    }

    const paciente = pacienteSnap.data() as {
      nome?: string;
      dadosIdentificacao?: { nomeCompleto?: string };
    };
    const patientName = paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || '';
    const personalName = String(personalSnap.data()?.nome || '').trim();

    return NextResponse.json({
      valid: true,
      patientName,
      personalName,
      needsAnamnese: avaliacao?.status !== 'completed',
      avaliacao,
    });
  } catch (error) {
    console.error('[consulta-personal/dados]', error);
    return publicError(500, 'Não foi possível abrir este link.');
  }
}

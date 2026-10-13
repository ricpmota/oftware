import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import { loadNutriConsultaLinkByToken } from '@/lib/nutri/agenda/consultaLinkService';
import { pacienteTemAnamneseNutricional } from '@/lib/nutri/agenda/saveAnamneseFromPublic';
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

    const link = await loadNutriConsultaLinkByToken(token);
    if (!link || link.status === 'revoked') {
      return publicError(404, 'Este link não é válido.');
    }

    const db = getFirestoreAdmin();
    const [pacienteSnap, nutriSnap, hasAnamnese] = await Promise.all([
      db.collection('pacientes_completos').doc(link.pacienteId).get(),
      db.collection(COL_NUTRICIONISTAS).doc(link.nutricionistaId).get(),
      pacienteTemAnamneseNutricional(link.pacienteId),
    ]);

    if (!pacienteSnap.exists) {
      return publicError(404, 'Este link não é válido.');
    }

    const paciente = pacienteSnap.data() as {
      nome?: string;
      dadosIdentificacao?: { nomeCompleto?: string };
    };
    const patientName = paciente?.dadosIdentificacao?.nomeCompleto || paciente?.nome || '';
    const nutritionistName = String(nutriSnap.data()?.nome || '').trim();

    return NextResponse.json({
      valid: true,
      patientName,
      nutritionistName,
      needsAnamnese: !hasAnamnese,
    });
  } catch (error) {
    console.error('[consulta-nutri/dados]', error);
    return publicError(500, 'Não foi possível abrir este link.');
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { WHITELABEL_LEAD_REQUIRED_KEYS } from '@/lib/whiteLabel/leadWhiteLabelQuestions';
import {
  isValidLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelInstagram,
  normalizeLeadWhiteLabelWhatsApp,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { buildInitialCrmFields, buildLeadScoreFields } from '@/lib/whiteLabel/leadCrmService';
import { recordLeadCreated } from '@/lib/whiteLabel/leadTimelineService';

const STRING_FIELDS = WHITELABEL_LEAD_REQUIRED_KEYS;

function asTrimmedString(value: unknown): string {
  if (value == null) return '';
  return String(value).trim();
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 });
    }

    const raw: Record<string, string> = {};
    for (const key of STRING_FIELDS) {
      raw[key] = asTrimmedString(body[key]);
    }

    const missing = STRING_FIELDS.filter((key) => !raw[key]);
    if (missing.length > 0) {
      return NextResponse.json(
        { error: 'Preencha todos os campos obrigatórios.', campos: missing },
        { status: 400 }
      );
    }

    const email = normalizeLeadWhiteLabelEmail(raw.email);
    if (!isValidLeadWhiteLabelEmail(email)) {
      return NextResponse.json({ error: 'E-mail inválido.' }, { status: 400 });
    }

    const whatsapp = normalizeLeadWhiteLabelWhatsApp(raw.whatsapp);
    if (!whatsapp || whatsapp.length < 12) {
      return NextResponse.json({ error: 'WhatsApp inválido.' }, { status: 400 });
    }

    const instagram = normalizeLeadWhiteLabelInstagram(raw.instagram);
    const scoreFields = buildLeadScoreFields(raw);

    const db = getFirestoreAdmin();
    const docRef = await db.collection('leadsWhiteLabel').add({
      nome: raw.nome,
      whatsapp,
      email,
      instagram,
      situacaoProfissional: raw.situacaoProfissional,
      objetivo3Anos: raw.objetivo3Anos,
      interesseReduzirPlantao: raw.interesseReduzirPlantao,
      interessePlataformaMarca: raw.interessePlataformaMarca,
      pacientesMes: raw.pacientesMes,
      realidadeAtual: raw.realidadeAtual,
      interesseExperienciaDigital: raw.interesseExperienciaDigital,
      familiaridadeTecnologia: raw.familiaridadeTecnologia,
      investimentoDisponivel: raw.investimentoDisponivel,
      prazoInicio: raw.prazoInicio,
      faturamentoEsperado: raw.faturamentoEsperado,
      origem: 'whitelabel',
      status: 'novo',
      ...scoreFields,
      ...buildInitialCrmFields(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await recordLeadCreated(docRef.id, raw.nome);

    return NextResponse.json({
      success: true,
      id: docRef.id,
      leadScore: scoreFields.leadScore,
      leadTemperatura: scoreFields.leadTemperatura,
    });
  } catch (error) {
    console.error('[API whitelabel/leads] Erro:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar lead.' },
      { status: 500 }
    );
  }
}

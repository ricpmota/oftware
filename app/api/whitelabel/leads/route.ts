import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { WHITELABEL_LEAD_REQUIRED_KEYS, mapProfissaoChoiceToValue } from '@/lib/whiteLabel/leadWhiteLabelQuestions';
import {
  isValidLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelEmail,
  normalizeLeadWhiteLabelInstagram,
} from '@/lib/whiteLabel/leadWhiteLabelNormalize';
import { persistWhiteLabelWhatsAppFromPayload } from '@/lib/whatsapp/resolveLeadPhone';
import { buildInitialCrmFields, buildLeadScoreFields } from '@/lib/whiteLabel/leadCrmService';
import { recordLeadCreated } from '@/lib/whiteLabel/leadTimelineService';
import { parseWhiteLabelProfissao } from '@/lib/whiteLabel/profissao';

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

    const whatsappPersist = persistWhiteLabelWhatsAppFromPayload(body);
    if (!whatsappPersist.ok) {
      return NextResponse.json({ error: whatsappPersist.error }, { status: 400 });
    }
    const { whatsapp, whatsappDdi, whatsappPais } = whatsappPersist.fields;

    const instagram = normalizeLeadWhiteLabelInstagram(raw.instagram);
    const scoreFields = buildLeadScoreFields(raw);
    const profissaoFromChoice = mapProfissaoChoiceToValue(asTrimmedString(body.profissao));
    const profissao = parseWhiteLabelProfissao(profissaoFromChoice || body.profissao, 'medico');
    const origemCampanha = asTrimmedString(body.origemCampanha);

    const db = getFirestoreAdmin();
    const docRef = await db.collection('leadsWhiteLabel').add({
      nome: raw.nome,
      whatsapp,
      ...(whatsappDdi ? { whatsappDdi, ...(whatsappPais ? { whatsappPais } : {}) } : {}),
      email,
      instagram,
      profissao,
      ...(origemCampanha ? { origemCampanha } : {}),
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

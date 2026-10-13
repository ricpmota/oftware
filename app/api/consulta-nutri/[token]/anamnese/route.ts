import { NextRequest, NextResponse } from 'next/server';
import { loadNutriConsultaLinkByToken } from '@/lib/nutri/agenda/consultaLinkService';
import { savePublicNutriAnamnese } from '@/lib/nutri/agenda/saveAnamneseFromPublic';
import { isValidPublicLinkToken, normalizePublicLinkToken } from '@/lib/publicLinks/publicLinkToken';
import { INTENSIDADE_DESEJADA_PADRAO, type AnamneseWizardInput } from '@/lib/nutri/anamneseNutricional';

function asString<T extends string>(value: unknown, fallback: T): T {
  return typeof value === 'string' && value ? (value as T) : fallback;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 400 });
    }
    const link = await loadNutriConsultaLinkByToken(token);
    if (!link || link.status === 'revoked') {
      return NextResponse.json({ error: 'Este link não é válido.' }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ error: 'Preencha a anamnese.' }, { status: 400 });
    }

    const wizard: AnamneseWizardInput = {
      objetivoPrincipal: asString(body.objetivoPrincipal, 'perda_peso'),
      intensidadeDesejada: asString(body.intensidadeDesejada, INTENSIDADE_DESEJADA_PADRAO),
      horarioTrabalho: asString(body.horarioTrabalho, 'diurno'),
      horasSentado: asString(body.horasSentado, '4-8h'),
      dietaUltimos12Meses: asString(body.dietaUltimos12Meses, 'nao'),
      tipoDieta: typeof body.tipoDieta === 'string' ? body.tipoDieta : '',
      efeitoSanfona: asString(body.efeitoSanfona, 'nao'),
      kgSanfona: typeof body.kgSanfona === 'number' ? body.kgSanfona : undefined,
      pesoMaximo2Anos: typeof body.pesoMaximo2Anos === 'number' ? body.pesoMaximo2Anos : undefined,
      pesoMinimo2Anos: typeof body.pesoMinimo2Anos === 'number' ? body.pesoMinimo2Anos : undefined,
      fomeMatinal: typeof body.fomeMatinal === 'number' ? body.fomeMatinal : 5,
      fomeNoturna: typeof body.fomeNoturna === 'number' ? body.fomeNoturna : 5,
      vontadeDoce: typeof body.vontadeDoce === 'number' ? body.vontadeDoce : 5,
      pulaCafeManha: Boolean(body.pulaCafeManha),
      chegaComMuitaFomeJantar: Boolean(body.chegaComMuitaFomeJantar),
      atividadeFisica: asString(body.atividadeFisica, 'nunca'),
      sonoHoras: asString(body.sonoHoras, '6-8h'),
      horarioDormir: asString(body.horarioDormir, '22-00'),
      acordaDescansado: asString(body.acordaDescansado, 'as_vezes'),
      numeroRefeicoesDia: asString(body.numeroRefeicoesDia, '4-5'),
      comportamentosAlimentares: Array.isArray(body.comportamentosAlimentares)
        ? body.comportamentosAlimentares.map(String)
        : [],
      fomeEmocional: Boolean(body.fomeEmocional),
      compulsaoNoturna: Boolean(body.compulsaoNoturna),
      dosesAlcoolSemana: asString(body.dosesAlcoolSemana, '0'),
      finalSemanaSaiDieta: asString(body.finalSemanaSaiDieta, 'quase_nunca'),
      restricoes: Array.isArray(body.restricoes) ? body.restricoes.map(String) : [],
      preferenciasProteina: Array.isArray(body.preferenciasProteina)
        ? body.preferenciasProteina.map(String)
        : [],
      sintomasGI: asString(body.sintomasGI, 'nenhum'),
    };

    await savePublicNutriAnamnese(link.pacienteId, wizard);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[consulta-nutri/anamnese]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao salvar anamnese.' },
      { status: 400 }
    );
  }
}

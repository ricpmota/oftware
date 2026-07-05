import { NextRequest, NextResponse } from 'next/server';
import {
  checkDomainAvailability,
  searchDomainAvailability,
} from '@/lib/whiteLabel/cadastroMedicoDomainCheck';

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as {
      dominioDesejado?: string;
      extensaoDominio?: string;
      nome?: string;
      sobrenome?: string;
      nomeMarca?: string;
      searchAll?: boolean;
    } | null;

    const dominioDesejado = typeof body?.dominioDesejado === 'string' ? body.dominioDesejado.trim() : '';
    if (!dominioDesejado) {
      return NextResponse.json({ error: 'Informe o domínio desejado.' }, { status: 400 });
    }

    if (body?.searchAll) {
      const search = await searchDomainAvailability({
        dominioDesejado,
        nome: body?.nome,
        sobrenome: body?.sobrenome,
        nomeMarca: body?.nomeMarca,
      });
      return NextResponse.json({ success: true, ...search });
    }

    const extensaoDominio = body?.extensaoDominio?.trim() || '.com.br';
    const result = await checkDomainAvailability({
      dominioDesejado,
      extensaoDominio,
      nome: body?.nome,
      sobrenome: body?.sobrenome,
      nomeMarca: body?.nomeMarca,
    });

    return NextResponse.json({
      status: result.status,
      suggestions: result.suggestions,
      dominioDesejado,
      extensaoDominio,
      fqdn: result.fqdn,
      wwwUrl: result.wwwUrl,
      source: result.source,
      providerStatus: result.providerStatus,
      providerStatusCode: result.providerStatusCode,
    });
  } catch (error) {
    console.error('[API whitelabel/cadastromedico/verificar-dominio] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao verificar domínio.' },
      { status: 500 }
    );
  }
}

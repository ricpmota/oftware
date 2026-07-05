import { NextRequest, NextResponse } from 'next/server';
import {
  atualizarCenarioSelecionadoPlano,
  buscarPlanoPorIdComToken,
  enriquecerConfiguracaoComercialPlano,
  sanitizarPlanoParaPublico,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import { carregarPlanoTerapeuticoPdfContext } from '@/lib/server/planoTerapeuticoPdfContext.server';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';
import type { OrganizationId } from '@/lib/organization/organizationTypes';
import { resolveOrganizationShellLogoUrl } from '@/lib/organization/resolveOrganizationShellLogoUrl';
import type { CenarioPlanoTipo } from '@/types/planoTerapeuticoInterativo';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CENARIOS_VALIDOS = new Set<CenarioPlanoTipo>([
  'progressivo',
  'equilibrado',
  'intensivo',
]);

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
  try {
    const { orcamentoId } = await context.params;
    const token = request.nextUrl.searchParams.get('t')?.trim();
    if (!orcamentoId || !token) {
      return NextResponse.json({ ok: false, error: 'Acesso inválido.' }, { status: 400 });
    }

    const doc = await buscarPlanoPorIdComToken(orcamentoId, token);
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    const docComConfig = await enriquecerConfiguracaoComercialPlano(doc);

    const organizationId = (docComConfig.organizationId ?? METODO_ORGANIZATION_ID) as OrganizationId;
    let brandingPublico: { publicName: string; logoUrl: string } | null = null;
    try {
      const branding = await getOrganizationBranding(organizationId);
      brandingPublico = {
        publicName: branding.publicName,
        logoUrl: resolveOrganizationShellLogoUrl(branding, { darkBackground: false }),
      };
    } catch {
      brandingPublico = null;
    }

    const pdfContext = await carregarPlanoTerapeuticoPdfContext({
      pacienteId: docComConfig.pacienteId,
      medicoId: docComConfig.medicoId,
      organizationId: docComConfig.organizationId,
      metaDescricao: docComConfig.contextoPaciente.metaDescricao,
    });

    return NextResponse.json({
      ok: true,
      plano: sanitizarPlanoParaPublico(docComConfig),
      branding: brandingPublico,
      pdfContext: {
        pacienteNome: pdfContext.pacienteNome,
        pacienteCpf: pdfContext.pacienteCpf,
        pacienteDataNascimento: pdfContext.pacienteDataNascimento,
        pacienteSexo: pdfContext.pacienteSexo,
        metaDescricao: pdfContext.metaDescricao,
        medico: pdfContext.medico,
        organizationBranding: pdfContext.organizationBranding,
      },
    });
  } catch (error) {
    console.error('[plano-terapeutico/GET] Falha:', error);
    return NextResponse.json({ ok: false, error: 'Falha ao carregar plano.' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orcamentoId: string }> }
) {
  try {
    const { orcamentoId } = await context.params;
    const token = request.nextUrl.searchParams.get('t')?.trim();
    if (!orcamentoId || !token) {
      return NextResponse.json({ ok: false, error: 'Acesso inválido.' }, { status: 400 });
    }

    const body = (await request.json().catch(() => null)) as {
      cenarioSelecionado?: CenarioPlanoTipo;
    } | null;

    const cenario = body?.cenarioSelecionado;
    if (!cenario || !CENARIOS_VALIDOS.has(cenario)) {
      return NextResponse.json({ ok: false, error: 'Dados inválidos.' }, { status: 400 });
    }

    const doc = await buscarPlanoPorIdComToken(orcamentoId, token);
    if (!doc) {
      return NextResponse.json({ ok: false, error: 'Plano não encontrado.' }, { status: 404 });
    }

    const plano = await atualizarCenarioSelecionadoPlano(
      doc.pacienteId,
      orcamentoId,
      token,
      cenario
    );
    if (!plano) {
      return NextResponse.json({ ok: false, error: 'Não foi possível atualizar.' }, { status: 400 });
    }

    return NextResponse.json({ ok: true, plano });
  } catch (error) {
    console.error('[plano-terapeutico/PATCH] Falha:', error);
    return NextResponse.json({ ok: false, error: 'Falha ao atualizar plano.' }, { status: 500 });
  }
}

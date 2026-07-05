import { NextRequest, NextResponse } from 'next/server';

import { requirePacienteSelf } from '@/lib/server/requirePacienteSelfGate';

import { buscarPlanoAtivoPaciente } from '@/lib/server/planoTerapeuticoInterativoStore';

import { buildPlanoTerapeuticoPublicUrl } from '@/lib/server/planoTerapeuticoPublicUrl';

import { METODO_ORGANIZATION_ID } from '@/lib/organization/organizationRegistry';

import type { OrganizationId } from '@/lib/organization/organizationTypes';

import { planoPacienteJaAssinou } from '@/lib/planoTerapeutico/planoTerapeuticoStatusUi';



export const runtime = 'nodejs';



type Body = {

  pacienteId?: string;

};



export async function POST(request: NextRequest) {

  try {

    const body = (await request.json().catch(() => null)) as Body | null;

    const pacienteId = body?.pacienteId?.trim() ?? '';

    if (!pacienteId) {

      return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });

    }



    const gate = await requirePacienteSelf(request, pacienteId);

    if (!gate.ok) return gate.res;



    const plano = await buscarPlanoAtivoPaciente(pacienteId);

    if (!plano) {

      return NextResponse.json({ ok: false, error: 'Nenhuma proposta disponível.' }, { status: 404 });

    }



    const publicUrl =

      plano.publicUrl?.trim() ||

      (await buildPlanoTerapeuticoPublicUrl(

        (plano.organizationId ?? METODO_ORGANIZATION_ID) as OrganizationId,

        plano.id,

        plano.publicAccessToken

      ));



    const assinado = planoPacienteJaAssinou(plano);

    const pdfAssinadoUrl =

      plano.pdfFinalAssinadoUrl?.trim() ||

      plano.pdfAssinadoMedicoUrl?.trim() ||

      (assinado ? plano.pdfUrl?.trim() : null) ||

      null;



    return NextResponse.json({

      ok: true,

      orcamentoId: plano.id,

      publicUrl,

      assinado,

      pdfAssinadoUrl,

      plano: {

        id: plano.id,

        status: plano.status,

        escolhaPaciente: plano.escolhaPaciente,

        escolhaPacienteEm: plano.escolhaPacienteEm,

        acceptedAt: plano.acceptedAt,

        pacienteAssinaturaNome: plano.pacienteAssinaturaNome,

        pacienteSignStatus: plano.pacienteSignStatus,

        pdfFinalAssinadoUrl: plano.pdfFinalAssinadoUrl,

        valorTotal: plano.valorTotal,

      },

    });

  } catch (error) {

    console.error('[meta/plano-terapeutico/access] Falha:', error);

    return NextResponse.json({ ok: false, error: 'Falha ao carregar plano.' }, { status: 500 });

  }

}


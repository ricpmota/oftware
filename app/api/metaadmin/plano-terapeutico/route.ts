import { NextRequest, NextResponse } from 'next/server';
import { requireMedicoPacienteMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import {
  criarPlanoTerapeuticoRascunho,
  extrairPrimeiroNome,
} from '@/lib/server/planoTerapeuticoInterativoStore';
import { gerarCenariosPlanoTerapeutico } from '@/lib/metaadmin/planoTerapeuticoInterativoEngine';
import type { EstimativaPlanoInicialV1, OrigemEstimativaOrcamento } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { snapshotConfiguracaoComercialParaPlano } from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { getOrcamentoTerapeuticoConfigByMedico } from '@/lib/server/orcamentoTerapeuticoConfig.server';
import {
  requestHostFromNextRequest,
  resolveOrganizationIdForPlano,
} from '@/lib/server/planoTerapeuticoPublicUrl';

export const runtime = 'nodejs';

type Body = {
  pacienteId?: string;
  organizationId?: string | null;
  metaKg?: number | null;
  metaPercentual?: number | null;
  pesoAtual?: number | null;
  pesoInicial?: number | null;
  metaDescricao?: string;
  nomePaciente?: string;
  estimativaEquilibrada?: EstimativaPlanoInicialV1;
  origemEstimativaEquilibrada?: OrigemEstimativaOrcamento;
  descontoManual?: number;
};

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json().catch(() => null)) as Body | null;
    const pacienteId = body?.pacienteId?.trim();
    if (!pacienteId) {
      return NextResponse.json({ ok: false, error: 'pacienteId é obrigatório.' }, { status: 400 });
    }
    if (!body?.estimativaEquilibrada) {
      return NextResponse.json(
        { ok: false, error: 'estimativaEquilibrada é obrigatória.' },
        { status: 400 }
      );
    }

    const gate = await requireMedicoPacienteMetaadmin(request, pacienteId);
    if (!gate.ok) return gate.res;

    const medicoId = gate.medicoDocId;
    const organizationId = await resolveOrganizationIdForPlano(request, medicoId);
    const requestHost = requestHostFromNextRequest(request);

    const configSalva = await getOrcamentoTerapeuticoConfigByMedico(medicoId);
    if (!configSalva || configSalva.valorPorMg <= 0) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Configure e salve os valores padrão do orçamento antes de gerar o plano.',
        },
        { status: 400 }
      );
    }
    const config = configSalva;
    const descontoManual = Math.max(0, Number(body.descontoManual) || 0);

    const cenarios = gerarCenariosPlanoTerapeutico({
      metaKg: body.metaKg ?? null,
      metaPercentual: body.metaPercentual ?? null,
      pesoAtual: body.pesoAtual ?? null,
      pesoInicial: body.pesoInicial ?? null,
      estimativaEquilibrada: body.estimativaEquilibrada,
      config,
      descontoManual,
    });

    const nome = body.nomePaciente?.trim() || 'Paciente';
    const resultado = await criarPlanoTerapeuticoRascunho({
      pacienteId,
      medicoId,
      organizationId,
      requestHost,
      contextoPaciente: {
        nomeExibicao: extrairPrimeiroNome(nome),
        pesoAtualKg: body.pesoAtual ?? null,
        pesoInicialKg: body.pesoInicial ?? null,
        metaDescricao: body.metaDescricao?.trim() || 'Meta de perda de peso',
        metaKg: body.metaKg ?? null,
        metaPercentual: body.metaPercentual ?? null,
      },
      metaKg: body.metaKg ?? null,
      metaPercentual: body.metaPercentual ?? null,
      estimativaEquilibrada: body.estimativaEquilibrada,
      origemEstimativaEquilibrada: body.origemEstimativaEquilibrada ?? 'v2_deterministica',
      config,
      descontoManual,
      cenarios,
    });

    return NextResponse.json({ ok: true, ...resultado });
  } catch (error) {
    console.error('[metaadmin/plano-terapeutico] Falha:', error);
    return NextResponse.json(
      { ok: false, error: 'Falha ao gerar página do plano.' },
      { status: 500 }
    );
  }
}

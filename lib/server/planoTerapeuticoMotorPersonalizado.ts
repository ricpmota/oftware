import { gerarCenariosPlanoTerapeutico } from '@/lib/metaadmin/planoTerapeuticoInterativoEngine';
import {
  aplicarAnaliseOiNaEstimativa,
  calcularEstimativaPlanoInicialV2,
  configuracaoComercialFromPlanoSalvo,
  type ContextoOrcamentoPaciente,
  type OrigemEstimativaOrcamento,
} from '@/lib/metaadmin/orcamentoTerapeuticoUtils';
import { executarAnalisePacienteOi } from '@/lib/oi/analisarPacienteHandler';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buscarPlanoPorIdComToken, enriquecerConfiguracaoComercialPlano } from '@/lib/server/planoTerapeuticoInterativoStore';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type { PlanoTerapeuticoInterativoDocumento } from '@/types/planoTerapeuticoInterativo';

function contextoOrcamentoDoPlano(
  doc: PlanoTerapeuticoInterativoDocumento
): ContextoOrcamentoPaciente {
  const cp = doc.contextoPaciente;
  return {
    nome: cp.nomeExibicao,
    pesoInicial: cp.pesoInicialKg,
    pesoAtual: cp.pesoAtualKg,
    metaDescricao: cp.metaDescricao,
    kgDesejados: cp.metaKg ?? doc.metaKg,
    percentualDesejado: cp.metaPercentual ?? doc.metaPercentual,
    imcInicial: null,
    imcAtual: null,
    medicamento: null,
    statusTratamento: null,
    adesaoMedia: null,
    numeroAplicacoesHistorico: 0,
  };
}

function configComercialDoPlano(
  doc: PlanoTerapeuticoInterativoDocumento
): OrcamentoTerapeuticoConfig {
  return configuracaoComercialFromPlanoSalvo(doc.configuracaoComercialUsada);
}

export async function resolverMotorPersonalizadoPlano(
  orcamentoId: string,
  token: string
): Promise<
  | {
      ok: true;
      cenarios: PlanoTerapeuticoInterativoDocumento['cenarios'];
      origemEstimativaEquilibrada: OrigemEstimativaOrcamento;
    }
  | { ok: false; status: number; error: string }
> {
  const docRaw = await buscarPlanoPorIdComToken(orcamentoId, token);
  if (!docRaw) {
    return { ok: false, status: 404, error: 'Plano não encontrado.' };
  }
  const doc = await enriquecerConfiguracaoComercialPlano(docRaw);

  const contexto = contextoOrcamentoDoPlano(doc);
  const estV2 = calcularEstimativaPlanoInicialV2(contexto);
  const config = configComercialDoPlano(doc);

  const oiResult = await executarAnalisePacienteOi(doc.pacienteId, {
    fetchPacienteRaw: async (pacienteId) => {
      const snap = await getFirestoreAdmin()
        .collection('pacientes_completos')
        .doc(pacienteId)
        .get();
      if (!snap.exists) return null;
      return snap.data() as Record<string, unknown>;
    },
  });

  let estimativa = estV2;
  if (oiResult.ok) {
    estimativa = aplicarAnaliseOiNaEstimativa(estV2, oiResult.analysis, contexto);
  }

  const origemEstimativaEquilibrada: OrigemEstimativaOrcamento =
    estimativa.origemEstimativa ?? 'v2_deterministica';

  const cenarios = gerarCenariosPlanoTerapeutico({
    metaKg: doc.metaKg,
    metaPercentual: doc.metaPercentual,
    pesoAtual: contexto.pesoAtual,
    pesoInicial: contexto.pesoInicial,
    estimativaEquilibrada: estimativa,
    config,
    descontoManual: doc.descontoManual,
  });

  return { ok: true, cenarios, origemEstimativaEquilibrada };
}

import { PLANO_PERSONALIZADO_CARD } from '@/lib/treatment-negotiation/constants';
import type {
  DoseSemanalEditavel,
  InvestimentoManualNegociado,
  ParametrosPlanoPersonalizadoEditavel,
} from '@/lib/treatment-negotiation/types';
import type { PlanoTratamentoUnificado } from '@/lib/treatment-designer/types';
import type { OrcamentoTerapeuticoConfig } from '@/types/orcamentoTerapeuticoConfig';
import type { ModalidadePlanoAutomaticoId } from '@/lib/treatment-negotiation/types';

export function numerosParaDosesSemanais(doses: number[]): DoseSemanalEditavel[] {
  return doses.map((doseMg, i) => ({
    semana: i + 1,
    doseMg,
    observacao: '',
  }));
}

export function dosesSemanaisParaNumeros(items: DoseSemanalEditavel[]): number[] {
  return items.map((d) => Math.max(0, d.doseMg));
}

export function investimentoVazio(
  descontoManual = 0,
  valorPorMg: number | null = null
): InvestimentoManualNegociado {
  return {
    valorPorMg,
    valorMedicacao: null,
    valorConsultas: null,
    valorBioimpedancias: null,
    valorExames: null,
    outrosCustos: null,
    margem: null,
    descontoReais: descontoManual,
    descontoPercentual: 0,
    valorFinalManual: null,
  };
}

export function clonarParametros(
  p: ParametrosPlanoPersonalizadoEditavel
): ParametrosPlanoPersonalizadoEditavel {
  return {
    ...p,
    investimento: { ...p.investimento },
    dosesSemanais: p.dosesSemanais.map((d) => ({ ...d })),
    parcelamento: p.parcelamento ? { ...p.parcelamento } : null,
  };
}

export function criarParametrosDePlanoBase(args: {
  modalidadeBase: ModalidadePlanoAutomaticoId;
  planoBase: PlanoTratamentoUnificado;
  doseMensalMg: number;
  ritmoEscalonamento: ParametrosPlanoPersonalizadoEditavel['ritmoEscalonamento'];
  descontoManual: number;
  pesoAtualKg: number | null;
  metaPercentual: number | null;
  config: OrcamentoTerapeuticoConfig;
}): ParametrosPlanoPersonalizadoEditavel {
  const { planoBase, config } = args;
  const peso = args.pesoAtualKg;
  const meta = planoBase.perdaPrevistaKg;
  const pesoAlvo =
    peso != null && meta > 0 ? Math.round((peso - meta) * 10) / 10 : null;
  const pct =
    args.metaPercentual ??
    (peso != null && peso > 0 && meta > 0
      ? Math.round((meta / peso) * 1000) / 10
      : null);

  const hoje = new Date();
  const inicio = hoje.toISOString().slice(0, 10);
  const termino = new Date(hoje);
  termino.setDate(termino.getDate() + planoBase.estimativa.duracaoSemanas * 7);
  const fim = termino.toISOString().slice(0, 10);

  return {
    modalidadeBase: args.modalidadeBase,
    modoEditor: 'editar_tudo',
    modoRecalculo: 'automatico',
    nomePlano: PLANO_PERSONALIZADO_CARD.titulo,
    descricaoCurta: PLANO_PERSONALIZADO_CARD.subtitulo,
    observacoesMedico: '',
    pesoAtualKg: peso,
    metaKg: meta,
    pesoAlvoKg: pesoAlvo,
    percentualEstimado: pct,
    semanasPrazo: planoBase.estimativa.duracaoSemanas,
    mesesPrazo: planoBase.estimativa.duracaoMeses,
    dataInicioEstimada: inicio,
    dataTerminoEstimada: fim,
    doseMensalMg: args.doseMensalMg,
    ritmoEscalonamento: args.ritmoEscalonamento,
    dosesSemanais: numerosParaDosesSemanais(planoBase.dosesSemanais),
    aplicacoesTotal: planoBase.estimativa.numeroAplicacoes,
    aplicacoesFrequencia: 'Semanal',
    custoPorKit: config.valorPorKitAplicacao,
    consultas: planoBase.estimativa.consultasIncluidas,
    consultasFrequencia: 'Conforme plano',
    consultasValorUnitario: config.valorPorConsulta,
    consultasValorTotalManual: null,
    bioimpedancias: planoBase.estimativa.bioimpedanciasIncluidas,
    bioFrequencia: 'Semanal',
    bioValorUnitario: config.valorPorBioimpedancia,
    bioValorTotalManual: null,
    exames: planoBase.estimativa.examesIncluidos,
    examesDescricao: '',
    examesValorUnitario: config.valorPorExame,
    examesValorTotalManual: null,
    consolidacaoHabilitada: planoBase.fases.some((f) => f.id === 'consolidacao'),
    consolidacaoSemanas: 4,
    estrategiaPosMeta: 'nao_definido',
    consolidacaoObservacao: '',
    investimento: investimentoVazio(args.descontoManual, args.config.valorPorMg),
    observacoes: '',
    descontoManual: args.descontoManual,
    parcelamento: null,
  };
}

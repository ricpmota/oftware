/**
 * Perda de peso prevista em pacotes (mensal / trimestral / semestral)
 * com base no banco estatístico OI — não na meta cadastrada do paciente.
 */
import {
  determinarFaixaMeta,
  faixaMetaParaChaveBenchmark,
} from '@/lib/oi/OIHelpers';
import type { ModalidadePlanoId } from '@/lib/planoTerapeutico/modalidadesPlano';
import {
  limitarPerdaKgAoTeto,
  PERDA_PONDERAL_MAX_PERCENTUAL,
  resolverMetaPerdaComLimite,
} from '@/lib/planoTerapeutico/limitePerdaPonderal';
import benchmarksEstaticos from '@/data/oi/weight_loss_benchmarks.json';

type BenchmarkFaixa = {
  n: number;
  dadosInsuficientes: boolean;
  perdaKgMedia: number | null;
  perdaPercentualMedia: number | null;
  semanasMedia: number | null;
};

type BenchmarksFile = { faixas: Record<string, BenchmarkFaixa> };

const BENCHMARKS = benchmarksEstaticos as BenchmarksFile;

function arredondar1(n: number): number {
  return Math.round(n * 10) / 10;
}

const SEMANAS_MENSAL = 4;

export type FontePerdaPacote = 'oi_benchmark' | 'v2_percentual_peso' | 'meta_personalizada';

export type PerdaPrevistaPacoteInput = {
  modalidade: ModalidadePlanoId;
  duracaoSemanas: number;
  pesoAtualKg: number | null;
  metaPacienteKg: number | null;
  metaPercentual: number | null;
};

export type PerdaPrevistaPacoteResult = {
  perdaPrevistaKg: number;
  perdaSemanalKg: number;
  metaPacienteKg: number | null;
  metaSuperiorAoPrevisto: boolean;
  usaMetaPacienteNaCurva: boolean;
  fontePerda: FontePerdaPacote;
  pacientesSemelhantes: number | null;
};

function obterBenchmarkFaixa(chave: string): BenchmarkFaixa | null {
  return BENCHMARKS.faixas[chave] ?? null;
}

function semanasFixasModalidade(modalidade: ModalidadePlanoId): number {
  if (modalidade === 'mensal') return SEMANAS_MENSAL;
  if (modalidade === 'trimestral') return 12;
  if (modalidade === 'semestral') return 24;
  return SEMANAS_MENSAL;
}

function estimarPerdaBenchmark(
  duracaoSemanas: number,
  pesoAtualKg: number | null,
  metaPercentual: number | null
): {
  perdaKg: number;
  pacientesSemelhantes: number | null;
  fonte: FontePerdaPacote;
} {
  const faixa = determinarFaixaMeta(metaPercentual);
  const chave = faixaMetaParaChaveBenchmark(faixa);
  const benchmark = chave ? obterBenchmarkFaixa(chave) : null;

  const semanasRef = benchmark?.semanasMedia ?? null;
  const perdaRefKg = benchmark?.perdaKgMedia ?? null;
  const perdaRefPct = benchmark?.perdaPercentualMedia ?? null;
  const n = benchmark?.n ?? null;

  if (benchmark && semanasRef != null && semanasRef > 0 && perdaRefKg != null && perdaRefKg > 0) {
    const fator = duracaoSemanas / semanasRef;
    return {
      perdaKg: arredondar1(perdaRefKg * fator),
      pacientesSemelhantes: n,
      fonte: 'oi_benchmark',
    };
  }

  if (
    benchmark &&
    perdaRefPct != null &&
    perdaRefPct > 0 &&
    pesoAtualKg != null &&
    pesoAtualKg > 0 &&
    semanasRef != null &&
    semanasRef > 0
  ) {
    const perdaTotalRef = (pesoAtualKg * perdaRefPct) / 100;
    const fator = duracaoSemanas / semanasRef;
    return {
      perdaKg: arredondar1(perdaTotalRef * fator),
      pacientesSemelhantes: n,
      fonte: 'oi_benchmark',
    };
  }

  if (pesoAtualKg != null && pesoAtualKg > 0 && metaPercentual != null && metaPercentual > 0) {
    const pctEfetivo = Math.min(metaPercentual, PERDA_PONDERAL_MAX_PERCENTUAL);
    const perdaAnualizada = (pesoAtualKg * pctEfetivo) / 100;
    const semanasAno = 52;
    const perdaKg = arredondar1(perdaAnualizada * (duracaoSemanas / semanasAno) * 2.5);
    return {
      perdaKg: Math.max(0.5, perdaKg),
      pacientesSemelhantes: n,
      fonte: 'v2_percentual_peso',
    };
  }

  const ref = obterBenchmarkFaixa('10_a_15');
  if (
    ref?.perdaKgMedia != null &&
    ref.perdaKgMedia > 0 &&
    ref.semanasMedia != null &&
    ref.semanasMedia > 0
  ) {
    return {
      perdaKg: arredondar1(ref.perdaKgMedia * (duracaoSemanas / ref.semanasMedia)),
      pacientesSemelhantes: ref.n,
      fonte: 'oi_benchmark',
    };
  }

  const perdaKg = arredondar1(0.73 * duracaoSemanas);
  return {
    perdaKg: Math.max(0.1, perdaKg),
    pacientesSemelhantes: n,
    fonte: 'oi_benchmark',
  };
}

export function estimarPerdaPrevistaPacote(
  input: PerdaPrevistaPacoteInput
): PerdaPrevistaPacoteResult {
  const { modalidade, pesoAtualKg, metaPacienteKg, metaPercentual } = input;
  const duracaoSemanas = semanasFixasModalidade(modalidade);

  if (modalidade === 'personalizado') {
    const resolvida = resolverMetaPerdaComLimite(
      pesoAtualKg,
      metaPacienteKg,
      metaPercentual
    );
    const perda = resolvida.perdaEfetivaKg;
    const semanas = Math.max(1, input.duracaoSemanas);
    return {
      perdaPrevistaKg: perda,
      perdaSemanalKg: arredondar1(perda / semanas),
      metaPacienteKg: resolvida.metaPacienteKg,
      metaSuperiorAoPrevisto: resolvida.possuiFaseManutencao,
      usaMetaPacienteNaCurva: true,
      fontePerda: 'meta_personalizada',
      pacientesSemelhantes: null,
    };
  }

  const bench = estimarPerdaBenchmark(duracaoSemanas, pesoAtualKg, metaPercentual);
  const perdaPrevistaKg = limitarPerdaKgAoTeto(
    pesoAtualKg,
    Math.max(0.1, bench.perdaKg)
  );
  const perdaSemanalKg = arredondar1(perdaPrevistaKg / duracaoSemanas);
  const metaResolvida = resolverMetaPerdaComLimite(
    pesoAtualKg,
    metaPacienteKg,
    metaPercentual
  );
  const metaSuperior = metaResolvida.possuiFaseManutencao;

  return {
    perdaPrevistaKg,
    perdaSemanalKg,
    metaPacienteKg,
    metaSuperiorAoPrevisto: metaSuperior,
    usaMetaPacienteNaCurva: false,
    fontePerda: bench.fonte,
    pacientesSemelhantes: bench.pacientesSemelhantes,
  };
}

export { semanasFixasModalidade, SEMANAS_MENSAL };

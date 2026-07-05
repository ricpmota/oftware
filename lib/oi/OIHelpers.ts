/**
 * Funções puras da OI — segmentação, confiabilidade e intervalos.
 * Sem I/O, sem benchmarks, sem dependência de React ou Firestore.
 */
import type { PacienteCompleto } from '@/types/obesidade';
import {
  FaixaEtaria,
  FaixaIMC,
  FaixaMeta,
  FaixaPeso,
  OIConfiabilidade,
  type OIPerfilPaciente,
} from '@/types/oi';
import { roundMetaHalfStep } from '@/utils/metaadminMetasUiSteps';

export type IntervaloEstimado = {
  estimado: number | null;
  minimo: number | null;
  maximo: number | null;
};

/** Limiares de confiabilidade — isolados para substituição futura. */
export const OI_CONFIABILIDADE_LIMITES = {
  minimoConfiavel: 30,
  media: 100,
  alta: 500,
} as const;

export function determinarFaixaIMC(imc: number | null | undefined): FaixaIMC {
  if (imc == null || imc <= 0 || !Number.isFinite(imc)) return FaixaIMC.NaoInformado;
  if (imc < 27) return FaixaIMC.Abaixo27;
  if (imc < 30) return FaixaIMC.Imc27_30;
  if (imc < 35) return FaixaIMC.Imc30_35;
  if (imc < 40) return FaixaIMC.Imc35_40;
  return FaixaIMC.ImcAcima40;
}

export function determinarFaixaPeso(pesoKg: number | null | undefined): FaixaPeso {
  if (pesoKg == null || pesoKg <= 0 || !Number.isFinite(pesoKg)) return FaixaPeso.NaoInformado;
  if (pesoKg < 80) return FaixaPeso.Ate80;
  if (pesoKg <= 100) return FaixaPeso.Entre80_100;
  return FaixaPeso.Acima100;
}

export function determinarFaixaMeta(metaPercentual: number | null | undefined): FaixaMeta {
  if (metaPercentual == null || metaPercentual <= 0 || !Number.isFinite(metaPercentual)) {
    return FaixaMeta.NaoInformado;
  }
  if (metaPercentual <= 5) return FaixaMeta.Ate5;
  if (metaPercentual <= 10) return FaixaMeta.Entre5_10;
  if (metaPercentual <= 15) return FaixaMeta.Entre10_15;
  if (metaPercentual <= 20) return FaixaMeta.Entre15_20;
  return FaixaMeta.Acima20;
}

export function determinarFaixaEtaria(idade: number | null | undefined): FaixaEtaria {
  if (idade == null || idade < 0 || !Number.isFinite(idade)) return FaixaEtaria.NaoInformado;
  if (idade < 30) return FaixaEtaria.Faixa18_29;
  if (idade < 40) return FaixaEtaria.Faixa30_39;
  if (idade < 50) return FaixaEtaria.Faixa40_49;
  if (idade < 60) return FaixaEtaria.Faixa50_59;
  return FaixaEtaria.Faixa60Mais;
}

/**
 * Regra inicial de confiança baseada apenas em n (amostra do benchmark).
 * Substituível sem alterar OIService.
 */
export function calcularConfiabilidade(
  n: number,
  dadosInsuficientes: boolean
): OIConfiabilidade {
  if (dadosInsuficientes || n < OI_CONFIABILIDADE_LIMITES.minimoConfiavel) {
    return OIConfiabilidade.Baixa;
  }
  if (n < OI_CONFIABILIDADE_LIMITES.media) return OIConfiabilidade.Media;
  if (n <= OI_CONFIABILIDADE_LIMITES.alta) return OIConfiabilidade.Alta;
  return OIConfiabilidade.MuitoAlta;
}

/**
 * Monta intervalo a partir de percentis do benchmark.
 * Preferência: p50 como estimado; p25–p75 como faixa principal.
 */
export function estimarIntervalo(params: {
  media?: number | null;
  p25?: number | null;
  p50?: number | null;
  p75?: number | null;
  p90?: number | null;
}): IntervaloEstimado {
  const { media, p25, p50, p75, p90 } = params;

  const estimado = arredondar(p50 ?? media);
  let minimo = arredondar(p25);
  let maximo = arredondar(p75 ?? p90);

  if (minimo == null && estimado != null) minimo = arredondar(estimado * 0.9);
  if (maximo == null && estimado != null) maximo = arredondar(estimado * 1.1);

  if (minimo != null && maximo != null && minimo > maximo) {
    [minimo, maximo] = [maximo, minimo];
  }

  return { estimado, minimo, maximo };
}

/** Deriva intervalo de aplicações a partir de semanas e média do benchmark. */
export function estimarIntervaloAplicacoes(params: {
  aplicacoesMedia: number | null;
  semanasIntervalo: IntervaloEstimado;
  semanasMedia: number | null;
}): IntervaloEstimado {
  const { aplicacoesMedia, semanasIntervalo, semanasMedia } = params;

  if (aplicacoesMedia == null || aplicacoesMedia <= 0) {
    return { estimado: null, minimo: null, maximo: null };
  }

  const estimado = arredondar(aplicacoesMedia);
  const ratio =
    semanasMedia != null && semanasMedia > 0 ? aplicacoesMedia / semanasMedia : 1;

  const minimo =
    semanasIntervalo.minimo != null
      ? arredondar(semanasIntervalo.minimo * ratio)
      : arredondar(aplicacoesMedia * 0.9);
  const maximo =
    semanasIntervalo.maximo != null
      ? arredondar(semanasIntervalo.maximo * ratio)
      : arredondar(aplicacoesMedia * 1.1);

  return { estimado, minimo, maximo };
}

function arredondar(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

function calcularImc(pesoKg: number | null, alturaCm: number | undefined): number | null {
  if (pesoKg == null || pesoKg <= 0 || !alturaCm || alturaCm <= 0) return null;
  const alturaMetros = alturaCm / 100;
  return Math.round((pesoKg / (alturaMetros * alturaMetros)) * 100) / 100;
}

export function obterPesosPaciente(paciente: PacienteCompleto): {
  pesoInicial: number | null;
  pesoAtual: number | null;
} {
  const medidasIniciais = paciente.dadosClinicos?.medidasIniciais;
  const marcoZero = paciente.marcoZero;
  const evolucao = paciente.evolucaoSeguimento || [];

  const primeiroRegistro = evolucao.find((e) => e.weekIndex === 1);
  const pesoInicial =
    (primeiroRegistro?.peso && primeiroRegistro.peso > 0 ? primeiroRegistro.peso : null) ??
    (medidasIniciais?.peso && medidasIniciais.peso > 0 ? medidasIniciais.peso : null) ??
    (marcoZero?.pesoInicial && marcoZero.pesoInicial > 0 ? marcoZero.pesoInicial : null);

  let pesoAtual: number | null = null;
  if (evolucao.length > 0) {
    const evolucaoOrdenada = [...evolucao].sort((a, b) => {
      const dataA =
        a.dataRegistro instanceof Date
          ? a.dataRegistro.getTime()
          : new Date(a.dataRegistro).getTime();
      const dataB =
        b.dataRegistro instanceof Date
          ? b.dataRegistro.getTime()
          : new Date(b.dataRegistro).getTime();
      return dataB - dataA;
    });
    const ultimoRegistroComPeso = evolucaoOrdenada.find((s) => s.peso && s.peso > 0);
    pesoAtual = ultimoRegistroComPeso?.peso ?? null;
  }
  if (pesoAtual == null && medidasIniciais?.peso) {
    pesoAtual = medidasIniciais.peso;
  }

  return { pesoInicial, pesoAtual };
}

export function resolverMetaPerdaPeso(
  paciente: PacienteCompleto,
  pesoInicial: number | null
): { metaKg: number | null; metaPercentual: number | null } {
  const metas = paciente.planoTerapeutico?.metas;
  const peso0 = pesoInicial;

  if (peso0 == null || peso0 <= 0) {
    return { metaKg: null, metaPercentual: null };
  }

  const pctMin = 5;
  const pctMax = 45;
  const kgMin = roundMetaHalfStep((peso0 * pctMin) / 100);
  const kgMax = roundMetaHalfStep((peso0 * pctMax) / 100);

  let kgRaw: number | null = null;
  if (
    metas?.weightLossTargetType === 'PESO_ABSOLUTO' &&
    metas.weightLossTargetValue != null &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = metas.weightLossTargetValue;
  } else if (
    metas?.weightLossTargetType === 'PERCENTUAL' &&
    metas.weightLossTargetValue != null &&
    metas.weightLossTargetValue > 0
  ) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  } else if (metas?.weightLossTargetValue != null && metas.weightLossTargetValue > 0) {
    kgRaw = (peso0 * metas.weightLossTargetValue) / 100;
  }

  if (kgRaw == null) {
    return { metaKg: null, metaPercentual: null };
  }

  const metaKg = roundMetaHalfStep(Math.min(kgMax, Math.max(kgMin, kgRaw)));
  const metaPercentual = Math.round(((metaKg / peso0) * 100) * 10) / 10;
  return { metaKg, metaPercentual };
}

function calcularIdade(dataNascimento: Date | undefined, referencia: Date): number | null {
  if (!dataNascimento) return null;
  let idade = referencia.getFullYear() - dataNascimento.getFullYear();
  const m = referencia.getMonth() - dataNascimento.getMonth();
  if (m < 0 || (m === 0 && referencia.getDate() < dataNascimento.getDate())) {
    idade -= 1;
  }
  return idade >= 0 && idade <= 120 ? idade : null;
}

function resolverDataReferencia(paciente: PacienteCompleto): Date {
  const start = paciente.planoTerapeutico?.startDate;
  if (start instanceof Date && !Number.isNaN(start.getTime())) return start;
  const evolucao = paciente.evolucaoSeguimento || [];
  const first = evolucao.find((e) => e.weekIndex === 1) ?? evolucao[0];
  if (first?.dataRegistro) {
    const d =
      first.dataRegistro instanceof Date
        ? first.dataRegistro
        : new Date(first.dataRegistro);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

/** Extrai perfil clínico determinístico a partir de PacienteCompleto. */
export function extrairPerfilPaciente(paciente: PacienteCompleto): OIPerfilPaciente {
  const { pesoInicial, pesoAtual } = obterPesosPaciente(paciente);
  const altura = paciente.dadosClinicos?.medidasIniciais?.altura;
  const imcInicial =
    calcularImc(pesoInicial, altura) ??
    paciente.dadosClinicos?.medidasIniciais?.imc ??
    null;

  const dataRef = resolverDataReferencia(paciente);
  const dn = paciente.dadosIdentificacao?.dataNascimento;
  const dataNascimento =
    dn instanceof Date ? dn : dn ? new Date(dn) : undefined;
  const idade = calcularIdade(dataNascimento, dataRef);

  const sexoRaw = paciente.dadosIdentificacao?.sexoBiologico;
  const sexo: OIPerfilPaciente['sexo'] =
    sexoRaw === 'M' || sexoRaw === 'F' || sexoRaw === 'Outro' ? sexoRaw : 'NaoInformado';

  const { metaKg, metaPercentual } = resolverMetaPerdaPeso(paciente, pesoInicial);

  return {
    pesoInicialKg: pesoInicial,
    pesoAtualKg: pesoAtual,
    imcInicial,
    idade,
    sexo,
    metaKg,
    metaPercentual,
    faixaIMC: determinarFaixaIMC(imcInicial),
    faixaPeso: determinarFaixaPeso(pesoInicial),
    faixaMeta: determinarFaixaMeta(metaPercentual),
    faixaEtaria: determinarFaixaEtaria(idade),
  };
}

/** Mapeia FaixaMeta (enum público) para chave do JSON de benchmarks. */
export function faixaMetaParaChaveBenchmark(faixa: FaixaMeta): string | null {
  const map: Partial<Record<FaixaMeta, string>> = {
    [FaixaMeta.Ate5]: 'ate_5',
    [FaixaMeta.Entre5_10]: '5_a_10',
    [FaixaMeta.Entre10_15]: '10_a_15',
    [FaixaMeta.Entre15_20]: '15_a_20',
    [FaixaMeta.Acima20]: 'acima_20',
  };
  return map[faixa] ?? null;
}

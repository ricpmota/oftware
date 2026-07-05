/**
 * Repositório interno de benchmarks — apenas OIService deve importar este módulo.
 * Carrega JSON gerado pela exportação offline (Etapa 2).
 */
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type OIBenchmarkFaixaInterna = {
  faixa: string;
  n: number;
  dadosInsuficientes: boolean;
  perdaKgMedia: number | null;
  perdaPercentualMedia: number | null;
  mgMedio: number | null;
  semanasMedia: number | null;
  aplicacoesMedia: number | null;
  taxaAtingiuMeta: number | null;
  p25Mg: number | null;
  p50Mg: number | null;
  p75Mg: number | null;
  p90Mg: number | null;
  p25Semanas: number | null;
  p50Semanas: number | null;
  p75Semanas: number | null;
};

export type OIWeightLossBenchmarksFile = {
  meta?: {
    geradoEm?: string;
    versao?: string;
    minSampleSize?: number;
  };
  faixas: Record<string, OIBenchmarkFaixaInterna>;
};

const DEFAULT_PATHS = [
  process.env.OI_BENCHMARKS_PATH,
  join(process.cwd(), 'tmp', 'oi', 'weight_loss_benchmarks.json'),
  join(process.cwd(), 'data', 'oi', 'weight_loss_benchmarks.json'),
  join(process.cwd(), 'data', 'oi', 'weight_loss_benchmarks.fallback.json'),
].filter((p): p is string => Boolean(p));

let cached: OIWeightLossBenchmarksFile | null = null;
let cachedPath: string | null = null;

function criarBenchmarksVazios(): OIWeightLossBenchmarksFile {
  const faixas = ['ate_5', '5_a_10', '10_a_15', '15_a_20', 'acima_20'];
  const faixasRecord: Record<string, OIBenchmarkFaixaInterna> = {};
  for (const faixa of faixas) {
    faixasRecord[faixa] = {
      faixa,
      n: 0,
      dadosInsuficientes: true,
      perdaKgMedia: null,
      perdaPercentualMedia: null,
      mgMedio: null,
      semanasMedia: null,
      aplicacoesMedia: null,
      taxaAtingiuMeta: null,
      p25Mg: null,
      p50Mg: null,
      p75Mg: null,
      p90Mg: null,
      p25Semanas: null,
      p50Semanas: null,
      p75Semanas: null,
    };
  }
  return { meta: { versao: '0.0.0-empty' }, faixas: faixasRecord };
}

export function resolverCaminhoBenchmarks(): string | null {
  for (const path of DEFAULT_PATHS) {
    if (existsSync(path)) return path;
  }
  return null;
}

export function carregarBenchmarks(forceReload = false): {
  data: OIWeightLossBenchmarksFile;
  sourcePath: string | null;
} {
  if (cached && !forceReload) {
    return { data: cached, sourcePath: cachedPath };
  }

  const path = resolverCaminhoBenchmarks();
  if (!path) {
    cached = criarBenchmarksVazios();
    cachedPath = null;
    return { data: cached, sourcePath: null };
  }

  const raw = readFileSync(path, 'utf-8');
  cached = JSON.parse(raw) as OIWeightLossBenchmarksFile;
  cachedPath = path;
  return { data: cached, sourcePath: path };
}

export function obterBenchmarkPorFaixa(
  faixaChave: string,
  benchmarks?: OIWeightLossBenchmarksFile
): OIBenchmarkFaixaInterna | null {
  const data = benchmarks ?? carregarBenchmarks().data;
  return data.faixas[faixaChave] ?? null;
}

/** Apenas para testes — injeta benchmarks em memória. */
export function __setBenchmarksForTests(data: OIWeightLossBenchmarksFile | null): void {
  cached = data;
  cachedPath = data ? 'test-fixture' : null;
}

/**
 * Metadados read-only para a página administrativa OI Validation.
 * Não altera OIService, cache de benchmarks nem lógica de inferência.
 */
import { existsSync, readFileSync } from 'fs';
import { join, relative } from 'path';
import { OI_MODEL_VERSION } from '@/lib/oi/OIVersion';

export type OiValidationSnapshot = {
  modelVersion: string;
  benchmarkPath: string | null;
  benchmarkPathDisplay: string | null;
  isFallback: boolean;
  faixaCount: number;
  benchmarksLastUpdated: string | null;
  patientsUsed: number | null;
  benchmarkOrigin: string;
};

const PRIMARY_BENCHMARK = join(process.cwd(), 'tmp', 'oi', 'weight_loss_benchmarks.json');
const DATA_BENCHMARK = join(process.cwd(), 'data', 'oi', 'weight_loss_benchmarks.json');
const FALLBACK_BENCHMARK = join(process.cwd(), 'data', 'oi', 'weight_loss_benchmarks.fallback.json');
const CONSOLIDADO_PATH = join(process.cwd(), 'tmp', 'oi', 'pacientes_tratamento_consolidado.json');

type BenchmarkFileShape = {
  meta?: { geradoEm?: string };
  faixas?: Record<string, unknown>;
};

type ConsolidadoFileShape = {
  meta?: { totalRegistros?: number };
};

function resolveBenchmarkPath(): string | null {
  const candidates = [process.env.OI_BENCHMARKS_PATH, PRIMARY_BENCHMARK, DATA_BENCHMARK, FALLBACK_BENCHMARK].filter(
    (p): p is string => Boolean(p),
  );
  for (const path of candidates) {
    if (existsSync(path)) return path;
  }
  return null;
}

function readPatientsUsed(): number | null {
  if (!existsSync(CONSOLIDADO_PATH)) return null;
  try {
    const raw = JSON.parse(readFileSync(CONSOLIDADO_PATH, 'utf-8')) as ConsolidadoFileShape;
    const total = raw.meta?.totalRegistros;
    return typeof total === 'number' && total > 0 ? total : null;
  } catch {
    return null;
  }
}

function toDisplayPath(absolutePath: string): string {
  try {
    return relative(process.cwd(), absolutePath).replace(/\\/g, '/');
  } catch {
    return absolutePath;
  }
}

export function getOiValidationSnapshot(): OiValidationSnapshot {
  const path = resolveBenchmarkPath();

  if (!path) {
    return {
      modelVersion: OI_MODEL_VERSION,
      benchmarkPath: null,
      benchmarkPathDisplay: null,
      isFallback: true,
      faixaCount: 0,
      benchmarksLastUpdated: null,
      patientsUsed: readPatientsUsed(),
      benchmarkOrigin: 'Utilizando benchmark fallback',
    };
  }

  let faixaCount = 0;
  let benchmarksLastUpdated: string | null = null;
  const isFallback = path.replace(/\\/g, '/').includes('weight_loss_benchmarks.fallback.json');

  try {
    const raw = JSON.parse(readFileSync(path, 'utf-8')) as BenchmarkFileShape;
    faixaCount = raw.faixas ? Object.keys(raw.faixas).length : 0;
    benchmarksLastUpdated = raw.meta?.geradoEm ?? null;
  } catch {
    /* metadados indisponíveis — snapshot parcial */
  }

  const isPrimaryExport =
    path.replace(/\\/g, '/').includes('tmp/oi/weight_loss_benchmarks.json') ||
    path.replace(/\\/g, '/').includes('tmp\\oi\\weight_loss_benchmarks.json');
  const isDataBenchmark =
    path.replace(/\\/g, '/').includes('data/oi/weight_loss_benchmarks.json') &&
    !path.replace(/\\/g, '/').includes('fallback');

  return {
    modelVersion: OI_MODEL_VERSION,
    benchmarkPath: path,
    benchmarkPathDisplay: toDisplayPath(path),
    isFallback,
    faixaCount,
    benchmarksLastUpdated,
    patientsUsed: readPatientsUsed(),
    benchmarkOrigin: isFallback
      ? 'Utilizando benchmark fallback'
      : isPrimaryExport
        ? 'Exportação offline (Etapa 2)'
        : isDataBenchmark
          ? 'Arquivo versionado em data/oi/'
          : 'Arquivo customizado (OI_BENCHMARKS_PATH)',
  };
}

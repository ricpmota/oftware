/**
 * Descoberta pura de semanas históricas elegíveis para BodyScan.
 * Chave principal: patientId + semana (não applicationId).
 */

export type HistoricalPhotoLike = {
  id: string;
  tipo: string;
  semana?: number | null;
  dataAplicacao?: string | null;
  createdAtMs?: number;
};

export type HistoricalSeguimentoLike = {
  weekIndex?: number;
  numeroSemana?: number;
  peso?: number | null;
  circunferenciaAbdominal?: number | null;
  dataRegistro?: string | null;
};

export type HistoricalBodyScanExistingLike = {
  week: number;
  status: 'processing' | 'completed' | 'failed';
  /** false = tentativa concluída sem estimativa; pode gerar de novo com as mesmas fotos. */
  analysisAvailable?: boolean;
  frontPhotoId?: string;
  sidePhotoId?: string;
};

export type HistoricalWeekPhotoPair = {
  week: number;
  frontPhotoId: string;
  sidePhotoId: string;
  date?: string;
};

export type HistoricalWeekEligibility = {
  week: number;
  hasFront: boolean;
  hasSide: boolean;
  hasWeight: boolean;
  hasHeight: boolean;
  eligible: boolean;
  reason?: string;
  frontPhotoId?: string;
  sidePhotoId?: string;
  weightKg?: number;
  abdominalCircumferenceCm?: number;
  date?: string;
  alreadyCompletedSamePhotos?: boolean;
  needsGeneration?: boolean;
};

export type HistoricalDiscoverySummary = {
  foundPhotoWeeks: number;
  weeksWithFrontAndSide: number;
  eligibleWeeks: number;
  alreadyCompleted: number;
  pendingGeneration: number;
  weeks: HistoricalWeekEligibility[];
  pendingWeeks: number[];
};

function pickLatestByTipo(
  photos: HistoricalPhotoLike[],
  tipo: 'frontal' | 'perfil'
): HistoricalPhotoLike | null {
  const filtered = photos.filter((p) => p.tipo === tipo);
  if (filtered.length === 0) return null;
  filtered.sort((a, b) => (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0));
  return filtered[0] || null;
}

/** Agrupa fotos por semana e seleciona o par frontal/perfil mais recente de cada semana. */
export function groupProgressPhotosByWeek(
  photos: HistoricalPhotoLike[]
): HistoricalWeekPhotoPair[] {
  const byWeek = new Map<number, HistoricalPhotoLike[]>();
  for (const photo of photos) {
    const week = Number(photo.semana);
    if (!Number.isFinite(week) || week < 1) continue;
    if (photo.tipo !== 'frontal' && photo.tipo !== 'perfil') continue;
    const list = byWeek.get(week) || [];
    list.push(photo);
    byWeek.set(week, list);
  }

  const pairs: HistoricalWeekPhotoPair[] = [];
  for (const [week, list] of byWeek.entries()) {
    const front = pickLatestByTipo(list, 'frontal');
    const side = pickLatestByTipo(list, 'perfil');
    if (!front || !side) continue;
    const date = front.dataAplicacao || side.dataAplicacao || undefined;
    pairs.push({
      week,
      frontPhotoId: front.id,
      sidePhotoId: side.id,
      date: date ? String(date).slice(0, 10) : undefined,
    });
  }

  return pairs.sort((a, b) => a.week - b.week);
}

export function evaluateHistoricalWeekEligibility(params: {
  week: number;
  hasFront: boolean;
  hasSide: boolean;
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  abdominalCircumferenceCm?: number | null;
  frontPhotoId?: string;
  sidePhotoId?: string;
  date?: string;
  existing?: HistoricalBodyScanExistingLike | null;
}): HistoricalWeekEligibility {
  const weightOk =
    params.weightKg != null && Number.isFinite(params.weightKg) && params.weightKg > 0;
  const heightOk =
    params.heightCm != null && Number.isFinite(params.heightCm) && params.heightCm > 0;

  const base: HistoricalWeekEligibility = {
    week: params.week,
    hasFront: params.hasFront,
    hasSide: params.hasSide,
    hasWeight: weightOk,
    hasHeight: heightOk,
    eligible: false,
    frontPhotoId: params.frontPhotoId,
    sidePhotoId: params.sidePhotoId,
    weightKg: weightOk ? Number(params.weightKg) : undefined,
    abdominalCircumferenceCm:
      params.abdominalCircumferenceCm != null &&
      Number.isFinite(params.abdominalCircumferenceCm)
        ? Number(params.abdominalCircumferenceCm)
        : undefined,
    date: params.date,
  };

  if (!params.hasFront || !params.hasSide) {
    return { ...base, reason: !params.hasFront ? 'falta frontal' : 'falta perfil' };
  }
  if (!weightOk) return { ...base, reason: 'peso da semana ausente' };
  if (!heightOk) return { ...base, reason: 'altura inválida' };

  const eligible = true;
  const samePhotosCompleted =
    params.existing?.status === 'completed' &&
    params.existing.analysisAvailable !== false &&
    !!params.existing.frontPhotoId &&
    !!params.existing.sidePhotoId &&
    params.existing.frontPhotoId === params.frontPhotoId &&
    params.existing.sidePhotoId === params.sidePhotoId;

  return {
    ...base,
    eligible,
    alreadyCompletedSamePhotos: samePhotosCompleted,
    needsGeneration: !samePhotosCompleted,
    reason: samePhotosCompleted ? 'BodyScan já concluído para as mesmas fotos' : undefined,
  };
}

export function summarizeHistoricalDiscovery(params: {
  allPhotoWeeks: number[];
  weeksWithFrontAndSide: number[];
  evaluations: HistoricalWeekEligibility[];
}): HistoricalDiscoverySummary {
  const eligible = params.evaluations.filter((w) => w.eligible);
  const alreadyCompleted = eligible.filter((w) => w.alreadyCompletedSamePhotos).length;
  const pending = eligible.filter((w) => w.needsGeneration).map((w) => w.week);

  return {
    foundPhotoWeeks: new Set(params.allPhotoWeeks).size,
    weeksWithFrontAndSide: params.weeksWithFrontAndSide.length,
    eligibleWeeks: eligible.length,
    alreadyCompleted,
    pendingGeneration: pending.length,
    weeks: [...params.evaluations].sort((a, b) => a.week - b.week),
    pendingWeeks: pending.sort((a, b) => a - b),
  };
}

/** Descoberta completa em memória (testável sem Firestore). */
export function discoverHistoricalBodyScanWeeks(params: {
  photos: HistoricalPhotoLike[];
  evolucao: HistoricalSeguimentoLike[];
  heightCm: number | null | undefined;
  existingScans?: HistoricalBodyScanExistingLike[];
}): HistoricalDiscoverySummary {
  const allPhotoWeeks = [
    ...new Set(
      params.photos
        .map((p) => Number(p.semana))
        .filter((w) => Number.isFinite(w) && w >= 1)
    ),
  ].sort((a, b) => a - b);

  const pairs = groupProgressPhotosByWeek(params.photos);
  const weeksWithFrontAndSide = pairs.map((p) => p.week);
  const existingByWeek = new Map(
    (params.existingScans || []).map((s) => [s.week, s] as const)
  );

  const evaluations: HistoricalWeekEligibility[] = [];

  // Avaliar também semanas que têm só uma foto (para contagem/auditoria)
  for (const week of allPhotoWeeks) {
    const pair = pairs.find((p) => p.week === week);
    const fotosDaSemana = params.photos.filter((p) => Number(p.semana) === week);
    const hasFront = fotosDaSemana.some((p) => p.tipo === 'frontal');
    const hasSide = fotosDaSemana.some((p) => p.tipo === 'perfil');

    const registro = params.evolucao.find(
      (e) => (e.weekIndex ?? e.numeroSemana) === week
    );
    const weightKg =
      registro?.peso != null && Number.isFinite(Number(registro.peso))
        ? Number(registro.peso)
        : null;

    evaluations.push(
      evaluateHistoricalWeekEligibility({
        week,
        hasFront,
        hasSide,
        weightKg,
        heightCm: params.heightCm,
        abdominalCircumferenceCm: registro?.circunferenciaAbdominal,
        frontPhotoId: pair?.frontPhotoId,
        sidePhotoId: pair?.sidePhotoId,
        date:
          pair?.date ||
          (typeof registro?.dataRegistro === 'string'
            ? registro.dataRegistro.slice(0, 10)
            : undefined),
        existing: existingByWeek.get(week) || null,
      })
    );
  }

  return summarizeHistoricalDiscovery({
    allPhotoWeeks,
    weeksWithFrontAndSide,
    evaluations,
  });
}

/** Pool simples de concorrência (máx. N). */
export async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const limit = Math.max(1, Math.floor(concurrency));
  const results: R[] = new Array(items.length);
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < items.length) {
      const current = nextIndex++;
      results[current] = await mapper(items[current]!, current);
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

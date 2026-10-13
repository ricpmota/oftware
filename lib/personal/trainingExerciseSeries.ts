/**
 * Prescrição operacional por série (Criar Treino / trainingSessions).
 * Não misturar com WorkoutPlanDraft / PublishedTrainingPlan.
 */

export type TrainingExerciseSeries = {
  id: string;
  order: number;
  reps: number;
  loadKg: number | null;
  restSec: number;
};

export type TrainingIntercalatedOccurrence = {
  id: string;
  afterSeriesId: string;
  slotOrder: number;
  exerciseId: string;
  name: string;
  bodyPart: string;
  target: string;
  equipment: string;
  gifUrl?: string;
  trainerNote?: string;
  series: TrainingExerciseSeries;
};

export type TrainingExercisePrescription = {
  series: TrainingExerciseSeries[];
  intercalations?: TrainingIntercalatedOccurrence[];
  /** Legado — somente leitura de documentos antigos. */
  sets?: number;
  reps?: number;
  restSec?: number;
};

export type LegacyTrainingPrescription = {
  series?: unknown;
  sets?: unknown;
  reps?: unknown;
  restSec?: unknown;
};

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 10;
const DEFAULT_REST_SEC = 60;

export function createTrainingSeriesId(): string {
  return `set_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createIntercalationId(): string {
  return `int_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const n = Number(value.trim().replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function sanitizeReps(value: unknown, fallback = DEFAULT_REPS): number {
  const n = toFiniteNumber(value);
  if (n == null) return fallback;
  return Math.max(1, Math.round(n));
}

export function sanitizeRestSec(value: unknown, fallback = DEFAULT_REST_SEC): number {
  const n = toFiniteNumber(value);
  if (n == null) return fallback;
  return Math.max(0, Math.round(n));
}

export function sanitizeLoadKg(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = toFiniteNumber(value);
  if (n == null || n < 0) return null;
  return Math.round(n * 10) / 10;
}

export function parseLoadKgInput(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return sanitizeLoadKg(trimmed.replace(',', '.'));
}

export function formatLoadKgInput(loadKg: number | null): string {
  if (loadKg == null) return '';
  const rounded = Math.round(loadKg * 10) / 10;
  if (Math.abs(rounded - Math.round(rounded)) < 0.05) return String(Math.round(rounded));
  return String(rounded).replace('.', ',');
}

export function normalizeSeriesOrder(
  series: TrainingExerciseSeries[]
): TrainingExerciseSeries[] {
  return series.map((item, index) => ({
    ...item,
    order: index + 1,
  }));
}

function sanitizeTrainerNoteLocal(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.replace(/\r\n/g, '\n').trim();
  return trimmed || undefined;
}

export function sanitizeIntercalations(
  raw: unknown,
  series: Array<{ id: string }>
): TrainingIntercalatedOccurrence[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];
  const valid = new Set(series.map((item) => item.id).filter(Boolean));
  const parsed: TrainingIntercalatedOccurrence[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== 'object') continue;
    const item = entry as Record<string, unknown>;
    const afterSeriesId = typeof item.afterSeriesId === 'string' ? item.afterSeriesId.trim() : '';
    const exerciseId = typeof item.exerciseId === 'string' ? item.exerciseId.trim() : '';
    const name = typeof item.name === 'string' ? item.name.trim() : '';
    if (!afterSeriesId || !valid.has(afterSeriesId) || !exerciseId || !name) continue;
    const seriesRaw =
      item.series && typeof item.series === 'object' ? (item.series as Record<string, unknown>) : {};
    const trainerNote = sanitizeTrainerNoteLocal(item.trainerNote);
    const gifUrl =
      typeof item.gifUrl === 'string' && item.gifUrl.trim() ? item.gifUrl.trim() : undefined;
    parsed.push({
      id:
        typeof item.id === 'string' && item.id.trim()
          ? item.id.trim()
          : createIntercalationId(),
      afterSeriesId,
      slotOrder: Number.isFinite(Number(item.slotOrder))
        ? Math.max(0, Math.round(Number(item.slotOrder)))
        : 0,
      exerciseId,
      name,
      bodyPart: typeof item.bodyPart === 'string' ? item.bodyPart : '',
      target: typeof item.target === 'string' ? item.target : '',
      equipment: typeof item.equipment === 'string' ? item.equipment : '',
      ...(gifUrl ? { gifUrl } : {}),
      ...(trainerNote ? { trainerNote } : {}),
      series: {
        id:
          typeof seriesRaw.id === 'string' && seriesRaw.id.trim()
            ? seriesRaw.id.trim()
            : createTrainingSeriesId(),
        order: 1,
        reps: sanitizeReps(seriesRaw.reps, 10),
        loadKg: sanitizeLoadKg(seriesRaw.loadKg ?? null),
        restSec: sanitizeRestSec(seriesRaw.restSec, 0),
      },
    });
  }
  const ordered: TrainingIntercalatedOccurrence[] = [];
  for (const seriesItem of series) {
    const list = parsed
      .filter((item) => item.afterSeriesId === seriesItem.id)
      .sort((a, b) => a.slotOrder - b.slotOrder || a.id.localeCompare(b.id));
    list.forEach((item, index) => ordered.push({ ...item, slotOrder: index }));
  }
  return ordered;
}

function sanitizeSeriesItem(
  raw: unknown,
  index: number,
  fallback?: { reps: number; restSec: number; loadKg: number | null }
): TrainingExerciseSeries {
  const item = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const id =
    typeof item.id === 'string' && item.id.trim()
      ? item.id.trim()
      : createTrainingSeriesId();
  return {
    id,
    order: index + 1,
    reps: sanitizeReps(item.reps, fallback?.reps ?? DEFAULT_REPS),
    loadKg: sanitizeLoadKg(item.loadKg === undefined ? fallback?.loadKg ?? null : item.loadKg),
    restSec: sanitizeRestSec(item.restSec, fallback?.restSec ?? DEFAULT_REST_SEC),
  };
}

export function createUniformTrainingSeries(params?: {
  count?: number;
  reps?: number;
  restSec?: number;
  loadKg?: number | null;
}): TrainingExerciseSeries[] {
  const count = Math.max(1, Math.round(params?.count ?? DEFAULT_SETS));
  const reps = sanitizeReps(params?.reps, DEFAULT_REPS);
  const restSec = sanitizeRestSec(params?.restSec, DEFAULT_REST_SEC);
  const loadKg = sanitizeLoadKg(params?.loadKg ?? null);
  return normalizeSeriesOrder(
    Array.from({ length: count }, () => ({
      id: createTrainingSeriesId(),
      order: 1,
      reps,
      loadKg,
      restSec,
    }))
  );
}

export function createDefaultTrainingSeries(): TrainingExerciseSeries[] {
  return createUniformTrainingSeries();
}

export function normalizeTrainingExercisePrescription(
  raw?: LegacyTrainingPrescription | TrainingExercisePrescription | null
): TrainingExercisePrescription {
  const source = raw && typeof raw === 'object' ? raw : {};
  const seriesRaw = Array.isArray(source.series) ? source.series : [];
  if (seriesRaw.length > 0) {
    const series = normalizeSeriesOrder(
      seriesRaw.map((item, index) => sanitizeSeriesItem(item, index))
    );
    const intercalations = sanitizeIntercalations(
      (source as { intercalations?: unknown }).intercalations,
      series
    );
    return {
      series,
      ...(intercalations.length > 0 ? { intercalations } : {}),
    };
  }

  const sets = sanitizeReps(source.sets, DEFAULT_SETS);
  const reps = sanitizeReps(source.reps, DEFAULT_REPS);
  const restSec = sanitizeRestSec(source.restSec, DEFAULT_REST_SEC);
  return {
    series: createUniformTrainingSeries({ count: sets, reps, restSec, loadKg: null }),
  };
}

export function addTrainingSeries(
  series: TrainingExerciseSeries[]
): TrainingExerciseSeries[] {
  const current = normalizeSeriesOrder(series.length > 0 ? series : createDefaultTrainingSeries());
  const last = current[current.length - 1];
  return normalizeSeriesOrder([
    ...current,
    {
      id: createTrainingSeriesId(),
      order: current.length + 1,
      reps: last.reps,
      loadKg: last.loadKg,
      restSec: last.restSec,
    },
  ]);
}

export function removeTrainingSeries(
  series: TrainingExerciseSeries[],
  seriesId: string
): TrainingExerciseSeries[] {
  if (series.length <= 1) return normalizeSeriesOrder(series);
  const next = series.filter((item) => item.id !== seriesId);
  if (next.length === 0) return series;
  return normalizeSeriesOrder(next);
}

export function updateTrainingSeries(
  series: TrainingExerciseSeries[],
  seriesId: string,
  patch: Partial<Pick<TrainingExerciseSeries, 'reps' | 'loadKg' | 'restSec'>>
): TrainingExerciseSeries[] {
  return normalizeSeriesOrder(
    series.map((item) => {
      if (item.id !== seriesId) return item;
      return {
        ...item,
        reps: patch.reps !== undefined ? sanitizeReps(patch.reps, item.reps) : item.reps,
        restSec:
          patch.restSec !== undefined ? sanitizeRestSec(patch.restSec, item.restSec) : item.restSec,
        loadKg: patch.loadKg !== undefined ? sanitizeLoadKg(patch.loadKg) : item.loadKg,
      };
    })
  );
}

function loadsEqual(a: number | null, b: number | null): boolean {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.05;
}

export function getEffectiveRestSec(
  prescription?: LegacyTrainingPrescription | TrainingExercisePrescription | null
): number {
  const series = normalizeTrainingExercisePrescription(prescription).series;
  const last = series[series.length - 1];
  return last?.restSec ?? DEFAULT_REST_SEC;
}

export function formatTrainingSeriesSummary(
  prescription?: LegacyTrainingPrescription | TrainingExercisePrescription | null
): string {
  const series = normalizeTrainingExercisePrescription(prescription).series;
  if (series.length === 0) return '—';

  const repsUniform = series.every((s) => s.reps === series[0].reps);
  const loadUniform = series.every((s) => loadsEqual(s.loadKg, series[0].loadKg));
  const restUniform = series.every((s) => s.restSec === series[0].restSec);
  const anyLoad = series.some((s) => s.loadKg != null);

  const formatLoadList = () => {
    const values = series.map((s) => (s.loadKg == null ? '—' : formatLoadKgInput(s.loadKg)));
    return `${values.join('/')} kg`;
  };

  if (repsUniform && loadUniform && restUniform) {
    const loadPart =
      series[0].loadKg == null ? '' : ` · ${formatLoadKgInput(series[0].loadKg)} kg`;
    return `${series.length} × ${series[0].reps}${loadPart}`;
  }

  const parts: string[] = [];
  if (repsUniform) {
    parts.push(`${series.length} × ${series[0].reps}`);
  } else {
    parts.push(`${series.length} séries · ${series.map((s) => s.reps).join('/')} reps`);
  }

  if (anyLoad) {
    if (loadUniform && series[0].loadKg != null) {
      parts.push(`${formatLoadKgInput(series[0].loadKg)} kg`);
    } else {
      parts.push(formatLoadList());
    }
  }

  return parts.join(' · ');
}

export function serializeTrainingPrescription(
  prescription?: LegacyTrainingPrescription | TrainingExercisePrescription | null
): {
  series: Array<{ id: string; order: number; reps: number; loadKg: number | null; restSec: number }>;
  intercalations?: TrainingIntercalatedOccurrence[];
} {
  const normalized = normalizeTrainingExercisePrescription(prescription);
  return {
    series: normalized.series.map((item) => ({
      id: item.id,
      order: item.order,
      reps: item.reps,
      loadKg: item.loadKg,
      restSec: item.restSec,
    })),
    ...(normalized.intercalations && normalized.intercalations.length > 0
      ? {
          intercalations: normalized.intercalations.map((item) => ({
            id: item.id,
            afterSeriesId: item.afterSeriesId,
            slotOrder: item.slotOrder,
            exerciseId: item.exerciseId,
            name: item.name,
            bodyPart: item.bodyPart,
            target: item.target,
            equipment: item.equipment,
            ...(item.gifUrl ? { gifUrl: item.gifUrl } : {}),
            ...(item.trainerNote ? { trainerNote: item.trainerNote } : {}),
            series: {
              id: item.series.id,
              order: 1,
              reps: item.series.reps,
              loadKg: item.series.loadKg,
              restSec: item.series.restSec,
            },
          })),
        }
      : {}),
  };
}

export function validateTrainingPrescription(
  prescription?: LegacyTrainingPrescription | TrainingExercisePrescription | null
): { ok: true } | { ok: false; message: string } {
  const source = prescription && typeof prescription === 'object' ? prescription : {};
  const hasSeriesField = Array.isArray(source.series);
  const seriesRaw = hasSeriesField ? source.series ?? [] : [];

  if (hasSeriesField && seriesRaw.length < 1) {
    return { ok: false, message: 'Cada exercício precisa de pelo menos uma série.' };
  }

  const rawItems: unknown[] =
    hasSeriesField && seriesRaw.length > 0
      ? seriesRaw
      : normalizeTrainingExercisePrescription(source).series;

  if (rawItems.length < 1) {
    return { ok: false, message: 'Cada exercício precisa de pelo menos uma série.' };
  }

  for (const raw of rawItems) {
    const rec = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    const reps = toFiniteNumber(rec.reps);
    const restSec = toFiniteNumber(rec.restSec);
    const loadKg =
      rec.loadKg == null || rec.loadKg === '' ? null : toFiniteNumber(rec.loadKg);

    if (reps == null || !(reps > 0) || !Number.isFinite(reps)) {
      return { ok: false, message: 'Repetições devem ser maiores que zero.' };
    }
    if (restSec == null || !(restSec >= 0) || !Number.isFinite(restSec)) {
      return { ok: false, message: 'Descanso não pode ser negativo.' };
    }
    if (loadKg != null && (!(loadKg >= 0) || !Number.isFinite(loadKg))) {
      return { ok: false, message: 'Carga inválida.' };
    }
  }

  const normalized = normalizeTrainingExercisePrescription(source);
  const seriesIds = new Set(normalized.series.map((item) => item.id));
  for (const item of normalized.intercalations || []) {
    if (!item.exerciseId || !item.name) {
      return { ok: false, message: 'Exercício intercalado inválido.' };
    }
    if (!seriesIds.has(item.afterSeriesId)) {
      return { ok: false, message: 'Exercício intercalado sem série correspondente.' };
    }
    if (!item.series?.id || !(item.series.reps > 0)) {
      return { ok: false, message: 'Série intercalada inválida.' };
    }
  }
  return { ok: true };
}

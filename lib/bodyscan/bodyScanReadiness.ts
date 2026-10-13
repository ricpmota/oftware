/**
 * Helpers puros para decidir se BodyScan pode ser gerado (usados em testes).
 */

export type BodyScanReadinessInput = {
  /** @deprecated BodyScan não exige mais consentimento separado. Mantido opcional por compat. */
  hasConsent?: boolean;
  hasFrontPhoto: boolean;
  hasSidePhoto: boolean;
  weightKg: number | null | undefined;
  heightCm: number | null | undefined;
  abdominalCircumferenceCm?: number | null;
  existing?: {
    status: 'processing' | 'completed' | 'failed';
    /** false = concluído sem estimativa; as mesmas fotos podem ser analisadas de novo. */
    analysisAvailable?: boolean;
    frontPhotoId?: string;
    sidePhotoId?: string;
    updatedAtMs?: number;
  } | null;
  currentFrontPhotoId?: string;
  currentSidePhotoId?: string;
  nowMs?: number;
  processingLockMs?: number;
};

export type BodyScanReadiness =
  | { ready: false; reason: string }
  | { ready: true };

export function evaluateBodyScanReadiness(input: BodyScanReadinessInput): BodyScanReadiness {
  if (!input.hasFrontPhoto) return { ready: false, reason: 'falta frontal' };
  if (!input.hasSidePhoto) return { ready: false, reason: 'falta perfil' };
  if (input.weightKg == null || !Number.isFinite(input.weightKg) || input.weightKg <= 0) {
    return { ready: false, reason: 'peso da semana ausente' };
  }
  if (input.heightCm == null || !Number.isFinite(input.heightCm) || input.heightCm <= 0) {
    return { ready: false, reason: 'altura inválida' };
  }

  const existing = input.existing;
  if (
    existing?.status === 'completed' &&
    existing.analysisAvailable !== false &&
    existing.frontPhotoId &&
    existing.sidePhotoId &&
    existing.frontPhotoId === input.currentFrontPhotoId &&
    existing.sidePhotoId === input.currentSidePhotoId
  ) {
    return { ready: false, reason: 'BodyScan já concluído para as mesmas fotos' };
  }

  if (existing?.status === 'processing') {
    const lockMs = input.processingLockMs ?? 5 * 60 * 1000;
    const now = input.nowMs ?? Date.now();
    const age = now - (existing.updatedAtMs ?? 0);
    if (age >= 0 && age < lockMs) {
      return { ready: false, reason: 'BodyScan já em processamento' };
    }
  }

  return { ready: true };
}

/**
 * Fingerprint estável do contexto de geração (sem crypto pesado).
 */

export function buildDraftFingerprint(parts: {
  patientId: string;
  assessmentVersion: number;
  indexVersion: number;
  engineVersion: string;
  catalogVersion: string;
}): string {
  const raw = [
    parts.patientId,
    String(parts.assessmentVersion),
    String(parts.indexVersion),
    parts.engineVersion,
    parts.catalogVersion,
  ].join('|');
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    hash = (hash * 31 + raw.charCodeAt(i)) | 0;
  }
  return `fp_${Math.abs(hash).toString(36)}_${raw.length}`;
}

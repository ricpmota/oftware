/** Frase exata exigida para executar o Organization Backfill (Etapa 8). */
export const ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE = 'EXECUTAR BACKFILL METODO';

export function isOrganizationBackfillConfirmationValid(value: unknown): boolean {
  return typeof value === 'string' && value.trim() === ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE;
}

import { describe, expect, it } from 'vitest';
import {
  classifyOrganizationIdField,
  isOrganizationBackfillCandidate,
} from '@/lib/migrations/firestoreCollectionScan';
import {
  isOrganizationBackfillConfirmationValid,
  ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE,
} from '@/lib/migrations/organizationBackfillConstants';

describe('organization backfill classifier', () => {
  const target = 'metodo';

  it('classifica ausência de campo', () => {
    expect(classifyOrganizationIdField({}, target)).toBe('missing');
    expect(classifyOrganizationIdField(undefined, target)).toBe('missing');
  });

  it('classifica string vazia', () => {
    expect(classifyOrganizationIdField({ organizationId: '' }, target)).toBe('empty');
    expect(classifyOrganizationIdField({ organizationId: '   ' }, target)).toBe('empty');
  });

  it('classifica organizationId alvo', () => {
    expect(classifyOrganizationIdField({ organizationId: 'metodo' }, target)).toBe('with_target');
  });

  it('classifica outra organização — nunca sobrescrever', () => {
    expect(classifyOrganizationIdField({ organizationId: 'outra-org' }, target)).toBe('with_other');
  });

  it('candidatos ao backfill são missing ou empty apenas', () => {
    expect(isOrganizationBackfillCandidate({}, target)).toBe(true);
    expect(isOrganizationBackfillCandidate({ organizationId: '' }, target)).toBe(true);
    expect(isOrganizationBackfillCandidate({ organizationId: 'metodo' }, target)).toBe(false);
    expect(isOrganizationBackfillCandidate({ organizationId: 'whitelabel-x' }, target)).toBe(false);
  });
});

describe('organization backfill confirmation', () => {
  it('exige frase exata para execução', () => {
    expect(ORGANIZATION_BACKFILL_CONFIRMATION_PHRASE).toBe('EXECUTAR BACKFILL METODO');
    expect(isOrganizationBackfillConfirmationValid('EXECUTAR BACKFILL METODO')).toBe(true);
    expect(isOrganizationBackfillConfirmationValid(' EXECUTAR BACKFILL METODO ')).toBe(true);
    expect(isOrganizationBackfillConfirmationValid('executar backfill metodo')).toBe(false);
    expect(isOrganizationBackfillConfirmationValid('')).toBe(false);
  });
});

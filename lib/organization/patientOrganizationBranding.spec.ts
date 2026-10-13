import { describe, expect, it } from 'vitest';
import { buildHardcodedOrganizationBranding } from './organizationBrandingDefaults';
import { resolveOrganizationBrandingFromSources } from './organizationBrandingMerge';
import { METODO_ORGANIZATION, METODO_ORGANIZATION_ID } from './organizationRegistry';
import {
  fallbackPatientOrganizationBranding,
  mapSourceLayerToPatientBrandingSource,
  resolvePatientOrganizationBrandingState,
  shouldFetchPatientOrganizationBranding,
  toPatientOrganizationBrandingPublic,
} from './patientOrganizationBranding';

const METODO = METODO_ORGANIZATION_ID;
const hardcoded = buildHardcodedOrganizationBranding(METODO_ORGANIZATION);

describe('shouldFetchPatientOrganizationBranding', () => {
  it('Caso E: contexto loading → não buscar', () => {
    expect(shouldFetchPatientOrganizationBranding('loading', METODO)).toBe(false);
  });

  it('Caso F: contexto unresolved → não buscar', () => {
    expect(shouldFetchPatientOrganizationBranding('unresolved', null)).toBe(false);
    expect(shouldFetchPatientOrganizationBranding('unresolved', METODO)).toBe(false);
  });

  it('Caso G: mismatch busca branding da org resolvida — não é autorização', () => {
    expect(shouldFetchPatientOrganizationBranding('mismatch', METODO)).toBe(true);
  });

  it('resolved com organizationId → buscar', () => {
    expect(shouldFetchPatientOrganizationBranding('resolved', METODO)).toBe(true);
  });
});

describe('resolvePatientOrganizationBrandingState', () => {
  it('Caso A: organizationId metodo + branding firestore → resolved', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: METODO,
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: METODO,
        sourceLayer: 'firestore',
        branding: toPatientOrganizationBrandingPublic(hardcoded),
      },
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.organizationId).toBe(METODO);
    expect(ctx.source).toBe('firestore');
    expect(ctx.branding?.publicName).toBe('Método Emagrecer');
    expect(ctx.branding?.primaryColor).toBe('#4CCB7A');
  });

  it('Caso B: branding parcial mesclado com defaults oficiais', () => {
    const merged = resolveOrganizationBrandingFromSources({
      organization: METODO_ORGANIZATION,
      firestoreBranding: {
        ...hardcoded,
        publicName: 'Nome Parcial',
        primaryColor: '#112233',
      },
    });
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: METODO,
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: METODO,
        sourceLayer: 'firestore',
        branding: toPatientOrganizationBrandingPublic(merged),
      },
    });
    expect(ctx.branding?.publicName).toBe('Nome Parcial');
    expect(ctx.branding?.primaryColor).toBe('#112233');
    expect(ctx.branding?.secondaryColor).toBe(hardcoded.secondaryColor);
    expect(ctx.branding?.logoMainUrl).toBe(hardcoded.logoMainUrl);
  });

  it('Caso C: documento sem branding (hardcoded) → fallback/default', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: METODO,
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: METODO,
        sourceLayer: 'hardcoded',
        branding: toPatientOrganizationBrandingPublic(hardcoded),
      },
    });
    expect(ctx.status).toBe('fallback');
    expect(ctx.source).toBe('default');
    expect(ctx.branding?.publicName).toBe('Método Emagrecer');
  });

  it('Caso D: organizationId inexistente → unresolved, não quebra', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: 'org_inexistente',
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: 'org_inexistente',
        sourceLayer: null,
        branding: null,
      },
    });
    expect(ctx.status).toBe('unresolved');
    expect(ctx.branding).toBeNull();
  });

  it('Caso E: organization context loading → branding loading', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'loading',
      organizationId: null,
      fetchStatus: 'idle',
      payload: null,
    });
    expect(ctx.status).toBe('loading');
    expect(ctx.branding).toBeNull();
  });

  it('Caso F: organization context unresolved → branding unresolved', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'unresolved',
      organizationId: null,
      fetchStatus: 'idle',
      payload: null,
    });
    expect(ctx.status).toBe('unresolved');
    expect(ctx.branding).toBeNull();
  });

  it('Caso G: mismatch ainda entrega branding da org resolvida (não autoriza)', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'mismatch',
      organizationId: 'clinica_exemplo_wl',
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: 'clinica_exemplo_wl',
        sourceLayer: 'firestore',
        branding: toPatientOrganizationBrandingPublic(hardcoded),
      },
    });
    expect(ctx.status).toBe('resolved');
    expect(ctx.organizationId).toBe('clinica_exemplo_wl');
    expect(ctx.branding).not.toBeNull();
  });

  it('payload de outra organização não mantém a logo anterior', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: 'kamilla-montenegro',
      fetchStatus: 'success',
      payload: {
        ok: true,
        organizationId: METODO,
        sourceLayer: 'firestore',
        branding: toPatientOrganizationBrandingPublic(hardcoded),
      },
    });
    expect(ctx.status).toBe('loading');
    expect(ctx.organizationId).toBe('kamilla-montenegro');
    expect(ctx.branding).toBeNull();
  });

  it('falha da API fora do registry não herda a marca do Método', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: 'kamilla-montenegro',
      fetchStatus: 'error',
      payload: null,
    });
    expect(ctx.branding).toBeNull();
    expect(ctx.organizationId).toBe('kamilla-montenegro');
  });

  it('fetch error com org no registry → fallback hardcoded oficial', () => {
    const ctx = resolvePatientOrganizationBrandingState({
      organizationStatus: 'resolved',
      organizationId: METODO,
      fetchStatus: 'error',
      payload: null,
    });
    expect(ctx.status).toBe('fallback');
    expect(ctx.source).toBe('default');
    expect(ctx.branding?.primaryColor).toBe('#4CCB7A');
  });
});

describe('fallbackPatientOrganizationBranding', () => {
  it('usa organizationBrandingDefaults da org do registry', () => {
    const ctx = fallbackPatientOrganizationBranding(METODO);
    expect(ctx.status).toBe('fallback');
    expect(ctx.source).toBe('default');
    expect(ctx.branding?.publicName).toBe(hardcoded.publicName);
    expect(ctx.branding?.secondaryColor).toBe(hardcoded.secondaryColor);
  });

  it('org fora do registry não inventa branding', () => {
    const ctx = fallbackPatientOrganizationBranding('desconhecida');
    expect(ctx.status).toBe('unresolved');
    expect(ctx.branding).toBeNull();
  });
});

describe('mapSourceLayerToPatientBrandingSource', () => {
  it('mapeia camadas oficiais sem criar regras novas', () => {
    expect(mapSourceLayerToPatientBrandingSource('firestore')).toBe('firestore');
    expect(mapSourceLayerToPatientBrandingSource('hardcoded')).toBe('default');
    expect(mapSourceLayerToPatientBrandingSource('platformSettings')).toBe('fallback');
    expect(mapSourceLayerToPatientBrandingSource('sourceMedico')).toBe('fallback');
  });
});

import { describe, expect, it } from 'vitest';
import {
  ORGANIZATION_METODO_PRIMARY_COLOR,
  ORGANIZATION_METODO_SECONDARY_COLOR,
} from './organizationBrandingDefaults';
import { METODO_ORGANIZATION } from './organizationRegistry';
import { DEFAULT_PUBLIC_PAGE_LOGO_SRC } from '@/lib/whiteLabel/publicPagesTheme';
import { metaUiBrandingCssVars, resolveMetaUiBranding } from './resolveMetaUiBranding';
import type { PatientOrganizationBrandingPublic } from './patientOrganizationBranding';
import { buildHardcodedOrganizationBranding } from './organizationBrandingDefaults';
import { toPatientOrganizationBrandingPublic } from './patientOrganizationBranding';

const metodoPublic = toPatientOrganizationBrandingPublic(
  buildHardcodedOrganizationBranding(METODO_ORGANIZATION),
);

function brandingValue(
  organizationId: string | null,
  branding: PatientOrganizationBrandingPublic | null,
  status: 'loading' | 'resolved' | 'fallback' | 'unresolved' | 'error' = 'resolved',
) {
  return {
    status,
    organizationId,
    branding,
    source: branding ? ('firestore' as const) : null,
  };
}

describe('resolveMetaUiBranding', () => {
  it('Caso A: Método completo igual aos defaults → valores oficiais (sem divergência)', () => {
    const ui = resolveMetaUiBranding(brandingValue('metodo', metodoPublic));
    expect(ui.publicName).toBe('Método Emagrecer');
    expect(ui.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(ui.secondaryColor).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(ui.logoUrl).toBe(DEFAULT_PUBLIC_PAGE_LOGO_SRC);
    expect(ui.divergences).toEqual([]);
  });

  it('Caso B: primary dinâmico + logo ausente → logo fallback oficial', () => {
    const ui = resolveMetaUiBranding(
      brandingValue('clinica_exemplo_wl', {
        ...metodoPublic,
        publicName: 'Clínica Exemplo WL',
        primaryColor: '#112233',
        logoMainUrl: null,
      }),
    );
    expect(ui.primaryColor).toBe('#112233');
    expect(ui.logoUrl).toBe(DEFAULT_PUBLIC_PAGE_LOGO_SRC);
    expect(ui.publicName).toBe('Clínica Exemplo WL');
  });

  it('Caso C: API indisponível / branding null → fallback oficial, UI renderiza', () => {
    const ui = resolveMetaUiBranding(brandingValue('metodo', null, 'error'));
    expect(ui.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(ui.secondaryColor).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(ui.publicName).toBe('Método Emagrecer');
    expect(ui.logoUrl).toBe(DEFAULT_PUBLIC_PAGE_LOGO_SRC);
  });

  it('Caso D: outra organização usa o branding dela, sem if metodo', () => {
    const ui = resolveMetaUiBranding(
      brandingValue('clinica_exemplo_wl', {
        ...metodoPublic,
        publicName: 'Clínica Exemplo WL',
        primaryColor: '#AABBCC',
        secondaryColor: '#010203',
        logoMainUrl: 'https://cdn.example/clinica-logo.png',
      }),
    );
    expect(ui.publicName).toBe('Clínica Exemplo WL');
    expect(ui.primaryColor).toBe('#AABBCC');
    expect(ui.secondaryColor).toBe('#010203');
    expect(ui.logoUrl).toBe('https://cdn.example/clinica-logo.png');
  });

  it('Caso E: loading → defaults, não bloqueia', () => {
    const ui = resolveMetaUiBranding(brandingValue(null, null, 'loading'));
    expect(ui.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(ui.secondaryColor).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(ui.divergences).toEqual([]);
  });

  it('hex inválido em outra org cai no fallback oficial', () => {
    const ui = resolveMetaUiBranding(
      brandingValue('clinica_exemplo_wl', {
        ...metodoPublic,
        primaryColor: 'verde',
        secondaryColor: '#010203',
      }),
    );
    expect(ui.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(ui.secondaryColor).toBe('#010203');
  });

  it('metaUiBrandingCssVars usa namespace --org- (não --brand- de System Colors)', () => {
    const ui = resolveMetaUiBranding(brandingValue('metodo', metodoPublic));
    const vars = metaUiBrandingCssVars(ui);
    expect(vars['--org-primary']).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(vars['--org-secondary']).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(Object.keys(vars).every((k) => k.startsWith('--org-'))).toBe(true);
  });

  it('Método com Firestore divergente NÃO redesenha (trava de segurança)', () => {
    const ui = resolveMetaUiBranding(
      brandingValue('metodo', {
        ...metodoPublic,
        primaryColor: '#FFFFFF',
        secondaryColor: '#000000',
        publicName: 'Outro Nome',
        logoMainUrl: 'https://cdn.example/outra-logo.png',
      }),
    );
    expect(ui.primaryColor).toBe(ORGANIZATION_METODO_PRIMARY_COLOR);
    expect(ui.secondaryColor).toBe(ORGANIZATION_METODO_SECONDARY_COLOR);
    expect(ui.publicName).toBe('Método Emagrecer');
    expect(ui.logoUrl).toBe(DEFAULT_PUBLIC_PAGE_LOGO_SRC);
    expect(ui.divergences.map((d) => d.field).sort()).toEqual(
      ['logoUrl', 'primaryColor', 'publicName', 'secondaryColor'].sort(),
    );
  });
});

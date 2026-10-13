import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getOrSyncMetodoImagensTemplate: vi.fn(),
  getMetodoOrganizationBrandingForDualRead: vi.fn(),
  loadOrganizationPublicBranding: vi.fn(),
}));

vi.mock('@/lib/metodo/metodoImagensService.server', () => ({
  getOrSyncMetodoImagensTemplate: mocks.getOrSyncMetodoImagensTemplate,
}));
vi.mock('@/lib/organization/getMetodoOrganizationBrandingForDualRead.server', () => ({
  getMetodoOrganizationBrandingForDualRead: mocks.getMetodoOrganizationBrandingForDualRead,
}));
vi.mock('@/lib/organization/loadOrganizationPublicBranding.server', () => ({
  loadOrganizationPublicBranding: mocks.loadOrganizationPublicBranding,
}));

import { resolveMedicoWhiteLabelWithMetodo } from '@/lib/server/resolveMedicoWhiteLabelWithMetodo.server';
import { parseOrganizationPublicBranding } from '@/lib/whiteLabel/organizationPublicIdentity';

describe('resolveMedicoWhiteLabelWithMetodo — rota por organização', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOrSyncMetodoImagensTemplate.mockResolvedValue(null);
    mocks.getMetodoOrganizationBrandingForDualRead.mockResolvedValue(null);
    mocks.loadOrganizationPublicBranding.mockResolvedValue(null);
  });

  it('outra organização com metodoImagensAtivo não lê template nem branding do Método', async () => {
    mocks.loadOrganizationPublicBranding.mockResolvedValue(
      parseOrganizationPublicBranding('kamilla-montenegro', { primaryColor: '#B2457A' }),
    );
    const wl = await resolveMedicoWhiteLabelWithMetodo({
      nome: 'Kamilla Montenegro',
      genero: 'F',
      organizationId: 'kamilla-montenegro',
      metodoImagensAtivo: true,
    });
    expect(mocks.loadOrganizationPublicBranding).toHaveBeenCalledWith('kamilla-montenegro');
    expect(mocks.getOrSyncMetodoImagensTemplate).not.toHaveBeenCalled();
    expect(mocks.getMetodoOrganizationBrandingForDualRead).not.toHaveBeenCalled();
    expect(wl.primaryColor).toBe('#B2457A');
    expect(wl.organizationIdentity?.organizationId).toBe('kamilla-montenegro');
  });

  it('falha no Firestore da organização resulta em identidade neutra', async () => {
    const wl = await resolveMedicoWhiteLabelWithMetodo({
      nome: 'Kamilla Montenegro',
      organizationId: 'kamilla-montenegro',
    });
    expect(wl.organizationIdentity?.footerLogoUrl).toBeNull();
    expect(wl.publicPages.dr.logoUrl).toBeNull();
    expect(mocks.getMetodoOrganizationBrandingForDualRead).not.toHaveBeenCalled();
  });

  it('médico do Método mantém o dual read e o template', async () => {
    const wl = await resolveMedicoWhiteLabelWithMetodo({
      nome: 'Ana',
      organizationId: 'metodo',
      metodoImagensAtivo: true,
    });
    expect(mocks.getOrSyncMetodoImagensTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.getMetodoOrganizationBrandingForDualRead).toHaveBeenCalledTimes(1);
    expect(mocks.loadOrganizationPublicBranding).not.toHaveBeenCalled();
    expect(wl.organizationIdentity).toBeUndefined();
  });

  it('médico legado com metodoImagensAtivo mantém o fluxo atual', async () => {
    const wl = await resolveMedicoWhiteLabelWithMetodo({ nome: 'Bruno', metodoImagensAtivo: true });
    expect(mocks.getOrSyncMetodoImagensTemplate).toHaveBeenCalledTimes(1);
    expect(mocks.getMetodoOrganizationBrandingForDualRead).toHaveBeenCalledTimes(1);
    expect(mocks.loadOrganizationPublicBranding).not.toHaveBeenCalled();
    expect(wl.organizationIdentity).toBeUndefined();
  });
});

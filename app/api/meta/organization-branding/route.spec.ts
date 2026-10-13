import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/server/firebaseAdminOftware', () => ({
  getAuthAdmin: vi.fn(),
}));

vi.mock('@/lib/organization/getOrganizationBranding.server', () => ({
  getOrganizationBranding: vi.fn(),
}));

vi.mock('@/lib/organization/resolveOrganizationDefinition.server', () => ({
  resolveOrganizationDefinition: vi.fn(),
}));

vi.mock('@/lib/organization/resolveOrganizationIdForAuthenticatedPaciente.server', () => ({
  resolveOrganizationIdForAuthenticatedPaciente: vi.fn(),
}));

vi.mock('@/lib/organization/resolveOrganizationIdFromRegisteredHosts.server', () => ({
  resolveOrganizationIdFromRegisteredHosts: vi.fn(),
}));

import { getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import { getOrganizationBranding } from '@/lib/organization/getOrganizationBranding.server';
import { resolveOrganizationDefinition } from '@/lib/organization/resolveOrganizationDefinition.server';
import { resolveOrganizationIdForAuthenticatedPaciente } from '@/lib/organization/resolveOrganizationIdForAuthenticatedPaciente.server';
import { resolveOrganizationIdFromRegisteredHosts } from '@/lib/organization/resolveOrganizationIdFromRegisteredHosts.server';
import { buildNewOrganizationBrandingSeed } from '@/lib/organization/buildNewOrganizationBrandingSeed';
import { GET } from '@/app/api/meta/organization-branding/route';

const kamillaOrg = {
  id: 'kamilla-montenegro',
  name: 'Kamilla Montenegro',
  kind: 'organization' as const,
  primaryOrigin: 'https://www.endocrinokamillamontenegro.com.br',
  hosts: ['www.endocrinokamillamontenegro.com.br'],
};

function request(url: string, authorization?: string) {
  return new NextRequest(url, {
    headers: authorization ? { Authorization: authorization } : {},
  });
}

describe('GET /api/meta/organization-branding', () => {
  beforeEach(() => {
    vi.mocked(getAuthAdmin).mockReset();
    vi.mocked(getOrganizationBranding).mockReset();
    vi.mocked(resolveOrganizationDefinition).mockReset();
    vi.mocked(resolveOrganizationIdForAuthenticatedPaciente).mockReset();
    vi.mocked(resolveOrganizationIdFromRegisteredHosts).mockReset();
  });

  it('usuário sem autorização não carrega branding', async () => {
    const res = await GET(request('https://www.endocrinokamillamontenegro.com.br/api/meta/organization-branding'));
    expect(res.status).toBe(401);
    expect(vi.mocked(getOrganizationBranding)).not.toHaveBeenCalled();
    expect(vi.mocked(resolveOrganizationIdForAuthenticatedPaciente)).not.toHaveBeenCalled();
  });

  it('paciente recebe a marca da própria organização e ignora organizationId da URL', async () => {
    vi.mocked(getAuthAdmin).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'pac-1', email: 'pac@example.com' }),
    } as never);
    vi.mocked(resolveOrganizationIdForAuthenticatedPaciente).mockResolvedValue('kamilla-montenegro');
    vi.mocked(resolveOrganizationIdFromRegisteredHosts).mockResolvedValue('metodo');
    vi.mocked(resolveOrganizationDefinition).mockResolvedValue(kamillaOrg);
    const stored = {
      ...buildNewOrganizationBrandingSeed(kamillaOrg),
      publicName: 'Endócrino Kamilla Montenegro',
      logoMainUrl: 'https://storage.example/kamilla/logo-main.png',
      primaryColor: '#7C3AED',
      secondaryColor: '#1E1B4B',
      sourceLayer: 'firestore' as const,
      organizationId: 'kamilla-montenegro',
    };
    vi.mocked(getOrganizationBranding).mockResolvedValue(stored);

    const res = await GET(
      request(
        'https://www.ometodoemagrecer.com.br/api/meta/organization-branding?organizationId=metodo',
        'Bearer token-paciente',
      ),
    );
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(vi.mocked(resolveOrganizationIdForAuthenticatedPaciente)).toHaveBeenCalledWith({
      uid: 'pac-1',
      email: 'pac@example.com',
    });
    expect(vi.mocked(getOrganizationBranding)).toHaveBeenCalledWith('kamilla-montenegro');
    expect(json.organizationId).toBe('kamilla-montenegro');
    expect(json.organizationMatch).toBe(false);
    expect(json.hostOrganizationId).toBe('metodo');
    expect(json.branding.logoMainUrl).toBe('https://storage.example/kamilla/logo-main.png');
    expect(json.branding.primaryColor).toBe('#7C3AED');
    expect(json.branding.publicName).toBe('Endócrino Kamilla Montenegro');
  });

  it('organização inexistente não recebe a marca do Método', async () => {
    vi.mocked(getAuthAdmin).mockReturnValue({
      verifyIdToken: vi.fn().mockResolvedValue({ uid: 'pac-2', email: 'b@example.com' }),
    } as never);
    vi.mocked(resolveOrganizationIdForAuthenticatedPaciente).mockResolvedValue('org-inexistente');
    vi.mocked(resolveOrganizationIdFromRegisteredHosts).mockResolvedValue(null);
    vi.mocked(resolveOrganizationDefinition).mockResolvedValue(null);

    const res = await GET(
      request('https://www.oftware.com.br/api/meta/organization-branding', 'Bearer token'),
    );
    const json = await res.json();

    expect(json.organizationId).toBe('org-inexistente');
    expect(json.branding).toBeNull();
    expect(vi.mocked(getOrganizationBranding)).not.toHaveBeenCalled();
  });
});

describe('GET profissional sem sessão', () => {
  it('metaadmin, personal, nutri e psi recusam antes de ler a marca', async () => {
    vi.resetModules();
    vi.doMock('@/lib/server/metaadminExamesImagemGate', () => ({
      requireMedicoMetaadmin: vi.fn(async () => ({
        ok: false,
        res: NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      })),
      getBearerToken: vi.fn(),
    }));
    vi.doMock('@/lib/metapersonal/requirePersonalMetaPersonal', () => ({
      requirePersonalMetaPersonal: vi.fn(async () =>
        NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      ),
    }));
    vi.doMock('@/lib/metanutri/requireNutricionistaMetaNutri', () => ({
      requireNutricionistaMetaNutri: vi.fn(async () =>
        NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      ),
    }));
    vi.doMock('@/lib/metapsi/requirePsiquiatraMetaPsi', () => ({
      requirePsiquiatraMetaPsi: vi.fn(async () =>
        NextResponse.json({ error: 'Não autenticado' }, { status: 401 }),
      ),
    }));
    vi.doMock('@/lib/organization/loadMemberOrganizationBranding.server', () => ({
      loadMemberOrganizationBranding: vi.fn(),
    }));
    vi.doMock('@/lib/server/firebaseAdminOftware', () => ({
      getFirestoreAdmin: vi.fn(),
    }));

    const { loadMemberOrganizationBranding } = await import(
      '@/lib/organization/loadMemberOrganizationBranding.server'
    );
    const metaadmin = await import('@/app/api/metaadmin/organization-branding/route');
    const personal = await import('@/app/api/metapersonal/organization-branding/route');
    const nutri = await import('@/app/api/metanutri/organization-branding/route');
    const psi = await import('@/app/api/metapsi/organization-branding/route');
    const req = new NextRequest('https://www.endocrinokamillamontenegro.com.br/api/organization-branding');

    expect((await metaadmin.GET(req)).status).toBe(401);
    expect((await personal.GET(req)).status).toBe(401);
    expect((await nutri.GET(req)).status).toBe(401);
    expect((await psi.GET(req)).status).toBe(401);
    expect(vi.mocked(loadMemberOrganizationBranding)).not.toHaveBeenCalled();
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildDefaultBryOAuthReturnUrl,
  consumeBryCloudOAuthReturn,
  parseBryCloudOAuthReturn,
  resolveBryOAuthReturnUrl,
  stripBryOAuthReturnParamsFromUrl,
} from '@/lib/metaadmin/bryCloudOAuthReturn';

describe('bryCloudOAuthReturn', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    vi.stubGlobal('sessionStorage', {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('resolveBryOAuthReturnUrl usa metaadmin sem forçar menu', () => {
    const url = resolveBryOAuthReturnUrl('https://www.oftware.com.br/', 'https://www.oftware.com.br');
    expect(url).toContain('/metaadmin');
    expect(url).not.toContain('menu=meu-perfil');
  });

  it('parseBryCloudOAuthReturn detecta connected', () => {
    const parsed = parseBryCloudOAuthReturn('?bry_cloud=connected');
    expect(parsed?.status).toBe('connected');
  });

  it('stripBryOAuthReturnParamsFromUrl remove bry_cloud e menu', () => {
    const clean = stripBryOAuthReturnParamsFromUrl(
      'https://www.oftware.com.br/metaadmin?menu=meu-perfil&bry_cloud=error&bry_message=fail&code=x'
    );
    expect(clean).toContain('/metaadmin');
    expect(clean).not.toContain('bry_cloud');
    expect(clean).not.toContain('menu=');
  });

  it('buildDefaultBryOAuthReturnUrl aponta para metaadmin sem menu', () => {
    expect(buildDefaultBryOAuthReturnUrl('https://www.oftware.com.br')).toBe(
      'https://www.oftware.com.br/metaadmin'
    );
  });

  it('consumeBryCloudOAuthReturn processa apenas uma vez por sessão', () => {
    const search = '?bry_cloud=error&bry_message=teste';
    expect(consumeBryCloudOAuthReturn(search)?.status).toBe('error');
    expect(consumeBryCloudOAuthReturn(search)).toBeNull();
  });
});

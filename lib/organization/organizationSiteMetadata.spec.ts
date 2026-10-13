import { describe, expect, it } from 'vitest';
import { ORGANIZATION_METODO_OG_FALLBACK_SRC } from './organizationBrandingDefaults';
import {
  resolveOrganizationShareImageUrl,
  withShareImageCacheBust,
} from './organizationSiteMetadata.server';

describe('resolveOrganizationShareImageUrl', () => {
  it('prioriza logo principal da Marca', () => {
    expect(
      resolveOrganizationShareImageUrl({
        logoMainUrl: 'https://cdn.example/logo-main.png',
        ogImageUrl: 'https://cdn.example/og.png',
      }),
    ).toBe('https://cdn.example/logo-main.png');
  });

  it('usa imagem de compartilhamento quando não há logo principal', () => {
    expect(
      resolveOrganizationShareImageUrl({
        logoMainUrl: null,
        ogImageUrl: 'https://cdn.example/og.png',
      }),
    ).toBe('https://cdn.example/og.png');
  });

  it('cai no fallback padrão do Método', () => {
    expect(
      resolveOrganizationShareImageUrl({
        logoMainUrl: null,
        ogImageUrl: null,
      }),
    ).toBe(ORGANIZATION_METODO_OG_FALLBACK_SRC);
  });
});

describe('withShareImageCacheBust', () => {
  it('anexa v= com updatedAt', () => {
    expect(withShareImageCacheBust('https://cdn.example/logo.png', '2026-07-20T12:00:00.000Z')).toBe(
      'https://cdn.example/logo.png?v=2026-07-20T12%3A00%3A00.000Z',
    );
  });

  it('inclui routeId no v= para diferenciar previews por rota', () => {
    expect(
      withShareImageCacheBust(
        'https://cdn.example/logo.png',
        '2026-07-20T12:00:00.000Z',
        'metanutri',
      ),
    ).toBe('https://cdn.example/logo.png?v=2026-07-20T12%3A00%3A00.000Z%3Ametanutri');
  });

  it('usa & quando a URL já tem query', () => {
    expect(withShareImageCacheBust('https://cdn.example/logo.png?x=1', 'abc')).toBe(
      'https://cdn.example/logo.png?x=1&v=abc',
    );
  });

  it('não altera URL sem updatedAt', () => {
    expect(withShareImageCacheBust('https://cdn.example/logo.png', null)).toBe(
      'https://cdn.example/logo.png',
    );
  });
});

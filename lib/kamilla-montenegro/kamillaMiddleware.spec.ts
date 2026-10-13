import { NextRequest } from 'next/server';
import { describe, expect, it } from 'vitest';
import { middleware } from '@/middleware';

function respond(pathname: string, host: string) {
  const request = new NextRequest(`https://${host}${pathname}`, {
    headers: {
      host,
      'x-forwarded-host': host,
      'x-forwarded-proto': 'https',
    },
  });
  return middleware(request);
}

function rewritePath(response: Response): string | null {
  const header = response.headers.get('x-middleware-rewrite');
  if (!header) return null;
  return new URL(header).pathname;
}

describe('middleware da home da Kamilla', () => {
  it('reescreve a raiz para a home institucional e mantém a URL', () => {
    const response = respond('/', 'www.endocrinokamillamontenegro.com');
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
    expect(rewritePath(response)).toBe('/kamillamontenegro');
    expect(response.headers.get('vary')).toContain('Host');
  });

  it('o apex faz a mesma reescrita', () => {
    const response = respond('/', 'endocrinokamillamontenegro.com');
    expect(rewritePath(response)).toBe('/kamillamontenegro');
  });

  it('a rota interna volta para a raiz uma única vez', () => {
    const redirected = respond('/kamillamontenegro', 'www.endocrinokamillamontenegro.com');
    expect(redirected.status).toBe(308);
    const location = redirected.headers.get('location') ?? '';
    expect(new URL(location).pathname).toBe('/');
    expect(new URL(location).host).toBe('www.endocrinokamillamontenegro.com');

    const followed = respond('/', 'www.endocrinokamillamontenegro.com');
    expect(followed.status).toBe(200);
    expect(followed.headers.get('location')).toBeNull();
    expect(rewritePath(followed)).toBe('/kamillamontenegro');
  });

  it.each(['/meta', '/metaadmin', '/metanutri', '/metapersonal'])(
    'mantém %s no domínio da Kamilla',
    (pathname) => {
      const response = respond(pathname, 'www.endocrinokamillamontenegro.com');
      expect(response.status).toBe(200);
      expect(response.headers.get('location')).toBeNull();
      expect(rewritePath(response)).toBeNull();
    },
  );

  it('não exibe a home do Método nem a da Rafaela neste domínio', () => {
    const metodo = respond('/metodo', 'www.endocrinokamillamontenegro.com');
    expect(metodo.status).toBe(308);
    expect(new URL(metodo.headers.get('location') ?? '').pathname).toBe('/');

    const rafaela = respond('/rafaelaalbuquerque', 'www.endocrinokamillamontenegro.com');
    expect(new URL(rafaela.headers.get('location') ?? '').host).toBe('www.endocrinokamillamontenegro.com');
  });

  it('preserva a raiz do Método, da Oftware e da Rafaela', () => {
    expect(rewritePath(respond('/', 'www.ometodoemagrecer.com.br'))).toBe('/metodo');
    expect(rewritePath(respond('/', 'www.rafaelaalbuquerque.com'))).toBe('/rafaelaalbuquerque');

    const oftware = respond('/', 'www.oftware.com.br');
    expect(oftware.headers.get('location')).toBeNull();
    expect(rewritePath(oftware)).toBeNull();
  });

  it('não trata o domínio da Kamilla como host do Método', () => {
    const response = respond('/', 'www.endocrinokamillamontenegro.com');
    expect(rewritePath(response)).not.toBe('/metodo');
  });
});

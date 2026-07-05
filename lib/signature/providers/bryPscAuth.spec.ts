import { describe, expect, it } from 'vitest';
import {
  buildIntegraApiKeyCandidates,
  buildIntegraApiKeyCandidatesForCallback,
  pickAuthorizationContextIdFromPayload,
  pickIntegraApiKeyFromAuthorizationUrl,
  pickIntegraApiKeyFromPayload,
  pickIntegraApiKeyFromSearchParams,
  isBryPscAuthInfoAuthorized,
  isIntegraSessionCredentialInKms,
  parseBryPscKmsDataFromAuthInfo,
  parseBryUserTokenFromAuthInfo,
  pickOAuthCodeFromSearchParams,
  pickStrictIntegraApiKeyFromPayload,
  isValidIntegraSessionApiKey,
  resolveIntegraSessionApiKeyForStorage,
} from '@/lib/signature/providers/bryPscAuth';

describe('bryPscAuth', () => {
  it('isValidIntegraSessionApiKey rejeita escopo e aceita token do link', () => {
    expect(isValidIntegraSessionApiKey('signature_session')).toBe(false);
    expect(isValidIntegraSessionApiKey('signature-session')).toBe(false);
    expect(isValidIntegraSessionApiKey('integra-session-token-abcdef12')).toBe(true);
  });

  it('resolveIntegraSessionApiKeyForStorage prioriza token do psc/link', () => {
    expect(
      resolveIntegraSessionApiKeyForStorage({
        pscLinkIntegraApiKey: 'stable-token-from-psc-link',
        authInfoWinningKey: 'one-time-redirect-code-xyz',
      })
    ).toBe('stable-token-from-psc-link');
  });

  it('pickIntegraApiKeyFromPayload extrai apiKey do link PSC', () => {
    expect(
      pickIntegraApiKeyFromPayload({
        link: 'https://psc.example/auth',
        apiKey: 'integra-cred-123',
      })
    ).toBe('integra-cred-123');
  });

  it('pickIntegraApiKeyFromSearchParams lê apiKey do redirect', () => {
    const params = new URLSearchParams(
      'state=abc&apiKey=integra-from-query&menu=meu-perfil'
    );
    expect(pickIntegraApiKeyFromSearchParams(params)).toBe('integra-from-query');
  });

  it('code no redirect PSC é credencial Integra, não OAuth', () => {
    const params = new URLSearchParams(
      'state=signed-state&code=psc-credential-uuid-12345678'
    );
    expect(pickOAuthCodeFromSearchParams(params)).toBeUndefined();
    expect(pickIntegraApiKeyFromSearchParams(params)).toBe('psc-credential-uuid-12345678');
    const candidates = buildIntegraApiKeyCandidates({ searchParams: params });
    expect(candidates[0]).toBe('psc-credential-uuid-12345678');
  });

  it('buildIntegraApiKeyCandidatesForCallback prioriza apiKey e contextId do pending', () => {
    const params = new URLSearchParams('code=redirect-code&state=x');
    const candidates = buildIntegraApiKeyCandidatesForCallback({
      searchParams: params,
      integraApiKeyFromPending: 'from-psc-link',
      authorizationContextIdFromPending: 'from-context-id',
    });
    expect(candidates[0]).toBe('from-psc-link');
    expect(candidates[1]).toBe('from-context-id');
    expect(candidates).toContain('redirect-code');
  });

  it('pickStrictIntegraApiKeyFromPayload lê token do POST /psc/link', () => {
    expect(
      pickStrictIntegraApiKeyFromPayload({
        token: 'integra-session-token-abcdef12',
        url: 'https://psc.example/oauth',
      })
    ).toBe('integra-session-token-abcdef12');
  });

  it('pickStrictIntegraApiKeyFromPayload não confunde com authorizationContextId', () => {
    expect(
      pickStrictIntegraApiKeyFromPayload({
        apiKey: 'strict-api-key-12345678',
        authorizationContextId: 'context-only-12345678',
      })
    ).toBe('strict-api-key-12345678');
    expect(
      pickAuthorizationContextIdFromPayload({
        authorizationContextId: 'context-only-12345678',
      })
    ).toBe('context-only-12345678');
  });

  it('pickIntegraApiKeyFromAuthorizationUrl extrai da query do link', () => {
    expect(
      pickIntegraApiKeyFromAuthorizationUrl(
        'https://psc.example/auth?apiKey=from-link-url&state=abc'
      )
    ).toBe('from-link-url');
  });

  it('buildIntegraApiKeyCandidates une query, pending e URL', () => {
    const candidates = buildIntegraApiKeyCandidates({
      searchParams: new URLSearchParams('integraId=from-redirect'),
      integraApiKeyFromPending: 'from-pending',
      authorizationUrlFromPending: 'https://psc.example/x?credential=from-url',
    });
    expect(candidates).toContain('from-redirect');
    expect(candidates).toContain('from-pending');
    expect(candidates).toContain('from-url');
  });

  it('pickIntegraApiKeyFromPayload lê identificador aninhado', () => {
    expect(
      pickIntegraApiKeyFromPayload({
        entidades: [{ identificador: 'nested-integra-id-12345678' }],
      })
    ).toBe('nested-integra-id-12345678');
  });

  it('parseBryUserTokenFromAuthInfo extrai JWT aninhado em entidades', () => {
    const jwt =
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.signature';
    const parsed = parseBryUserTokenFromAuthInfo(
      { entidades: [{ access_token: jwt, cpf: '12345678901' }] },
      'integra-session-key-12345678',
      'app-jwt-token'
    );
    expect(parsed?.accessToken).toBe(jwt);
    expect(parsed?.externalAccountId).toContain('12345678901');
  });

  it('parseBryPscKmsDataFromAuthInfo extrai token hex e CPF', () => {
    const kms = parseBryPscKmsDataFromAuthInfo(
      {
        token: 'a1b2c3d4e5f6789012345678abcdef',
        cpf: '12345678901',
      },
      { sessionApiKey: 'integra-session-key-12345678' }
    );
    expect(kms.token).toBe('a1b2c3d4e5f6789012345678abcdef');
    expect(kms.user).toBe('12345678901');
  });

  it('isIntegraSessionCredentialInKms detecta chave Integra repetida em kms_data', () => {
    const session = 'integra-session-key-48chars-base64xxxxxxxxxxxx';
    expect(isIntegraSessionCredentialInKms({ token: session }, session)).toBe(true);
    expect(isIntegraSessionCredentialInKms({ token: 'a1b2c3d4e5f6' }, session)).toBe(false);
  });

  it('parseBryPscKmsDataFromAuthInfo lê kms_data aninhado', () => {
    const kms = parseBryPscKmsDataFromAuthInfo(
      {
        signatureReady: true,
        kms_data: {
          token: 'deadbeefcafebabe',
          user: '12345678901',
        },
      },
      { sessionApiKey: 'integra-session-key-12345678' }
    );
    expect(kms.token).toBe('deadbeefcafebabe');
    expect(kms.user).toBe('12345678901');
  });

  it('parseBryUserTokenFromAuthInfo não usa token hex do PSC como Bearer', () => {
    const parsed = parseBryUserTokenFromAuthInfo(
      {
        token: 'a1b2c3d4e5f6789012345678abcdef',
        cpf: '12345678901',
        status: 'AUTORIZADO',
      },
      'integra-session-key-12345678',
      'app-jwt-token'
    );
    expect(parsed?.accessToken).toBe('app-jwt-token');
    expect(parsed?.externalAccountId).toBe('12345678901');
  });

  it('parseBryUserTokenFromAuthInfo usa JWT da aplicação quando PSC autorizado sem titular', () => {
    const parsed = parseBryUserTokenFromAuthInfo(
      { status: 'AUTORIZADO', cpf: '98765432100' },
      'integra-session-key-12345678',
      'app-jwt-token'
    );
    expect(isBryPscAuthInfoAuthorized({ status: 'AUTORIZADO' })).toBe(true);
    expect(isBryPscAuthInfoAuthorized({ autenticado: true })).toBe(true);
    expect(isBryPscAuthInfoAuthorized({ status: 'PENDENTE' })).toBe(false);
    expect(parsed?.accessToken).toBe('app-jwt-token');
    expect(parsed?.externalAccountId).toBe('98765432100');
  });

  it('pickOAuthCodeFromSearchParams ignora code (PSC) e lê authorizationCode legado', () => {
    expect(pickOAuthCodeFromSearchParams(new URLSearchParams('code=oauth-1'))).toBeUndefined();
    expect(
      pickOAuthCodeFromSearchParams(new URLSearchParams('authorizationCode=oauth-2'))
    ).toBe('oauth-2');
  });
});

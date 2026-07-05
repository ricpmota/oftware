/**
 * Server-only — tokens OAuth BRy (criptografia em repouso).
 * Não importar em `'use client'` ou registry client.
 */
import { decryptSecret, encryptSecret } from '@/lib/security/encryption';
import type { BryKmsData } from '@/lib/signature/providers/bryCloudApi';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export class BryOAuthTokenSecurityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BryOAuthTokenSecurityError';
  }
}

export type BryOAuthTokenPair = {
  accessToken: string;
  refreshToken?: string;
};

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/** Persistência no Firestore — apenas campos criptografados. */
export function buildBryConnectionWithEncryptedTokens(
  base: Omit<
    DoctorSignatureProviderConnection,
    'accessToken' | 'refreshToken' | 'accessTokenEncrypted' | 'refreshTokenEncrypted'
  >,
  tokens: BryOAuthTokenPair
): DoctorSignatureProviderConnection {
  const connection: DoctorSignatureProviderConnection = {
    ...base,
    provider: base.provider || BRY_CLOUD_PROVIDER_ID,
  };

  connection.accessTokenEncrypted = encryptSecret(tokens.accessToken);
  if (tokens.refreshToken?.trim()) {
    connection.refreshTokenEncrypted = encryptSecret(tokens.refreshToken.trim());
  }

  for (const key of Object.keys(connection) as (keyof DoctorSignatureProviderConnection)[]) {
    if (connection[key] === undefined) {
      delete connection[key];
    }
  }

  return connection;
}

/** Persiste `kms_data` do PSC obtido no connect (`GET /auth/info`). */
export function applyPscSigningKmsToConnection(
  connection: DoctorSignatureProviderConnection,
  pscKmsData?: BryKmsData | null
): DoctorSignatureProviderConnection {
  if (!pscKmsData) return connection;

  const user = pscKmsData.user?.trim();
  if (user) connection.pscSigningKmsUser = user;

  const uuidCert = pscKmsData.uuid_cert?.trim();
  if (uuidCert) connection.pscSigningKmsUuidCert = uuidCert;

  const token = pscKmsData.token?.trim();
  if (token) {
    connection.pscSigningKmsTokenEncrypted = encryptSecret(token);
  }

  return connection;
}

/** Recupera `kms_data` PSC salvo na conexão (server-side). */
export function resolvePscSigningKmsFromConnection(
  connection: DoctorSignatureProviderConnection | null | undefined
): BryKmsData {
  if (!connection) return {};

  const data: BryKmsData = {};
  const user = connection.pscSigningKmsUser?.trim();
  if (user) data.user = user;

  const uuidCert = connection.pscSigningKmsUuidCert?.trim();
  if (uuidCert) data.uuid_cert = uuidCert;

  if (connection.pscSigningKmsTokenEncrypted?.trim()) {
    data.token = decryptSecret(connection.pscSigningKmsTokenEncrypted.trim());
  }

  return data;
}

/** Persiste token do `POST /psc/link` para HUB `kms_data.token` (INTEGABRY). */
export function applyIntegraBrySigningTokenToConnection(
  connection: DoctorSignatureProviderConnection,
  signingToken?: string | null
): DoctorSignatureProviderConnection {
  const token = signingToken?.trim();
  if (!token) return connection;
  connection.integraBrySigningTokenEncrypted = encryptSecret(token);
  return connection;
}

/** Token Integra para assinatura HUB (server-side). */
export function resolveIntegraBrySigningTokenFromConnection(
  connection: DoctorSignatureProviderConnection | null | undefined
): string | null {
  if (!connection) return null;

  if (connection.integraBrySigningTokenEncrypted?.trim()) {
    return decryptSecret(connection.integraBrySigningTokenEncrypted.trim());
  }

  if (connection.pscSigningKmsTokenEncrypted?.trim()) {
    return decryptSecret(connection.pscSigningKmsTokenEncrypted.trim());
  }

  return null;
}

/** Resolve access token para chamadas à API BRy (server-side). */
export function resolveBryAccessTokenFromConnection(
  connection: DoctorSignatureProviderConnection | null | undefined
): string | null {
  if (!connection) return null;

  if (connection.accessTokenEncrypted?.trim()) {
    return decryptSecret(connection.accessTokenEncrypted.trim());
  }

  const legacy = connection.accessToken?.trim();
  if (!legacy) return null;

  if (isProduction()) {
    throw new BryOAuthTokenSecurityError(
      'Token BRy em texto plano não é permitido em produção. Reconecte o BRy Cloud em Meu Perfil.'
    );
  }

  return legacy;
}

/** Resolve refresh token (server-side). */
export function resolveBryRefreshTokenFromConnection(
  connection: DoctorSignatureProviderConnection | null | undefined
): string | null {
  if (!connection) return null;

  if (connection.refreshTokenEncrypted?.trim()) {
    return decryptSecret(connection.refreshTokenEncrypted.trim());
  }

  const legacy = connection.refreshToken?.trim();
  if (!legacy) return null;

  if (isProduction()) {
    throw new BryOAuthTokenSecurityError(
      'Refresh token BRy em texto plano não é permitido em produção. Reconecte o BRy Cloud.'
    );
  }

  return legacy;
}

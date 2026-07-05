import { fetchBryApplicationAccessToken } from '@/lib/signature/providers/bryCloudApi';
import type { BryKmsData } from '@/lib/signature/providers/bryCloudApi';
import { getBryCloudEnvConfig, type BryCloudEnvConfig } from '@/lib/signature/providers/bryCloudEnv';
import {
  assertPscKmsReadyForPdfSigning,
  BryPscAuthInfoError,
  buildPscKmsDataForSigning,
  fetchBryPscAuthInfo,
  hasPscKmsSigningMaterial,
  isValidIntegraSessionApiKey,
  mapBryConnectErrorMessage,
  maskIntegraCredentialHint,
  normalizeCpfDigits,
} from '@/lib/signature/providers/bryPscAuth';

export { normalizeCpfDigits, hasPscKmsSigningMaterial };
import {
  resolveBryAccessTokenFromConnection,
  resolvePscSigningKmsFromConnection,
} from '@/lib/security/bryOAuthTokens.server';
import type { DoctorSignatureProviderConnection } from '@/types/signatureProviderAdapter';

export const BRY_KMS_TYPE_CLOUD = 'BRYKMS' as const;
export const BRY_KMS_TYPE_PSC = 'PSC' as const;

export type BryPdfSignKmsType = typeof BRY_KMS_TYPE_CLOUD | typeof BRY_KMS_TYPE_PSC;

/** Credencial Integra — apenas para `GET /auth/info`, não para `pdf/assinar`. */
export function resolveIntegraSessionApiKey(
  connection?: DoctorSignatureProviderConnection | null
): string | undefined {
  const candidates = [
    connection?.integraSessionApiKey,
    connection?.authorizationContextId,
    (connection as { integraApiKey?: string } | undefined)?.integraApiKey,
  ];
  for (const candidate of candidates) {
    if (isValidIntegraSessionApiKey(candidate)) return candidate!.trim();
  }
  return undefined;
}

export function usesPscIntegraSigning(connection?: DoctorSignatureProviderConnection | null): boolean {
  return !!(connection?.pscProvider?.trim() || connection?.pscName?.trim());
}

export function resolveBryPdfSignKmsType(
  connection?: DoctorSignatureProviderConnection | null
): BryPdfSignKmsType {
  return usesPscIntegraSigning(connection) ? BRY_KMS_TYPE_PSC : BRY_KMS_TYPE_CLOUD;
}

export function buildBryPdfSignKmsData(
  connection: DoctorSignatureProviderConnection | undefined,
  kmsType: BryPdfSignKmsType
): BryKmsData {
  const cpf = normalizeCpfDigits(connection?.externalAccountId);
  const data: BryKmsData = {};
  if (cpf) data.user = cpf;
  return data;
}

/** PSC com `signatureReady`: um único `kms_data` (ex.: `{ user: CPF }`) dentro de `dados_assinatura`. */
export function buildPscKmsDataSignAttempts(
  base: BryKmsData,
  options?: { signatureReady?: boolean }
): BryKmsData[] {
  if (options?.signatureReady === true) {
    const cpf = normalizeCpfDigits(base.user);
    return cpf ? [{ user: cpf }] : [{}];
  }

  const variants: BryKmsData[] = [];
  const seen = new Set<string>();
  const push = (data: BryKmsData) => {
    const key = JSON.stringify(data);
    if (seen.has(key)) return;
    seen.add(key);
    variants.push(data);
  };

  if (base.token && base.user) push({ token: base.token, user: base.user });
  if (base.token) push({ token: base.token });
  if (base.uuid_cert && base.user) push({ uuid_cert: base.uuid_cert, user: base.user });
  if (base.uuid_cert) push({ uuid_cert: base.uuid_cert });
  if (base.user) push({ user: base.user });
  push(base);

  return variants;
}

export type PscPdfSigningCredentials = {
  /** JWT da aplicação BRy Cloud (`client_credentials`) — Bearer em `pdf/assinar`. */
  accessToken: string;
  kmsData: BryKmsData;
  signatureReady?: boolean;
};

function resolveTitularCpfForAuthInfo(connection?: DoctorSignatureProviderConnection): string | undefined {
  const stored = resolvePscSigningKmsFromConnection(connection);
  return (
    normalizeCpfDigits(stored.user) ||
    normalizeCpfDigits(connection?.pscSigningKmsUser) ||
    normalizeCpfDigits(connection?.externalAccountId)
  );
}

/**
 * Valida sessão PSC via `GET /auth/info` (com `X-API-KEY`) e prepara assinatura HUB com JWT da app.
 */
export async function preparePscPdfSigningCredentials(params: {
  connection?: DoctorSignatureProviderConnection;
  config?: BryCloudEnvConfig;
}): Promise<PscPdfSigningCredentials> {
  const integraApiKey = resolveIntegraSessionApiKey(params.connection);
  if (!integraApiKey || !isValidIntegraSessionApiKey(integraApiKey)) {
    throw new Error(
      'Sessão PSC expirada ou incompleta. Reconecte o provedor em Meu Perfil e autorize novamente no app do certificado.'
    );
  }

  const config = params.config ?? getBryCloudEnvConfig();

  console.info('[bry_pdf_sign] consultando auth/info antes da assinatura PSC', {
    integraKeyHint: maskIntegraCredentialHint(integraApiKey),
  });

  try {
    const [appToken, refreshed] = await Promise.all([
      fetchBryApplicationAccessToken(config),
      fetchBryPscAuthInfo({
        integraApiKey,
        config,
        cpf: resolveTitularCpfForAuthInfo(params.connection),
        retryAttempts: 3,
        initialDelayMs: 0,
      }),
    ]);

    const kmsData = buildPscKmsDataForSigning({
      pscKmsData: refreshed.pscKmsData,
      connection: params.connection,
      authInfoExternalId: refreshed.externalAccountId,
    });

    if (kmsData.token) delete kmsData.token;

    assertPscKmsReadyForPdfSigning({
      kmsData,
      signatureReady: refreshed.signatureReady,
      integraApiKey: refreshed.sessionApiKey,
    });

    console.info('[bry_pdf_sign] credenciais PSC para HUB Signer', {
      integraKeyHint: maskIntegraCredentialHint(integraApiKey),
      signatureReady: refreshed.signatureReady,
      kmsDataKeys: Object.keys(kmsData),
    });

    return {
      accessToken: appToken.accessToken,
      kmsData,
      signatureReady: refreshed.signatureReady,
    };
  } catch (error) {
    if (error instanceof BryPscAuthInfoError || error instanceof Error) {
      throw new Error(mapBryConnectErrorMessage(error));
    }
    throw error;
  }
}

export async function resolveBryPdfSignAccessToken(params: {
  connection?: DoctorSignatureProviderConnection;
  kmsType: BryPdfSignKmsType;
  config?: BryCloudEnvConfig;
}): Promise<string> {
  if (params.kmsType === BRY_KMS_TYPE_PSC) {
    const prepared = await preparePscPdfSigningCredentials({
      connection: params.connection,
      config: params.config,
    });
    return prepared.accessToken;
  }

  const stored = resolveBryAccessTokenFromConnection(params.connection);
  if (!stored) {
    throw new Error('Token BRy Cloud ausente. Reconecte o provedor em Meu Perfil.');
  }
  return stored;
}

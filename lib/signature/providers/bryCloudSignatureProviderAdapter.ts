import type { SignatureProviderAdapter } from '@/lib/signature/providers/SignatureProviderAdapter';
import {
  isValidIntegraSessionApiKey,
  pickIntegraApiKeyFromAuthorizationUrl,
} from '@/lib/signature/providers/bryPscAuth';
import {
  buildBryPendingAuthRecord,
  saveBryPendingAuth,
} from '@/lib/signature/providers/bryPendingAuth.server';
import {
  downloadBrySignedPdfUrl,
  exchangeBryAuthorizationCode,
  fetchBryApplicationAccessToken,
  getBrySignatureOperationStatus,
  requestBryAuthorizationUrl,
  submitBryPdfSignature,
} from '@/lib/signature/providers/bryCloudApi';
import {
  buildBryPdfSignKmsData,
  resolveBryPdfSignAccessToken,
  resolveBryPdfSignKmsType,
  usesPscIntegraSigning,
} from '@/lib/signature/providers/bryPdfSigning';
import { submitBryHubIntegraHubSignature } from '@/lib/signature/providers/bryHubPdfSigning';
import {
  createBryOAuthStatePayload,
  signBryOAuthState,
  verifyBryOAuthState,
} from '@/lib/signature/providers/bryCloudOAuthState';
import {
  bryCloudMissingEnvMessage,
  getBryCloudEnvConfig,
  isBryCloudEnvConfigured,
} from '@/lib/signature/providers/bryCloudEnv';
import {
  BryOAuthTokenSecurityError,
  resolveBryAccessTokenFromConnection,
  resolveIntegraBrySigningTokenFromConnection,
} from '@/lib/security/bryOAuthTokens.server';
import {
  BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
  expireDoctorBrySignatureSession,
  isBryOperationExpiredOrCompletedError,
  validateSignatureSessionForSigning,
} from '@/lib/signature/brySignatureSession.server';
import { notConfiguredAdapterError } from '@/lib/signature/providers/signatureProviderErrors';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';
import type {
  DoctorSignatureProviderConnection,
  GetSignatureStatusResult,
  SignatureRequestStatus,
  StartAuthorizationParams,
} from '@/types/signatureProviderAdapter';

function envGuard():
  | { ok: true; config: ReturnType<typeof getBryCloudEnvConfig> }
  | ReturnType<typeof notConfiguredAdapterError> {
  if (!isBryCloudEnvConfigured()) {
    return notConfiguredAdapterError(bryCloudMissingEnvMessage());
  }
  return { ok: true, config: getBryCloudEnvConfig() };
}

function resolveAccessTokenForBryApi(params: {
  connection?: DoctorSignatureProviderConnection;
  accessToken?: string;
}): string | null {
  try {
    if (params.connection) {
      return resolveBryAccessTokenFromConnection(params.connection);
    }
    const direct = params.accessToken?.trim();
    if (!direct) return null;
    if (process.env.NODE_ENV === 'production') {
      throw new BryOAuthTokenSecurityError(
        'Token BRy deve estar criptografado na conexão do médico (produção).'
      );
    }
    return direct;
  } catch (e) {
    if (e instanceof BryOAuthTokenSecurityError) throw e;
    return null;
  }
}

function mapBryStatusToRequestStatus(bryStatus: string): SignatureRequestStatus {
  const s = bryStatus.toLowerCase();
  if (s.includes('sign') && s.includes('complete')) return 'signed';
  if (s === 'signed' || s.includes('conclu')) return 'signed';
  if (s.includes('fail') || s.includes('erro')) return 'failed';
  if (s.includes('cancel')) return 'cancelled';
  return 'pending_provider_authorization';
}

/**
 * BRy Cloud — certificado em nuvem (BRYKMS) via Integra BRy / HUB Signer (INTEGABRY + PSC).
 * Tokens OAuth em `doctorSignatureProvider.connection` (campos `*Encrypted`).
 */
export const bryCloudSignatureProviderAdapter: SignatureProviderAdapter = {
  providerId: BRY_CLOUD_PROVIDER_ID,

  async startAuthorization(params: StartAuthorizationParams) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    const medicoId = params.doctorId?.trim();
    if (!medicoId) {
      return { ok: false, error: 'Identificador do médico ausente.', code: 'provider_error' };
    }

    try {
      const signatureProvider = params.pscProvider?.trim() || undefined;
      const passedState = params.state?.trim();
      let statePayload;

      if (passedState) {
        const verified = verifyBryOAuthState(passedState, guard.config.clientSecret);
        if (!verified) {
          return {
            ok: false,
            error: 'Sessão de autorização inválida. Tente conectar novamente.',
            code: 'provider_error',
          };
        }
        statePayload = verified;
      } else {
        statePayload = createBryOAuthStatePayload(medicoId, params.returnUrl, signatureProvider);
      }

      const state = passedState || signBryOAuthState(statePayload, guard.config.clientSecret);

      const linkResult = await requestBryAuthorizationUrl({
        config: guard.config,
        state,
        returnUrl: params.returnUrl,
        cpf: params.cpf,
        signatureProvider,
      });

      const integraApiKeyCandidate =
        linkResult.integraApiKey ||
        pickIntegraApiKeyFromAuthorizationUrl(linkResult.authorizationUrl);
      const integraApiKey = isValidIntegraSessionApiKey(integraApiKeyCandidate)
        ? integraApiKeyCandidate
        : undefined;

      await saveBryPendingAuth(
        buildBryPendingAuthRecord({
          medicoId,
          integraApiKey,
          integraBrySigningToken: linkResult.integraBrySigningToken,
          authorizationContextId: linkResult.authorizationContextId,
          authorizationUrl: linkResult.authorizationUrl,
          nonce: statePayload.nonce,
          pscProvider: signatureProvider,
          pscLinkResponseKeys: linkResult.pscLinkResponseKeys,
        })
      );

      if (!integraApiKey) {
        console.warn('[bry_cloud] POST /psc/link sem apiKey explícita; credencial será resolvida no callback', {
          medicoId,
          pscProvider: signatureProvider,
          pscLinkResponseKeys: linkResult.pscLinkResponseKeys,
          hasSigningToken: !!linkResult.integraBrySigningToken,
        });
      } else {
        console.info('[bry_cloud] POST /psc/link credencial salva no pending', {
          medicoId,
          pscProvider: signatureProvider,
          hasAuthorizationContextId: !!linkResult.authorizationContextId,
          hasSigningToken: !!linkResult.integraBrySigningToken,
          pscLinkResponseKeys: linkResult.pscLinkResponseKeys,
        });
      }

      return {
        ok: true,
        data: {
          authorizationUrl: linkResult.authorizationUrl,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao iniciar autorização BRy Cloud.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async submitPdfForSignature(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    const prescriptionMetadata = params.prescriptionMetadata ?? {
      crm: '',
      crmUf: '',
      specialty: '',
    };

    if (usesPscIntegraSigning(params.connection)) {
      let appAccessToken: string;
      try {
        const appToken = await fetchBryApplicationAccessToken(guard.config);
        appAccessToken = appToken.accessToken;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Não foi possível obter token da aplicação BRy.';
        return { ok: false, error: message, code: 'provider_error' };
      }

      const sessionCheck = validateSignatureSessionForSigning(params.connection);
      if (!sessionCheck.ok) {
        return { ok: false, error: sessionCheck.message, code: 'provider_error' };
      }

      const integraSigningToken = resolveIntegraBrySigningTokenFromConnection(params.connection);
      if (!integraSigningToken) {
        return {
          ok: false,
          error: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
          code: 'provider_error',
        };
      }

      try {
        const signResult = await submitBryHubIntegraHubSignature({
          accessToken: appAccessToken,
          integraServiceUrl: guard.config.apiUrl,
          integraSigningToken,
          originalPdfUrl: params.originalPdfUrl,
          originalPdfBuffer: params.originalPdfBuffer,
          prescriptionMetadata,
          requestId: params.requestId,
          config: guard.config,
        });

        const requestId = params.requestId?.trim() || signResult.operationId || `bry-${Date.now()}`;
        const status = mapBryStatusToRequestStatus(signResult.status);

        return {
          ok: true,
          data: {
            requestId,
            status,
            signedPdfUrl: signResult.signedPdfUrl,
            signedPdfBase64: signResult.signedPdfBase64,
            externalSignatureId: signResult.operationId,
            operationId: signResult.operationId,
          },
        };
      } catch (e) {
        if (isBryOperationExpiredOrCompletedError(e)) {
          await expireDoctorBrySignatureSession(params.doctorId);
          return {
            ok: false,
            error: BRY_SIGNATURE_SESSION_EXPIRED_MESSAGE,
            code: 'provider_error',
          };
        }
        const message = e instanceof Error ? e.message : 'Erro ao enviar PDF para assinatura BRy.';
        return { ok: false, error: message, code: 'provider_error' };
      }
    }

    const kmsType = resolveBryPdfSignKmsType(params.connection);

    let accessToken: string;
    let kmsData;

    try {
      accessToken = await resolveBryPdfSignAccessToken({
        connection: params.connection,
        kmsType,
        config: guard.config,
      });
      kmsData = buildBryPdfSignKmsData(params.connection, kmsType);
    } catch (e) {
      const message =
        e instanceof BryOAuthTokenSecurityError
          ? e.message
          : e instanceof Error
            ? e.message
            : 'Token BRy inválido. Reconecte o BRy Cloud em Meu Perfil.';
      return { ok: false, error: message, code: 'provider_error' };
    }

    if (!kmsData.user && !kmsData.uuid_cert && !kmsData.token) {
      return {
        ok: false,
        error:
          'Conta BRy sem identificação do titular. Reconecte o BRy Cloud para vincular o certificado em nuvem.',
        code: 'provider_error',
      };
    }

    try {
      const signResult = await submitBryPdfSignature({
        accessToken,
        kmsType,
        originalPdfUrl: params.originalPdfUrl,
        originalPdfBuffer: params.originalPdfBuffer,
        kmsData,
        documentType: params.documentType,
        config: guard.config,
      });

      const requestId = params.requestId?.trim() || signResult.operationId || `bry-${Date.now()}`;
      const status = mapBryStatusToRequestStatus(signResult.status);

      return {
        ok: true,
        data: {
          requestId,
          status,
          signedPdfUrl: signResult.signedPdfUrl,
          signedPdfBase64: signResult.signedPdfBase64,
          externalSignatureId: signResult.operationId,
          operationId: signResult.operationId,
        },
      };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao enviar PDF para assinatura BRy.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async getSignatureStatus(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    const operationId = params.externalSignatureId?.trim() || params.requestId?.trim();

    let accessToken: string | null;
    try {
      accessToken = resolveAccessTokenForBryApi({
        connection: params.connection,
        accessToken: params.accessToken,
      });
    } catch (e) {
      const message =
        e instanceof BryOAuthTokenSecurityError ? e.message : 'Token BRy inválido.';
      return { ok: false, error: message, code: 'provider_error' };
    }

    if (!accessToken || !operationId) {
      return {
        ok: false,
        error: 'Operação BRy ou token de acesso ausente.',
        code: 'provider_error',
      };
    }

    try {
      const op = await getBrySignatureOperationStatus({
        accessToken,
        operationId,
        config: guard.config,
      });

      const result: GetSignatureStatusResult = {
        requestId: params.requestId,
        status: mapBryStatusToRequestStatus(op.status),
        signedPdfUrl: op.signedPdfUrl,
      };

      return { ok: true, data: result };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao consultar status BRy.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },

  async downloadSignedPdf(params) {
    const guard = envGuard();
    if (!guard.ok) return guard;

    let accessToken: string | null;
    try {
      accessToken = resolveAccessTokenForBryApi({
        connection: params.connection,
        accessToken: params.accessToken,
      });
    } catch (e) {
      const message =
        e instanceof BryOAuthTokenSecurityError ? e.message : 'Token BRy inválido.';
      return { ok: false, error: message, code: 'provider_error' };
    }

    if (!accessToken) {
      return { ok: false, error: 'Token BRy Cloud ausente.', code: 'provider_error' };
    }

    try {
      const signedPdfUrl = await downloadBrySignedPdfUrl({
        accessToken,
        signedPdfUrl: params.signedPdfUrl,
        operationId: params.requestId,
        config: guard.config,
      });
      return { ok: true, data: { signedPdfUrl } };
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Erro ao obter PDF assinado BRy.';
      return { ok: false, error: message, code: 'provider_error' };
    }
  },
};

export { exchangeBryAuthorizationCode };

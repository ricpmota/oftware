import { NextRequest, NextResponse } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { buildBryCloudConnectedProvider } from '@/lib/metaadmin/buildBryCloudConnectedProvider';
import { resolveBryOAuthReturnUrl } from '@/lib/metaadmin/bryCloudOAuthReturn';
import { doctorSignatureProviderFormFromStored } from '@/lib/metaadmin/doctorSignatureProviders';
import {
  applyIntegraBrySigningTokenToConnection,
  applyPscSigningKmsToConnection,
  buildBryConnectionWithEncryptedTokens,
} from '@/lib/security/bryOAuthTokens.server';
import { EncryptionConfigError, isTokenEncryptionConfigured } from '@/lib/security/encryption';
import { exchangeBryAuthorizationCode } from '@/lib/signature/providers/bryCloudSignatureProviderAdapter';
import { verifyBryOAuthState } from '@/lib/signature/providers/bryCloudOAuthState';
import { getBryCloudEnvConfig, isBryCloudEnvConfigured } from '@/lib/signature/providers/bryCloudEnv';
import { applyNewSignatureSessionToConnection } from '@/lib/signature/brySignatureSession.server';
import {
  deleteBryPendingAuthByNonce,
  readBryPendingAuthByMedicoId,
  readBryPendingAuthByNonce,
} from '@/lib/signature/providers/bryPendingAuth.server';
import {
  BryPscAuthInfoError,
  buildIntegraApiKeyCandidatesForCallback,
  buildPscKmsDataForSigning,
  fetchBryPscAuthInfoWithCandidates,
  hasPscKmsSigningSecret,
  mapBryConnectErrorMessage,
  maskIntegraCredentialHint,
  normalizeCpfDigits,
  pickOAuthCodeFromSearchParams,
  resolveIntegraSessionApiKeyForStorage,
} from '@/lib/signature/providers/bryPscAuth';
import {
  normalizeSignatureProviderId,
  resolveBryPscNameFromProvider,
} from '@/lib/signature/providers/bryPscNameMap';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export const runtime = 'nodejs';

function redirectToProfile(
  returnUrl: string | undefined,
  params: Record<string, string>,
  requestUrl?: string
): NextResponse {
  const origin = requestUrl ? new URL(requestUrl).origin : undefined;
  const target = new URL(resolveBryOAuthReturnUrl(returnUrl, origin));
  for (const [k, v] of Object.entries(params)) {
    target.searchParams.set(k, v);
  }
  return NextResponse.redirect(target.toString());
}

export async function GET(request: NextRequest) {
  const config = getBryCloudEnvConfig();
  const requestUrl = request.url;
  const { searchParams } = new URL(requestUrl);
  const oauthError = searchParams.get('error')?.trim();
  const state = searchParams.get('state')?.trim();

  if (oauthError) {
    return redirectToProfile(
      undefined,
      { bry_cloud: 'error', bry_message: oauthError },
      requestUrl
    );
  }

  if (!isBryCloudEnvConfigured() || !state) {
    return redirectToProfile(
      undefined,
      {
        bry_cloud: 'error',
        bry_message: 'Parâmetros de retorno BRy inválidos. Verifique SIGNATURE_BRY_REDIRECT_URI.',
      },
      requestUrl
    );
  }

  if (!isTokenEncryptionConfigured()) {
    return redirectToProfile(
      undefined,
      {
        bry_cloud: 'error',
        bry_message: 'Criptografia de tokens não configurada no servidor.',
      },
      requestUrl
    );
  }

  const statePayload = verifyBryOAuthState(state, config.clientSecret);
  if (!statePayload) {
    return redirectToProfile(
      undefined,
      {
        bry_cloud: 'error',
        bry_message: 'Sessão de autorização expirada. Tente conectar novamente.',
      },
      requestUrl
    );
  }

  let callbackDebug: Record<string, unknown> = {
    hasPending: false,
    candidateCount: 0,
    hasPendingIntegraKey: false,
    hasPendingContextId: false,
  };

  try {
    const pending =
      (await readBryPendingAuthByNonce(statePayload.nonce)) ||
      (await readBryPendingAuthByMedicoId(statePayload.medicoId));

    const integraCandidates = buildIntegraApiKeyCandidatesForCallback({
      searchParams,
      integraApiKeyFromPending: pending?.integraApiKey,
      authorizationContextIdFromPending: pending?.authorizationContextId,
      authorizationUrlFromPending: pending?.authorizationUrl,
    });

    callbackDebug = {
      hasPending: !!pending,
      candidateCount: integraCandidates.length,
      hasPendingIntegraKey: !!pending?.integraApiKey?.trim(),
      hasPendingContextId: !!pending?.authorizationContextId?.trim(),
      pscLinkResponseKeys: pending?.pscLinkResponseKeys,
      candidateHints: integraCandidates.map((k) => maskIntegraCredentialHint(k)),
      redirectUri: getBryCloudEnvConfig().redirectUri,
    };

    const db = getFirestoreAdmin();
    const medicoRef = db.collection('medicos').doc(statePayload.medicoId);
    const medSnap = await medicoRef.get();
    if (!medSnap.exists) {
      return redirectToProfile(
        statePayload.returnUrl,
        { bry_cloud: 'error', bry_message: 'Médico não encontrado.' },
        requestUrl
      );
    }

    const medicoCpfForAuth =
      typeof medSnap.data()?.cpfPessoal === 'string' ? medSnap.data()!.cpfPessoal : undefined;

    let tokens;
    let resolvedIntegraApiKey: string | undefined;
    let pscKmsDataFromConnect;
    let pscSignatureReady: boolean | undefined;

    if (integraCandidates.length > 0) {
      const pscAuth = await fetchBryPscAuthInfoWithCandidates({
        candidates: integraCandidates,
        config,
        cpf: medicoCpfForAuth,
      });
      tokens = pscAuth.tokens;
      resolvedIntegraApiKey = pscAuth.integraApiKey;
      pscKmsDataFromConnect = pscAuth.pscKmsData;
      pscSignatureReady = pscAuth.signatureReady;
      callbackDebug.authInfoAttempts = pscAuth.authInfoAttempts;
    } else {
      const oauthCode = pickOAuthCodeFromSearchParams(searchParams);
      if (oauthCode) {
        tokens = await exchangeBryAuthorizationCode({ code: oauthCode, config });
      } else {
        console.error('[signature/bry/callback] sem credencial Integra', {
          medicoId: statePayload.medicoId,
          hasPending: !!pending,
          queryKeys: [...searchParams.keys()],
        });
        return redirectToProfile(
          statePayload.returnUrl,
          {
            bry_cloud: 'error',
            bry_message:
              'Não foi possível localizar a credencial Integra após o PSC. Clique em Conectar provedor novamente e autorize no app do certificado.',
          },
          requestUrl
        );
      }
    }

    const expiresAt =
      tokens.expiresIn != null
        ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
        : undefined;

    const stored = medSnap.data()?.doctorSignatureProvider;
    const storedRecord =
      stored && typeof stored === 'object'
        ? (stored as { provider?: string; connection?: { pscProvider?: string } })
        : null;

    const pscProviderKey =
      normalizeSignatureProviderId(statePayload.pscProvider) ||
      normalizeSignatureProviderId(pending?.pscProvider) ||
      normalizeSignatureProviderId(storedRecord?.connection?.pscProvider) ||
      normalizeSignatureProviderId(storedRecord?.provider);
    const pscName = pscProviderKey
      ? resolveBryPscNameFromProvider(pscProviderKey) ?? undefined
      : undefined;

    const sessionApiKeyToStore = resolveIntegraSessionApiKeyForStorage({
      pscLinkIntegraApiKey: pending?.integraApiKey,
      authInfoWinningKey: resolvedIntegraApiKey,
    });

    if (!sessionApiKeyToStore) {
      console.error('[signature/bry/callback] sem credencial Integra válida para persistir', {
        medicoId: statePayload.medicoId,
        pendingKeyHint: maskIntegraCredentialHint(pending?.integraApiKey),
        winningKeyHint: maskIntegraCredentialHint(resolvedIntegraApiKey),
        pscLinkResponseKeys: pending?.pscLinkResponseKeys,
      });
      return redirectToProfile(
        statePayload.returnUrl,
        {
          bry_cloud: 'error',
          bry_message:
            'Não foi possível validar a credencial Integra após o SafeID. Clique em Conectar novamente; se persistir, verifique o CPF em Meu Perfil e a configuração no portal BRy Cloud.',
        },
        requestUrl
      );
    }

    callbackDebug.storedSessionKeyHint = maskIntegraCredentialHint(sessionApiKeyToStore);

    const medicoData = medSnap.data();
    const titularCpf =
      normalizeCpfDigits(pscKmsDataFromConnect?.user) ||
      normalizeCpfDigits(tokens.externalAccountId) ||
      normalizeCpfDigits(
        typeof medicoData?.cpfPessoal === 'string' ? medicoData.cpfPessoal : undefined
      );
    const kmsToStore = buildPscKmsDataForSigning({
      pscKmsData: pscKmsDataFromConnect ?? {},
      authInfoExternalId: titularCpf,
    });

    const signingTokenFromLink = pending?.integraBrySigningToken?.trim();

    if (!signingTokenFromLink && !hasPscKmsSigningSecret(kmsToStore)) {
      console.warn('[signature/bry/callback] connect sem token de assinatura Integra', {
        medicoId: statePayload.medicoId,
        kmsDataKeys: Object.keys(kmsToStore),
        authInfoAttempts: callbackDebug.authInfoAttempts,
        hasPendingSigningToken: false,
      });
    }

    let connection = applyIntegraBrySigningTokenToConnection(
      buildBryConnectionWithEncryptedTokens(
        {
          provider: BRY_CLOUD_PROVIDER_ID,
          status: 'connected',
          connectedAt: new Date(),
          lastAuthorizationAt: new Date(),
          ...(titularCpf ? { externalAccountId: titularCpf } : {}),
          ...(pscProviderKey ? { pscProvider: pscProviderKey } : {}),
          ...(pscName ? { pscName } : {}),
          ...(expiresAt ? { expiresAt } : {}),
          authorizationContextId: sessionApiKeyToStore,
          integraSessionApiKey: sessionApiKeyToStore,
        },
        {
          accessToken: tokens.accessToken,
          ...(tokens.refreshToken?.trim() ? { refreshToken: tokens.refreshToken } : {}),
        }
      ),
      signingTokenFromLink
    );

    connection = applyPscSigningKmsToConnection(connection, kmsToStore);

    if (signingTokenFromLink) {
      connection = applyNewSignatureSessionToConnection(connection, config);
    }

    const form = doctorSignatureProviderFormFromStored(
      stored && typeof stored === 'object' ? stored : null
    );
    if (pscProviderKey && form.provider === BRY_CLOUD_PROVIDER_ID) {
      form.provider = pscProviderKey;
    }

    const doctorSignatureProvider = buildBryCloudConnectedProvider(
      form,
      {
        updatedAt: FieldValue.serverTimestamp(),
        connectedAt: FieldValue.serverTimestamp(),
      },
      connection,
      pscProviderKey ? { pscProvider: pscProviderKey } : undefined
    );

    await medicoRef.update({ doctorSignatureProvider });
    await deleteBryPendingAuthByNonce(statePayload.nonce, statePayload.medicoId);

    console.info('[signature/bry/callback] connected', {
      medicoId: statePayload.medicoId,
      pscProvider: pscProviderKey,
      authInfoAttempts: callbackDebug.authInfoAttempts,
    });

    return redirectToProfile(
      statePayload.returnUrl,
      { bry_cloud: 'connected' },
      requestUrl
    );
  } catch (error: unknown) {
    if (error instanceof EncryptionConfigError) {
      return redirectToProfile(
        statePayload.returnUrl,
        {
          bry_cloud: 'error',
          bry_message: 'Criptografia de tokens não configurada no servidor.',
        },
        requestUrl
      );
    }
    const errMessage = error instanceof Error ? error.message : String(error);
    const authInfoError = error instanceof BryPscAuthInfoError ? error : null;
    console.error('[signature/bry/callback]', {
      medicoId: statePayload.medicoId,
      queryKeys: [...searchParams.keys()],
      ...callbackDebug,
      message: errMessage,
      authInfoHttpStatus: authInfoError?.httpStatus,
      authInfoBryError: authInfoError?.bryError,
    });
    const message =
      error instanceof Error && error.name !== 'SecretDecryptError'
        ? mapBryConnectErrorMessage(error)
        : 'Erro ao concluir conexão BRy Cloud.';
    return redirectToProfile(
      statePayload.returnUrl,
      { bry_cloud: 'error', bry_message: message },
      requestUrl
    );
  }
}

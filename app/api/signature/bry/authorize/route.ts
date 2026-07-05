import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { requireMedicoMetaadmin } from '@/lib/server/metaadminExamesImagemGate';
import { bryCloudSignatureProviderAdapter } from '@/lib/signature/providers/bryCloudSignatureProviderAdapter';
import {
  createBryOAuthStatePayload,
  signBryOAuthState,
} from '@/lib/signature/providers/bryCloudOAuthState';
import {
  BRY_PSC_GENERIC_CONNECT_ERROR,
  normalizeSignatureProviderId,
  resolveBryPscNameForConnect,
} from '@/lib/signature/providers/bryPscNameMap';
import {
  bryCloudMissingEnvMessage,
  getBryCloudEnvConfig,
  isBryCloudEnvConfigured,
} from '@/lib/signature/providers/bryCloudEnv';
import { BRY_CLOUD_PROVIDER_ID } from '@/types/signatureProviderAdapter';

export const runtime = 'nodejs';

type Body = {
  returnUrl?: string;
  state?: string;
  /** Provedor selecionado no formulário (ex.: safeid, vidaas). */
  provider?: string;
};

function resolveSignatureProviderFromMedico(
  bodyProvider: string | undefined,
  stored: Record<string, unknown> | undefined
): string | null {
  const fromBody = normalizeSignatureProviderId(bodyProvider);
  if (fromBody && fromBody !== BRY_CLOUD_PROVIDER_ID) return fromBody;

  const dsp = stored?.doctorSignatureProvider;
  if (!dsp || typeof dsp !== 'object') return fromBody;

  const providerRecord = dsp as {
    provider?: string;
    connection?: { pscProvider?: string };
  };
  const fromConnection = normalizeSignatureProviderId(providerRecord.connection?.pscProvider);
  if (fromConnection) return fromConnection;

  const fromStored = normalizeSignatureProviderId(providerRecord.provider);
  if (fromStored && fromStored !== BRY_CLOUD_PROVIDER_ID) return fromStored;

  return fromBody;
}

export async function POST(request: NextRequest) {
  try {
    if (!isBryCloudEnvConfigured()) {
      return NextResponse.json(
        {
          ok: false,
          error: `Integração BRy Cloud não está habilitada neste ambiente. ${bryCloudMissingEnvMessage()}`,
          code: 'not_configured',
        },
        { status: 503 }
      );
    }

    const gate = await requireMedicoMetaadmin(request);
    if (!gate.ok) return gate.res;

    const body = (await request.json().catch(() => ({}))) as Body;
    const config = getBryCloudEnvConfig();

    const medicoSnap = await getFirestoreAdmin().collection('medicos').doc(gate.medicoDocId).get();
    const medicoData = medicoSnap.data();
    const cpfPessoal =
      typeof medicoData?.cpfPessoal === 'string' ? medicoData.cpfPessoal : undefined;

    const signatureProvider = resolveSignatureProviderFromMedico(body.provider, medicoData);

    let pscName: string;
    try {
      pscName = resolveBryPscNameForConnect(signatureProvider);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : BRY_PSC_GENERIC_CONNECT_ERROR;
      return NextResponse.json(
        { ok: false, error: message, code: 'invalid_psc' },
        { status: 400 }
      );
    }

    const statePayload = createBryOAuthStatePayload(
      gate.medicoDocId,
      body.returnUrl,
      signatureProvider ?? undefined
    );
    const state = body.state?.trim() || signBryOAuthState(statePayload, config.clientSecret);

    const result = await bryCloudSignatureProviderAdapter.startAuthorization({
      doctorId: gate.medicoDocId,
      returnUrl: body.returnUrl,
      state,
      cpf: cpfPessoal,
      pscProvider: signatureProvider ?? undefined,
    });

    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.error, code: result.code },
        { status: result.code === 'not_configured' ? 503 : 400 }
      );
    }

    const authorizationUrl = result.data.authorizationUrl?.trim();
    if (!authorizationUrl) {
      return NextResponse.json(
        { ok: false, error: 'BRy Cloud não retornou URL de autorização.', code: 'provider_error' },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, authorizationUrl, state, pscName });
  } catch (error: unknown) {
    console.error('[signature/bry/authorize]', error);
    const message = error instanceof Error ? error.message : 'Erro ao iniciar autorização BRy Cloud.';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

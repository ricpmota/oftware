import { randomBytes } from 'node:crypto';
import { getBryEasySignConfig } from '@/lib/signature/bryEasySign/bryEasySignConfig';
import {
  envelopeStatusValue,
  signersFromStatusPayload,
} from '@/lib/signature/bryEasySign/bryEasySignSignerPayload';
import {
  formatEasySignPhoneE164,
  isEasySignPhoneValidationError,
} from '@/lib/signature/bryEasySign/bryEasySignPhone';
import {
  logEasySignError,
  logEasySignFlow,
  type EasySignFlowContext,
} from '@/lib/signature/bryEasySign/contratoEasySignFlowLog.server';

export type BryEasySignSignerInput = {
  name: string;
  email: string;
  cpf?: string;
  phone?: string;
};

export type BryEasySignPositioningMode = 'CREATOR' | 'PRESET' | 'SIGNEE';

export type BryEasySignSignaturePosition = {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  imageNonce?: string;
  signerNonce?: string;
};

export type BryEasySignSignatureImage = {
  imageNonce: string;
  /** Imagem PNG/JPG em base64 (sem prefixo data:). */
  image: string;
};

export type BryEasySignPatientSignatureConfig = {
  positioningMode: BryEasySignPositioningMode;
  signerNonce: string;
  positions: BryEasySignSignaturePosition[];
  images?: BryEasySignSignatureImage[];
};

export type BryEasySignCreateEnvelopeInput = {
  name: string;
  clientName: string;
  pdfBuffer: Buffer;
  signer: BryEasySignSignerInput;
  expirationSeconds?: number;
  patientSignature?: BryEasySignPatientSignatureConfig;
};

export type BryEasySignEnvelopeCreated = {
  envelopeId: string;
  documentUuid: string;
  pacienteSignLinkUrl: string;
  pacienteSignIframeUrl?: string;
  raw: Record<string, unknown>;
};

function extractSignerLink(signer: Record<string, unknown>): { href?: string; iframe?: string } {
  const link = signer.link as { href?: string } | undefined;
  const iframe = typeof signer.iframe === 'string' ? signer.iframe : link?.href;
  return { href: link?.href, iframe };
}

export function createEasySignSignerNonce(prefix = 'signer'): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

export function createEasySignImageNonce(prefix = 'img'): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

export async function createBryEasySignEnvelope(
  input: BryEasySignCreateEnvelopeInput,
  flow?: EasySignFlowContext
): Promise<BryEasySignEnvelopeCreated> {
  try {
    const { baseUrl, accessToken } = await getBryEasySignConfig(flow);
    const base64Document = input.pdfBuffer.toString('base64');

    const signerNonce =
      input.patientSignature?.signerNonce?.trim() || createEasySignSignerNonce('paciente');

    const signerPayload: Record<string, unknown> = {
      signerNonce,
      name: input.signer.name,
      email: input.signer.email,
      authenticationOptions: ['GEOLOCATION', 'IP', 'OTP_EMAIL'],
    };
    if (input.signer.cpf) signerPayload.cpf = input.signer.cpf;
    const phoneE164 = formatEasySignPhoneE164(input.signer.phone);
    if (phoneE164) signerPayload.phone = phoneE164;

    if (input.patientSignature) {
      signerPayload.positioningMode = input.patientSignature.positioningMode;
    }

    const documentPayload: Record<string, unknown> = {
      base64Document,
    };
    if (input.patientSignature?.positions.length) {
      documentPayload.signaturePositions = input.patientSignature.positions.map((position) => ({
        ...position,
        signerNonce: position.signerNonce || signerNonce,
      }));
    }

    const body: Record<string, unknown> = {
      name: input.name,
      clientName: input.clientName,
      language: 'pt-br',
      signatureOrder: 'UNORDERED',
      expiration: input.expirationSeconds ?? 604800,
      keepDocument: true,
      signersData: [signerPayload],
      signatureConfig: { mode: 'SIMPLE' },
      typeMessaging: ['LINK'],
      documents: [documentPayload],
    };

    if (input.patientSignature?.images?.length) {
      body.images = input.patientSignature.images;
    }

    logEasySignFlow(flow, 'payload_built', {
      envelopeHost: new URL(baseUrl).host,
      pdfBytes: input.pdfBuffer.length,
      signerCount: 1,
      phoneIncluded: Boolean(phoneE164),
      patientSignatureMode: input.patientSignature?.positioningMode,
      signaturePositions: input.patientSignature?.positions.length ?? 0,
    });

    logEasySignFlow(flow, 'creating_envelope', {
      envelopeHost: new URL(baseUrl).host,
    });

    const res = await fetch(`${baseUrl}/api/service/sign/v1/signatures`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg =
        (typeof data.message === 'string' && data.message) ||
        (typeof data.error === 'string' && data.error) ||
        `Falha ao criar envelope EasySign (${res.status}).`;
      if (isEasySignPhoneValidationError(msg)) {
        throw new Error(
          'Telefone do paciente em formato inválido para o EasySign (E.164). Atualize o telefone no cadastro ou tente novamente.'
        );
      }
      throw new Error(msg);
    }

    const envelopeId = String(data.uuid || '');
    const documents = Array.isArray(data.documents) ? data.documents : [];
    const firstDoc = (documents[0] || {}) as Record<string, unknown>;
    const documentUuid = String(firstDoc.documentUuid || '');

    const signers = Array.isArray(data.signers) ? data.signers : [];
    const firstSigner = (signers[0] || {}) as Record<string, unknown>;
    const links = extractSignerLink(firstSigner);
    const pacienteSignLinkUrl = links.href || '';

    if (!envelopeId || !documentUuid || !pacienteSignLinkUrl) {
      throw new Error('Resposta EasySign incompleta (envelope, documento ou link ausente).');
    }

    logEasySignFlow(flow, 'envelope_ok', {
      httpStatus: res.status,
      hasEnvelopeId: Boolean(envelopeId),
      hasDocumentUuid: Boolean(documentUuid),
      hasSignLink: Boolean(pacienteSignLinkUrl),
    });

    return {
      envelopeId,
      documentUuid,
      pacienteSignLinkUrl,
      pacienteSignIframeUrl: links.iframe,
      raw: data,
    };
  } catch (error) {
    logEasySignError(flow, error);
    throw error;
  }
}

export async function downloadBryEasySignSignedPdf(
  envelopeId: string,
  documentUuid: string
): Promise<Buffer> {
  const completed = await isBryEasySignPatientSignatureComplete(envelopeId);
  if (!completed) {
    throw new Error(
      'O paciente ainda não concluiu a assinatura no EasySign. O PDF final só fica disponível após a assinatura do paciente.'
    );
  }

  return downloadBryEasySignSignedPdfUnsafe(envelopeId, documentUuid);
}

/** Baixa o PDF assinado sem checar status (uso interno / fallback de sincronização). */
export async function downloadBryEasySignSignedPdfUnsafe(
  envelopeId: string,
  documentUuid: string
): Promise<Buffer> {
  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(
    envelopeId
  )}/documents/${encodeURIComponent(documentUuid)}/signed`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(
      text?.slice(0, 200) ||
        `Não foi possível baixar o PDF final do EasySign (${res.status}). O paciente pode ainda não ter assinado.`
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

const SIGNER_DONE_STATUSES = new Set([
  'SIGNED',
  'COMPLETED',
  'COMPLETED_SIGN',
  'COMPLETE',
  'FINISHED',
  'FINALIZED',
  'FINALIZADO',
  'FINALIZADA',
  'DONE',
  'ASSINADO',
  'ASSINADA',
  'CONCLUIDO',
  'CONCLUÍDO',
  'CONCLUIDA',
  'CONCLUÍDA',
  'CONCLUDED',
  'APPROVED',
  'APROVADO',
  'APROVADA',
  'SUCCESS',
  'SUCESSO',
]);

const SIGNER_PENDING_STATUSES = new Set([
  'PENDING',
  'PENDENTE',
  'DRAFT',
  'RASCUNHO',
  'WAITING',
  'AGUARDANDO',
  'AWAITING',
  'IN_PROGRESS',
  'EM_ANDAMENTO',
  'EM PROGRESSO',
  'ACTIVE',
  'ATIVO',
  'ATIVA',
  'OPEN',
  'ABERTO',
  'CREATED',
  'CRIADO',
]);

const ENVELOPE_DONE_STATUSES = new Set([
  ...SIGNER_DONE_STATUSES,
  'COMPLETED',
  'FINISHED',
  'FINALIZED',
  'FINALIZADO',
  'CONCLUDED',
  'CONCLUIDO',
  'CONCLUÍDO',
]);

function signerStatusValue(signer: Record<string, unknown>): string {
  const nested = signer.signature as Record<string, unknown> | undefined;
  return String(
    signer.status ||
      signer.signatureStatus ||
      signer.situation ||
      signer.signStatus ||
      signer.state ||
      nested?.status ||
      nested?.signatureStatus ||
      ''
  )
    .trim()
    .toUpperCase();
}

function signerLooksComplete(signer: Record<string, unknown>): boolean {
  if (SIGNER_DONE_STATUSES.has(signerStatusValue(signer))) return true;

  const signedAt =
    signer.signedAt ||
    signer.signedDate ||
    signer.signDate ||
    signer.dataAssinatura ||
    signer.signatureDate ||
    signer.finishedAt;
  if (signedAt) return true;

  if (signer.signed === true || signer.isSigned === true || signer.completed === true) {
    return true;
  }

  return false;
}

async function fetchBryEasySignEnvelopePayload(envelopeId: string): Promise<Record<string, unknown>> {
  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.warn('[easysign] envelope_fetch_failed', {
      envelopeId,
      httpStatus: res.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    });
    return {};
  }
  return data;
}

/**
 * Consulta status do envelope na BRy antes de marcar assinatura do paciente como concluída.
 * Evita falso positivo: /signed pode retornar PDF só com assinatura médica.
 */
export async function isBryEasySignPatientSignatureComplete(envelopeId: string): Promise<boolean> {
  const id = envelopeId.trim();
  if (!id) return false;

  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(id)}/status`;

  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.warn('[easysign] status_check_failed', {
      envelopeId: id,
      httpStatus: res.status,
      message: typeof data.message === 'string' ? data.message : undefined,
    });
  } else {
    const signers = signersFromStatusPayload(data);
    if (signers.length) {
      const anyPending = signers.some((s) => SIGNER_PENDING_STATUSES.has(signerStatusValue(s)));
      if (anyPending) return false;
      if (signers.every((s) => signerLooksComplete(s))) return true;
      if (signers.some((s) => signerLooksComplete(s))) return true;
    }

    const envelopeStatus = envelopeStatusValue(data);
    if (SIGNER_PENDING_STATUSES.has(envelopeStatus)) return false;
    if (ENVELOPE_DONE_STATUSES.has(envelopeStatus)) return true;
  }

  const envelope = await fetchBryEasySignEnvelopePayload(id);
  const envelopeSigners = signersFromStatusPayload(envelope);
  if (envelopeSigners.length) {
    const anyPending = envelopeSigners.some((s) =>
      SIGNER_PENDING_STATUSES.has(signerStatusValue(s))
    );
    if (anyPending) return false;
    if (envelopeSigners.every((s) => signerLooksComplete(s))) return true;
    if (envelopeSigners.some((s) => signerLooksComplete(s))) return true;
  }

  const envelopeStatus = envelopeStatusValue(envelope);
  if (SIGNER_PENDING_STATUSES.has(envelopeStatus)) return false;
  if (ENVELOPE_DONE_STATUSES.has(envelopeStatus)) return true;

  console.warn('[easysign] status_check_ambiguous', {
    envelopeId: id,
    envelopeStatus: envelopeStatus || envelopeStatusValue(data) || undefined,
    statusHttp: res.ok ? res.status : undefined,
  });
  return false;
}

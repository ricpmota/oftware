import { getBryEasySignConfig } from '@/lib/signature/bryEasySign/bryEasySignConfig';
import { signersFromStatusPayload } from '@/lib/signature/bryEasySign/bryEasySignSignerPayload';

export type BryEasySignPatientEvidence = {
  envelopeId: string;
  signerNonce: string;
  name: string;
  email?: string;
  cpf?: string;
  phone?: string;
  signedAt?: Date;
  ipAddress?: string;
  geolocationLabel?: string;
  latitude?: number;
  longitude?: number;
  authenticationMethods: string[];
  signerStatus?: string;
  envelopeStatus?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | undefined {
  if (value == null) return undefined;
  const s = String(value).trim();
  return s || undefined;
}

function parseEvidenceDate(value: unknown): Date | undefined {
  if (value == null) return undefined;
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value;

  if (typeof value === 'number' && Number.isFinite(value)) {
    const ms = value > 1e12 ? value : value * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  const s = String(value).trim();
  if (!s) return undefined;
  if (/^\d{10,13}$/.test(s)) {
    const n = Number(s);
    const ms = s.length >= 13 ? n : n * 1000;
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function formatCpfDisplay(digits: string | undefined): string | undefined {
  const d = (digits || '').replace(/\D/g, '');
  if (d.length !== 11) return digits;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

function collectEvidenceNodes(root: unknown, out: Record<string, unknown>[], depth = 0): void {
  if (depth > 6) return;
  const rec = asRecord(root);
  if (!rec) return;
  out.push(rec);
  for (const value of Object.values(rec)) {
    if (Array.isArray(value)) {
      for (const item of value) collectEvidenceNodes(item, out, depth + 1);
    } else if (value && typeof value === 'object') {
      collectEvidenceNodes(value, out, depth + 1);
    }
  }
}

function pickIp(nodes: Record<string, unknown>[]): string | undefined {
  for (const node of nodes) {
    for (const key of ['ip', 'ipAddress', 'clientIp', 'clientIP', 'remoteAddr', 'address']) {
      const v = asString(node[key]);
      if (v && /^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return v;
    }
    const type = asString(node.type || node.evidenceType || node.name)?.toUpperCase();
    if (type === 'IP' || type === 'IP_ADDRESS') {
      const v = asString(node.value || node.data || node.content);
      if (v) return v;
    }
  }
  return undefined;
}

function pickGeo(nodes: Record<string, unknown>[]): {
  label?: string;
  latitude?: number;
  longitude?: number;
} {
  for (const node of nodes) {
    const type = asString(node.type || node.evidenceType || node.name)?.toUpperCase();
    if (type === 'GEOLOCATION' || type === 'GEO' || type === 'GEO_LOCATION') {
      const value = node.value ?? node.data ?? node.content ?? node.geolocation;
      const rec = asRecord(value);
      if (rec) {
        const lat = Number(rec.latitude ?? rec.lat ?? rec.y);
        const lng = Number(rec.longitude ?? rec.lng ?? rec.lon ?? rec.x);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { latitude: lat, longitude: lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
        }
      }
      const s = asString(value);
      if (s) return { label: s };
    }

    const lat = Number(node.latitude ?? node.lat);
    const lng = Number(node.longitude ?? node.lng ?? node.lon);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng, label: `${lat.toFixed(5)}, ${lng.toFixed(5)}` };
    }
  }
  return {};
}

function authLabels(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  const labels: Record<string, string> = {
    GEOLOCATION: 'Geolocalização',
    IP: 'Endereço IP',
    OTP_EMAIL: 'Confirmação por e-mail (OTP)',
    OTP_PHONE: 'Confirmação por SMS (OTP)',
    OTP_WHATSAPP: 'Confirmação por WhatsApp (OTP)',
    SELFIE: 'Selfie',
    PERSONAL_IDENTIFIER: 'Confirmação de CPF',
  };
  return list
    .map((item) => labels[String(item).trim().toUpperCase()] || String(item).trim())
    .filter(Boolean);
}

async function fetchJson(url: string, accessToken: string): Promise<Record<string, unknown>> {
  const res = await fetch(url, {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    console.warn('[easysign] evidence_fetch_failed', {
      url: url.replace(/signatures\/[^/]+/, 'signatures/:id'),
      httpStatus: res.status,
      message: asString(data.message),
    });
    return {};
  }
  return data;
}

export async function fetchBryEasySignSignerByNonce(
  envelopeId: string,
  signerNonce: string
): Promise<Record<string, unknown>> {
  const id = envelopeId.trim();
  const nonce = signerNonce.trim();
  if (!id || !nonce) return {};

  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(
    id
  )}/signers/${encodeURIComponent(nonce)}`;
  return fetchJson(url, accessToken);
}

export async function resolveBryEasySignPatientSignerNonce(
  envelopeId: string,
  preferredNonce?: string | null
): Promise<string> {
  const preferred = preferredNonce?.trim();
  if (preferred) return preferred;

  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const url = `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId.trim())}`;
  const envelope = await fetchJson(url, accessToken);
  const signers = signersFromStatusPayload(envelope);
  const first = signers[0];
  return asString(first?.signerNonce) || '';
}

export async function fetchBryEasySignPatientEvidence(args: {
  envelopeId: string;
  signerNonce?: string | null;
}): Promise<BryEasySignPatientEvidence> {
  const envelopeId = args.envelopeId.trim();
  const signerNonce = await resolveBryEasySignPatientSignerNonce(envelopeId, args.signerNonce);

  const { baseUrl, accessToken } = await getBryEasySignConfig();
  const [signerPayload, statusPayload, envelopePayload] = await Promise.all([
    signerNonce
      ? fetchBryEasySignSignerByNonce(envelopeId, signerNonce)
      : Promise.resolve({} as Record<string, unknown>),
    fetchJson(
      `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId)}/status`,
      accessToken
    ),
    fetchJson(
      `${baseUrl}/api/service/sign/v1/signatures/${encodeURIComponent(envelopeId)}`,
      accessToken
    ),
  ]);

  const evidenceNodes: Record<string, unknown>[] = [];
  collectEvidenceNodes(signerPayload, evidenceNodes);
  collectEvidenceNodes(statusPayload, evidenceNodes);
  collectEvidenceNodes(envelopePayload, evidenceNodes);

  const statusSigners = signersFromStatusPayload(statusPayload);
  const statusSigner =
    statusSigners.find((s) => asString(s.signerNonce) === signerNonce) || statusSigners[0];

  if (statusSigner) collectEvidenceNodes(statusSigner, evidenceNodes);

  const ipAddress = pickIp(evidenceNodes);
  const geo = pickGeo(evidenceNodes);

  const name =
    asString(signerPayload.name) ||
    asString(statusSigner?.name) ||
    asString(envelopePayload.clientName) ||
    'Paciente';

  const cpfRaw =
    asString(signerPayload.personal_identifier) ||
    asString(statusSigner?.personal_identifier) ||
    asString(signerPayload.cpf);

  const signedAt =
    parseEvidenceDate(signerPayload.evidenceDate) ||
    parseEvidenceDate(statusSigner?.evidenceDate) ||
    parseEvidenceDate(statusSigner?.signedAt) ||
    parseEvidenceDate(signerPayload.signedAt);

  const authenticationMethods = authLabels(
    signerPayload.authentications ||
      signerPayload.authenticationOptions ||
      statusSigner?.authentications ||
      statusSigner?.authenticationOptions
  );

  return {
    envelopeId,
    signerNonce: signerNonce || asString(signerPayload.signerNonce) || '—',
    name,
    email: asString(signerPayload.email) || asString(statusSigner?.email),
    cpf: formatCpfDisplay(cpfRaw),
    phone: asString(signerPayload.phone) || asString(statusSigner?.phone),
    signedAt,
    ipAddress,
    geolocationLabel: geo.label,
    latitude: geo.latitude,
    longitude: geo.longitude,
    authenticationMethods,
    signerStatus: asString(signerPayload.status) || asString(statusSigner?.status),
    envelopeStatus: asString(statusPayload.status) || asString(envelopePayload.status),
  };
}

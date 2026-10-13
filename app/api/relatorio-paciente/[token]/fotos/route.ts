import { NextRequest, NextResponse } from 'next/server';
import {
  isValidPublicLinkToken,
  normalizePublicLinkToken,
} from '@/lib/publicLinks/publicLinkToken';
import {
  isAllowedRemotePhotoUrl,
  sniffImageContentType,
  storageObjectPath,
} from '@/lib/relatorio/relatorioFotoUrl';
import { getAdminStorageBucket, getAuthAdmin, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';

const MAX_BYTES = 4_000_000;

function bytesToDataUrl(bytes: Uint8Array, contentType: string | null): string | null {
  if (bytes.byteLength === 0 || bytes.byteLength > MAX_BYTES) return null;
  const sniffed = sniffImageContentType(bytes);
  const headerType = (contentType || '').split(';')[0].trim().toLowerCase();
  const mime = sniffed || (headerType.startsWith('image/') && headerType !== 'image/svg+xml' ? headerType : null);
  if (!mime) return null;
  return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
}

async function downloadStorageObject(url: string): Promise<string | null> {
  const bucket = getAdminStorageBucket();
  const objectPath = storageObjectPath(url, bucket.name);
  if (!objectPath) return null;
  const file = bucket.file(objectPath);
  const [exists] = await file.exists();
  if (!exists) return null;
  const [buf] = await file.download();
  const [meta] = await file.getMetadata();
  return bytesToDataUrl(new Uint8Array(buf), typeof meta.contentType === 'string' ? meta.contentType : null);
}

async function downloadRemote(url: string): Promise<string | null> {
  const bucketName = getAdminStorageBucket().name;
  const allowed = storageObjectPath(url, bucketName) != null || isAllowedRemotePhotoUrl(url);
  if (!allowed) return null;

  const res = await fetch(url, { redirect: 'follow', cache: 'force-cache' });
  if (!res.ok) return null;
  const finalUrl = res.url || url;
  const finalAllowed = storageObjectPath(finalUrl, bucketName) != null || isAllowedRemotePhotoUrl(finalUrl);
  if (!finalAllowed) return null;
  const bytes = new Uint8Array(await res.arrayBuffer());
  return bytesToDataUrl(bytes, res.headers.get('content-type'));
}

async function imageUrlToDataUrl(url: string | null | undefined): Promise<string | null> {
  const trimmed = url?.trim();
  if (!trimmed) return null;
  try {
    return (await downloadStorageObject(trimmed)) || (await downloadRemote(trimmed));
  } catch {
    return null;
  }
}

/**
 * GET /api/relatorio-paciente/[token]/fotos
 * Fotos do médico e do paciente em data URL, para o PDF não depender de CORS do navegador.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const token = normalizePublicLinkToken((await params).token);
    if (!isValidPublicLinkToken(token)) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 400 });
    }

    const db = getFirestoreAdmin();
    const linkRef = await db.collection('relatorio_paciente_links').doc(token).get();
    if (!linkRef.exists) {
      return NextResponse.json({ error: 'Link não encontrado ou expirado' }, { status: 404 });
    }

    const pacienteId = (linkRef.data() as { pacienteId?: string } | undefined)?.pacienteId;
    if (!pacienteId) {
      return NextResponse.json({ error: 'Dados do link inválidos' }, { status: 400 });
    }

    const pacienteSnap = await db.collection('pacientes_completos').doc(pacienteId).get();
    if (!pacienteSnap.exists) {
      return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    }

    const paciente = pacienteSnap.data() as { medicoResponsavelId?: string; userId?: string };
    let medicoFotoUrl: string | null = null;
    const medicoId = paciente.medicoResponsavelId;
    if (medicoId) {
      const medicoSnap = await db.collection('medicos').doc(medicoId).get();
      const foto = medicoSnap.data()?.fotoPerfilUrl;
      if (typeof foto === 'string' && foto.trim()) medicoFotoUrl = foto.trim();
    }

    let pacienteFotoUrl: string | null = null;
    const pacienteUserId = typeof paciente.userId === 'string' ? paciente.userId.trim() : '';
    if (pacienteUserId) {
      try {
        const authUser = await getAuthAdmin().getUser(pacienteUserId);
        const photo = authUser.photoURL?.trim();
        if (photo) pacienteFotoUrl = photo;
      } catch {
        pacienteFotoUrl = null;
      }
    }

    const [medicoFotoDataUrl, pacienteFotoDataUrl] = await Promise.all([
      imageUrlToDataUrl(medicoFotoUrl),
      imageUrlToDataUrl(pacienteFotoUrl),
    ]);

    return NextResponse.json({ medicoFotoDataUrl, pacienteFotoDataUrl });
  } catch (error) {
    console.error('Erro ao carregar fotos do relatório:', error);
    return NextResponse.json({ error: 'Erro ao carregar fotos' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { requireMetaAdminGeral } from '@/lib/metaadmin/requireMetaAdminGeral';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { getOrganizationById } from '@/lib/organization/organizationRegistry';

const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp']);
const FAVICON_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
  'image/x-icon',
  'image/vnd.microsoft.icon',
  'application/octet-stream',
]);
const FAVICON_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'webp', 'svg', 'ico']);

const MAX_IMAGE_BYTES = 2 * 1024 * 1024;
const MAX_FAVICON_BYTES = 1 * 1024 * 1024;

const ALLOWED_TIPOS = new Set([
  'logo-main',
  'logo-light',
  'logo-dark',
  'favicon',
  'icon',
  'og',
  'pdf',
  'watermark',
  'public-page-dr',
  'public-page-aplicacao',
  'public-page-conclusao',
]);

type RouteParams = { params: Promise<{ organizationId: string }> };

function validateFile(file: File, tipo: string): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';

  if (tipo === 'favicon' || tipo === 'icon') {
    if (!FAVICON_TYPES.has(file.type) && !FAVICON_EXTENSIONS.has(ext)) {
      return 'Formato inválido. Use PNG, JPG, SVG, ICO ou WebP.';
    }
    if (file.size > MAX_FAVICON_BYTES) {
      return 'Arquivo muito grande. Tamanho máximo: 1MB.';
    }
    return null;
  }

  if (!IMAGE_TYPES.has(file.type)) {
    return 'Formato inválido. Use PNG, JPG ou WebP.';
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return 'Arquivo muito grande. Tamanho máximo: 2MB.';
  }
  return null;
}

/** POST — upload de imagem da Marca da Organização (Storage). */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const auth = await requireMetaAdminGeral(request);
  if (auth instanceof NextResponse) return auth;

  try {
    const { organizationId } = await params;
    const id = (organizationId || '').trim();
    if (!id || !getOrganizationById(id)) {
      return NextResponse.json({ error: 'Organização não registrada.' }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tipo = String(formData.get('tipo') || 'og').trim().toLowerCase();

    if (!file) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado.' }, { status: 400 });
    }
    if (!ALLOWED_TIPOS.has(tipo)) {
      return NextResponse.json({ error: `Tipo de imagem inválido: ${tipo}` }, { status: 400 });
    }

    const validationError = validateFile(file, tipo);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const objectPath = `organizations/${id}/branding/${tipo}-${randomUUID()}.${ext}`;

    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorageBucket();
    const fileRef = bucket.file(objectPath);

    await fileRef.save(buffer, {
      metadata: {
        contentType: file.type || undefined,
        cacheControl: 'public, max-age=31536000',
      },
    });
    await fileRef.makePublic();

    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${objectPath}`;
    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    console.error('[metaadmingeral/organizations/branding/upload POST]', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar imagem.' },
      { status: 500 },
    );
  }
}

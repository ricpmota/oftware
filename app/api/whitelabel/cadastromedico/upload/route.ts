import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { getAdminStorageBucket } from '@/lib/server/firebaseAdminOftware';
import { getCadastroMedicoDraft } from '@/lib/whiteLabel/cadastroMedicoService';

const ALLOWED_FIELDS = new Set([
  'fotoProfissional',
  'logo',
  'imagemCapa',
  'documentoFoto',
  'comprovanteEndereco',
]);

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const draftId = String(formData.get('draftId') || '').trim();
    const field = String(formData.get('field') || '').trim();
    const file = formData.get('file');

    if (!draftId) {
      return NextResponse.json({ error: 'draftId é obrigatório.' }, { status: 400 });
    }
    if (!ALLOWED_FIELDS.has(field)) {
      return NextResponse.json({ error: 'Campo de upload inválido.' }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo inválido.' }, { status: 400 });
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Arquivo muito grande (máx. 10 MB).' }, { status: 400 });
    }

    const draft = await getCadastroMedicoDraft(draftId);
    if (!draft) {
      return NextResponse.json({ error: 'Rascunho não encontrado.' }, { status: 404 });
    }
    if (draft.status === 'concluido') {
      return NextResponse.json({ error: 'Cadastro já concluído.' }, { status: 400 });
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
    const safeExt = ext.replace(/[^a-z0-9]/g, '') || 'bin';
    const objectPath = `cadastro-medico-whitelabel/${draftId}/${field}-${randomUUID()}.${safeExt}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const bucket = getAdminStorageBucket();
    const gcsFile = bucket.file(objectPath);

    await gcsFile.save(buffer, {
      metadata: {
        contentType: file.type || 'application/octet-stream',
        metadata: { draftId, field },
      },
    });

    const [signedUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 365 * 24 * 60 * 60 * 1000,
    });

    return NextResponse.json({
      success: true,
      url: signedUrl,
      field,
      storagePath: objectPath,
    });
  } catch (error) {
    console.error('[API whitelabel/cadastromedico/upload] POST:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Erro ao enviar arquivo.' },
      { status: 500 }
    );
  }
}

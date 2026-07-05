import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import type { Prescricao, PrescricaoItem, PrescricaoTipoDocumento } from '@/types/prescricao';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';
const COLLECTION = 'prescricoes';
const SISTEMA_MEDICO_ID = 'SISTEMA';

async function requireMetaAdminGeral(request: NextRequest): Promise<{ ok: true } | { ok: false; res: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return { ok: false, res: NextResponse.json({ error: 'Token obrigatório.' }, { status: 401 }) };
  }
  try {
    const auth = getAuthAdmin();
    const decoded = await auth.verifyIdToken(token);
    if (decoded.email !== METAADMINGERAL_EMAIL) {
      return { ok: false, res: NextResponse.json({ error: 'Acesso negado. Apenas MetaAdminGeral.' }, { status: 403 }) };
    }
    return { ok: true };
  } catch {
    return { ok: false, res: NextResponse.json({ error: 'Token inválido.' }, { status: 401 }) };
  }
}

function mapDocToPrescricao(id: string, data: Record<string, unknown>): Prescricao {
  return {
    id,
    medicoId: data.medicoId as string,
    pacienteId: data.pacienteId || undefined,
    pacienteNome: data.pacienteNome || undefined,
    nome: data.nome as string,
    descricao: (data.descricao as string) ?? '',
    itens: (data.itens as PrescricaoItem[]) ?? [],
    observacoes: data.observacoes || undefined,
    criadoEm: data.criadoEm?.toDate?.() ?? new Date(),
    atualizadoEm: data.atualizadoEm?.toDate?.() ?? new Date(),
    criadoPor: (data.criadoPor as string) ?? SISTEMA_MEDICO_ID,
    isTemplate: data.isTemplate === true,
    pesoPaciente: data.pesoPaciente != null ? Number(data.pesoPaciente) : undefined,
    tipoDocumento: data.tipoDocumento as PrescricaoTipoDocumento | undefined,
    valorConsulta: data.valorConsulta != null ? Number(data.valorConsulta) : undefined,
    dataRecibo: typeof data.dataRecibo === 'string' ? data.dataRecibo : undefined,
    reciboDocumentoProfissional:
      data.reciboDocumentoProfissional === 'cpf' ||
      data.reciboDocumentoProfissional === 'cnpj' ||
      data.reciboDocumentoProfissional === 'omitir'
        ? data.reciboDocumentoProfissional
        : undefined,
  };
}

type ProtocoloPayload = {
  id?: string;
  nome?: string;
  descricao?: string;
  itens?: PrescricaoItem[];
  observacoes?: string;
  tipoDocumento?: PrescricaoTipoDocumento;
  valorConsulta?: number;
  dataRecibo?: string;
  reciboDocumentoProfissional?: 'omitir' | 'cpf' | 'cnpj';
  pesoPaciente?: number;
};

function validatePayload(body: ProtocoloPayload, isUpdate: boolean): string | null {
  if (!body.nome?.trim()) return 'Nome é obrigatório.';
  if (body.tipoDocumento === 'recibo_medico') {
    if (!body.descricao?.trim()) return 'Descrição do recibo é obrigatória.';
    return null;
  }
  if (!body.itens?.length) return 'Adicione pelo menos um item.';
  for (const item of body.itens) {
    if (!item.medicamento?.trim() || !item.dosagem?.trim() || !item.frequencia?.trim() || !item.instrucoes?.trim()) {
      return 'Preencha todos os campos obrigatórios dos itens.';
    }
  }
  if (isUpdate && !body.id?.trim()) return 'ID é obrigatório para atualização.';
  return null;
}

function buildFirestoreData(body: ProtocoloPayload, criadoEm?: Date) {
  const now = new Date();
  const isRecibo = body.tipoDocumento === 'recibo_medico';
  const data: Record<string, unknown> = {
    medicoId: SISTEMA_MEDICO_ID,
    nome: body.nome!.trim(),
    descricao: (body.descricao ?? '').trim(),
    itens: isRecibo ? [] : body.itens ?? [],
    observacoes: (body.observacoes ?? '').trim(),
    isTemplate: true,
    criadoPor: SISTEMA_MEDICO_ID,
    atualizadoEm: now,
  };
  if (criadoEm) data.criadoEm = criadoEm;
  else data.criadoEm = now;

  if (isRecibo) {
    data.tipoDocumento = 'recibo_medico';
    if (body.valorConsulta != null && !Number.isNaN(Number(body.valorConsulta))) {
      data.valorConsulta = Number(body.valorConsulta);
    }
    if (body.dataRecibo && /^\d{4}-\d{2}-\d{2}$/.test(body.dataRecibo)) {
      data.dataRecibo = body.dataRecibo;
    }
    if (
      body.reciboDocumentoProfissional === 'cpf' ||
      body.reciboDocumentoProfissional === 'cnpj' ||
      body.reciboDocumentoProfissional === 'omitir'
    ) {
      data.reciboDocumentoProfissional = body.reciboDocumentoProfissional;
    }
  } else if (body.pesoPaciente != null) {
    data.pesoPaciente = body.pesoPaciente;
  }

  return data;
}

export async function GET(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const db = getFirestoreAdmin();
    const snap = await db.collection(COLLECTION).where('medicoId', '==', SISTEMA_MEDICO_ID).where('isTemplate', '==', true).get();
    const protocolos = snap.docs
      .map((d) => mapDocToPrescricao(d.id, d.data()))
      .sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());
    return NextResponse.json({ protocolos });
  } catch (e) {
    console.error('[metaadmingeral/protocolos-prescricao GET]', e);
    return NextResponse.json({ error: 'Falha ao listar protocolos.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as ProtocoloPayload;
    const err = validatePayload(body, false);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const db = getFirestoreAdmin();
    const ref = db.collection(COLLECTION).doc();
    await ref.set(buildFirestoreData(body));
    const created = await ref.get();
    return NextResponse.json({ ok: true, protocolo: mapDocToPrescricao(ref.id, created.data()!) });
  } catch (e) {
    console.error('[metaadmingeral/protocolos-prescricao POST]', e);
    return NextResponse.json({ error: 'Falha ao criar protocolo.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as ProtocoloPayload;
    const err = validatePayload(body, true);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const db = getFirestoreAdmin();
    const ref = db.collection(COLLECTION).doc(body.id!);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
    }
    const data = existing.data()!;
    if (data.medicoId !== SISTEMA_MEDICO_ID || data.isTemplate !== true) {
      return NextResponse.json({ error: 'Somente protocolos SISTEMA podem ser editados aqui.' }, { status: 403 });
    }

    const criadoEm = data.criadoEm?.toDate?.() ?? new Date();
    await ref.update(buildFirestoreData(body, criadoEm));
    const updated = await ref.get();
    return NextResponse.json({ ok: true, protocolo: mapDocToPrescricao(ref.id, updated.data()!) });
  } catch (e) {
    console.error('[metaadmingeral/protocolos-prescricao PUT]', e);
    return NextResponse.json({ error: 'Falha ao atualizar protocolo.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const id = request.nextUrl.searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ error: 'Informe id.' }, { status: 400 });

    const db = getFirestoreAdmin();
    const ref = db.collection(COLLECTION).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Protocolo não encontrado.' }, { status: 404 });
    }
    const data = existing.data()!;
    if (data.medicoId !== SISTEMA_MEDICO_ID || data.isTemplate !== true) {
      return NextResponse.json({ error: 'Somente protocolos SISTEMA podem ser excluídos aqui.' }, { status: 403 });
    }

    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[metaadmingeral/protocolos-prescricao DELETE]', e);
    return NextResponse.json({ error: 'Falha ao excluir protocolo.' }, { status: 500 });
  }
}

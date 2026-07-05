import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/server/firebaseAdminOftware';
import type { Prescricao, PrescricaoItem, PrescricaoTipoDocumento } from '@/types/prescricao';
import type { PrescricaoCatalogoAba, PrescricaoPasta } from '@/types/prescricaoPasta';
import {
  inferirPastaNomeLegado,
  nomeComPasta,
  PASTAS_PADRAO_PRESCRICAO,
  PASTAS_PADRAO_PROTOCOLO,
  PRESCRICAO_RECIBO_PASTA_NOME,
  tituloExibicaoPrescricao,
} from '@/lib/prescricao/prescricaoCatalogoDefaults';
import {
  precisaMigrarConteudoUnificadoFirestore,
  unificarConteudoTextoLivre,
} from '@/lib/prescricao/prescricaoConteudoUnificado';

const METAADMINGERAL_EMAIL = 'ricpmota.med@gmail.com';
const COL_PRESCRICOES = 'prescricoes';
const COL_PASTAS = 'prescricao_pastas';
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

function mapPasta(id: string, data: Record<string, unknown>): PrescricaoPasta {
  return {
    id,
    medicoId: SISTEMA_MEDICO_ID,
    catalogoAba: (data.catalogoAba as PrescricaoCatalogoAba) || 'prescricao',
    nome: String(data.nome ?? ''),
    ordem: typeof data.ordem === 'number' ? data.ordem : 0,
    sistemaPadrao: data.sistemaPadrao === true,
    criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    atualizadoEm: (data.atualizadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
  };
}

function mapPrescricao(id: string, data: Record<string, unknown>): Prescricao {
  return {
    id,
    medicoId: data.medicoId as string,
    pacienteId: (data.pacienteId as string) || undefined,
    pacienteNome: (data.pacienteNome as string) || undefined,
    nome: data.nome as string,
    descricao: (data.descricao as string) ?? '',
    itens: (data.itens as PrescricaoItem[]) ?? [],
    observacoes: (data.observacoes as string) || undefined,
    criadoEm: (data.criadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
    atualizadoEm: (data.atualizadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date(),
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
    catalogoAba: (data.catalogoAba as PrescricaoCatalogoAba) || undefined,
    pastaId: (data.pastaId as string) || undefined,
    pastaNome: (data.pastaNome as string) || undefined,
  };
}

async function ensurePastasPadraoPrescricao(db: FirebaseFirestore.Firestore): Promise<void> {
  const snap = await db
    .collection(COL_PASTAS)
    .where('medicoId', '==', SISTEMA_MEDICO_ID)
    .where('catalogoAba', '==', 'prescricao')
    .get();
  const nomes = new Set(snap.docs.map((d) => String(d.data().nome)));
  const now = new Date();
  for (const p of PASTAS_PADRAO_PRESCRICAO) {
    if (nomes.has(p.nome)) continue;
    await db.collection(COL_PASTAS).add({
      medicoId: SISTEMA_MEDICO_ID,
      catalogoAba: 'prescricao',
      nome: p.nome,
      ordem: p.ordem,
      sistemaPadrao: true,
      criadoEm: now,
      atualizadoEm: now,
    });
  }
}

async function ensurePastasPadraoProtocolo(db: FirebaseFirestore.Firestore): Promise<void> {
  const snap = await db
    .collection(COL_PASTAS)
    .where('medicoId', '==', SISTEMA_MEDICO_ID)
    .where('catalogoAba', '==', 'protocolo')
    .get();
  const nomes = new Set(snap.docs.map((d) => String(d.data().nome)));
  const now = new Date();
  for (const p of PASTAS_PADRAO_PROTOCOLO) {
    if (nomes.has(p.nome)) continue;
    await db.collection(COL_PASTAS).add({
      medicoId: SISTEMA_MEDICO_ID,
      catalogoAba: 'protocolo',
      nome: p.nome,
      ordem: p.ordem,
      sistemaPadrao: true,
      criadoEm: now,
      atualizadoEm: now,
    });
  }
}

async function migrarPrescricoesSemPasta(
  db: FirebaseFirestore.Firestore,
  pastas: PrescricaoPasta[]
): Promise<void> {
  const snap = await db
    .collection(COL_PRESCRICOES)
    .where('medicoId', '==', SISTEMA_MEDICO_ID)
    .where('isTemplate', '==', true)
    .get();

  const pastaPorNome = (aba: PrescricaoCatalogoAba, nome: string) =>
    pastas.find((p) => p.catalogoAba === aba && p.nome === nome);

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.pastaId) continue;
    const catalogoAba = (data.catalogoAba as PrescricaoCatalogoAba) || 'prescricao';
    const pastaNome = inferirPastaNomeLegado(String(data.nome ?? ''), data.tipoDocumento as string | undefined);
    const pasta = pastaPorNome(catalogoAba, pastaNome) ?? pastaPorNome('prescricao', 'Outros');
    if (!pasta) continue;
    await doc.ref.update({
      catalogoAba,
      pastaId: pasta.id,
      pastaNome: pasta.nome,
      atualizadoEm: new Date(),
    });
  }
}

/** Persiste itens legados em `descricao` e limpa `itens` (prescrição e protocolo). */
async function migrarConteudoUnificadoSistema(db: FirebaseFirestore.Firestore): Promise<void> {
  const snap = await db
    .collection(COL_PRESCRICOES)
    .where('medicoId', '==', SISTEMA_MEDICO_ID)
    .where('isTemplate', '==', true)
    .get();

  const now = new Date();
  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    if (data.tipoDocumento === 'recibo_medico') continue;
    if (
      !precisaMigrarConteudoUnificadoFirestore({
        tipoDocumento: data.tipoDocumento as PrescricaoTipoDocumento | undefined,
        descricao: data.descricao as string | undefined,
        itens: data.itens as PrescricaoItem[],
      })
    ) {
      continue;
    }
    const merged = unificarConteudoTextoLivre({
      descricao: data.descricao as string | undefined,
      itens: data.itens as PrescricaoItem[],
    });
    await docSnap.ref.update({
      descricao: merged,
      itens: [],
      atualizadoEm: now,
    });
  }
}

type ItemPayload = {
  id?: string;
  pastaId?: string;
  catalogoAba?: PrescricaoCatalogoAba;
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

function validateItem(body: ItemPayload, isUpdate: boolean, pasta: PrescricaoPasta | null): string | null {
  if (!body.pastaId?.trim()) return 'Selecione uma pasta.';
  if (!pasta) return 'Pasta não encontrada.';
  if (!body.nome?.trim()) return 'Nome é obrigatório.';
  const isRecibo = body.tipoDocumento === 'recibo_medico' || pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME;
  if (isRecibo) {
    if (!body.descricao?.trim()) return 'Descrição do recibo é obrigatória.';
    return null;
  }
  if (!body.descricao?.trim()) return 'Escreva o conteúdo da prescrição/protocolo.';
  if (isUpdate && !body.id?.trim()) return 'ID é obrigatório para atualização.';
  return null;
}

function buildItemData(body: ItemPayload, pasta: PrescricaoPasta, criadoEm?: Date) {
  const now = new Date();
  const isRecibo = body.tipoDocumento === 'recibo_medico' || pasta.nome === PRESCRICAO_RECIBO_PASTA_NOME;
  const nomeFinal = nomeComPasta(pasta.nome, body.nome!.trim());
  const data: Record<string, unknown> = {
    medicoId: SISTEMA_MEDICO_ID,
    nome: nomeFinal,
    descricao: (body.descricao ?? '').trim(),
    itens: isRecibo ? [] : [],
    observacoes: (body.observacoes ?? '').trim(),
    isTemplate: true,
    criadoPor: SISTEMA_MEDICO_ID,
    catalogoAba: pasta.catalogoAba,
    pastaId: pasta.id,
    pastaNome: pasta.nome,
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
    await ensurePastasPadraoPrescricao(db);
    await ensurePastasPadraoProtocolo(db);

    const pastasSnap = await db.collection(COL_PASTAS).where('medicoId', '==', SISTEMA_MEDICO_ID).get();
    let pastas = pastasSnap.docs.map((d) => mapPasta(d.id, d.data() as Record<string, unknown>));
    pastas.sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, 'pt-BR'));

    await migrarPrescricoesSemPasta(db, pastas);
    await migrarConteudoUnificadoSistema(db);

    const itensSnap = await db
      .collection(COL_PRESCRICOES)
      .where('medicoId', '==', SISTEMA_MEDICO_ID)
      .where('isTemplate', '==', true)
      .get();
    const itens = itensSnap.docs
      .map((d) => mapPrescricao(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => b.atualizadoEm.getTime() - a.atualizadoEm.getTime());

    const catalogo = request.nextUrl.searchParams.get('catalogo') as PrescricaoCatalogoAba | null;
    if (catalogo === 'prescricao' || catalogo === 'protocolo') {
      pastas = pastas.filter((p) => p.catalogoAba === catalogo);
      const pastaIds = new Set(pastas.map((p) => p.id));
      return NextResponse.json({
        pastas,
        itens: itens.filter((i) => {
          const aba = i.catalogoAba || 'prescricao';
          return aba === catalogo && i.pastaId && pastaIds.has(i.pastaId);
        }),
      });
    }

    return NextResponse.json({ pastas, itens });
  } catch (e) {
    console.error('[metaadmingeral/prescricoes-catalogo GET]', e);
    return NextResponse.json({ error: 'Falha ao carregar catálogo.' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const tipo = body.tipo as string;
    const db = getFirestoreAdmin();
    const now = new Date();

    if (tipo === 'pasta') {
      const catalogoAba = body.catalogoAba as PrescricaoCatalogoAba;
      const nome = String(body.nome ?? '').trim();
      if (catalogoAba !== 'prescricao' && catalogoAba !== 'protocolo') {
        return NextResponse.json({ error: 'catalogoAba inválido.' }, { status: 400 });
      }
      if (!nome) return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });

      const dup = await db
        .collection(COL_PASTAS)
        .where('medicoId', '==', SISTEMA_MEDICO_ID)
        .where('catalogoAba', '==', catalogoAba)
        .where('nome', '==', nome)
        .limit(1)
        .get();
      if (!dup.empty) {
        return NextResponse.json({ error: 'Já existe uma pasta com este nome.' }, { status: 400 });
      }

      const maxOrdemSnap = await db
        .collection(COL_PASTAS)
        .where('medicoId', '==', SISTEMA_MEDICO_ID)
        .where('catalogoAba', '==', catalogoAba)
        .get();
      const maxOrdem = maxOrdemSnap.docs.reduce((m, d) => Math.max(m, Number(d.data().ordem) || 0), 0);

      const ref = await db.collection(COL_PASTAS).add({
        medicoId: SISTEMA_MEDICO_ID,
        catalogoAba,
        nome,
        ordem: maxOrdem + 10,
        sistemaPadrao: false,
        criadoEm: now,
        atualizadoEm: now,
      });
      const created = await ref.get();
      return NextResponse.json({ ok: true, pasta: mapPasta(ref.id, created.data() as Record<string, unknown>) });
    }

    if (tipo === 'item') {
      const payload = body as ItemPayload;
      const pastaSnap = await db.collection(COL_PASTAS).doc(payload.pastaId!).get();
      if (!pastaSnap.exists) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
      }
      const pasta = mapPasta(pastaSnap.id, pastaSnap.data() as Record<string, unknown>);
      const err = validateItem(payload, false, pasta);
      if (err) return NextResponse.json({ error: err }, { status: 400 });

      const ref = db.collection(COL_PRESCRICOES).doc();
      await ref.set(buildItemData(payload, pasta));
      const created = await ref.get();
      return NextResponse.json({ ok: true, item: mapPrescricao(ref.id, created.data() as Record<string, unknown>) });
    }

    return NextResponse.json({ error: 'tipo inválido.' }, { status: 400 });
  } catch (e) {
    console.error('[metaadmingeral/prescricoes-catalogo POST]', e);
    return NextResponse.json({ error: 'Falha ao criar.' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const db = getFirestoreAdmin();
    const now = new Date();

    if (body.tipo === 'pasta') {
      const id = String(body.id ?? '').trim();
      const nome = String(body.nome ?? '').trim();
      if (!id) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
      if (!nome) return NextResponse.json({ error: 'Nome da pasta é obrigatório.' }, { status: 400 });

      const ref = db.collection(COL_PASTAS).doc(id);
      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
      }
      const pastaData = existing.data()!;
      if (pastaData.medicoId !== SISTEMA_MEDICO_ID) {
        return NextResponse.json({ error: 'Somente pastas SISTEMA podem ser editadas aqui.' }, { status: 403 });
      }

      const catalogoAba = pastaData.catalogoAba as PrescricaoCatalogoAba;
      const nomeAtual = String(pastaData.nome ?? '');
      if (nome !== nomeAtual) {
        const dup = await db
          .collection(COL_PASTAS)
          .where('medicoId', '==', SISTEMA_MEDICO_ID)
          .where('catalogoAba', '==', catalogoAba)
          .where('nome', '==', nome)
          .limit(1)
          .get();
        if (!dup.empty && dup.docs[0]!.id !== id) {
          return NextResponse.json({ error: 'Já existe uma pasta com este nome.' }, { status: 400 });
        }
      }

      await ref.update({ nome, atualizadoEm: now });

      const itensSnap = await db.collection(COL_PRESCRICOES).where('pastaId', '==', id).get();
      if (!itensSnap.empty) {
        const batch = db.batch();
        for (const docSnap of itensSnap.docs) {
          const data = docSnap.data();
          if (data.medicoId !== SISTEMA_MEDICO_ID || data.isTemplate !== true) continue;
          const titulo = tituloExibicaoPrescricao(String(data.nome ?? ''));
          batch.update(docSnap.ref, {
            pastaNome: nome,
            nome: nomeComPasta(nome, titulo),
            atualizadoEm: now,
          });
        }
        await batch.commit();
      }

      const updated = await ref.get();
      return NextResponse.json({
        ok: true,
        pasta: mapPasta(ref.id, updated.data() as Record<string, unknown>),
      });
    }

    const itemBody = body as ItemPayload;
    if (!itemBody.id?.trim()) return NextResponse.json({ error: 'ID é obrigatório.' }, { status: 400 });
    const ref = db.collection(COL_PRESCRICOES).doc(itemBody.id!);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
    }
    const ex = existing.data()!;
    if (ex.medicoId !== SISTEMA_MEDICO_ID || ex.isTemplate !== true) {
      return NextResponse.json({ error: 'Somente itens SISTEMA podem ser editados aqui.' }, { status: 403 });
    }

    const pastaId = itemBody.pastaId || (ex.pastaId as string);
    const pastaSnap = await db.collection(COL_PASTAS).doc(pastaId).get();
    if (!pastaSnap.exists) {
      return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
    }
    const pasta = mapPasta(pastaSnap.id, pastaSnap.data() as Record<string, unknown>);
    const err = validateItem({ ...itemBody, pastaId }, true, pasta);
    if (err) return NextResponse.json({ error: err }, { status: 400 });

    const criadoEm = (ex.criadoEm as { toDate?: () => Date })?.toDate?.() ?? new Date();
    await ref.update(buildItemData(itemBody, pasta, criadoEm));
    const updated = await ref.get();
    return NextResponse.json({ ok: true, item: mapPrescricao(ref.id, updated.data() as Record<string, unknown>) });
  } catch (e) {
    console.error('[metaadmingeral/prescricoes-catalogo PUT]', e);
    return NextResponse.json({ error: 'Falha ao atualizar.' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const gate = await requireMetaAdminGeral(request);
  if (!gate.ok) return gate.res;
  try {
    const tipo = request.nextUrl.searchParams.get('tipo');
    const id = request.nextUrl.searchParams.get('id')?.trim();
    if (!id) return NextResponse.json({ error: 'Informe id.' }, { status: 400 });

    const db = getFirestoreAdmin();

    if (tipo === 'pasta') {
      const ref = db.collection(COL_PASTAS).doc(id);
      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json({ error: 'Pasta não encontrada.' }, { status: 404 });
      }
      const pastaData = existing.data()!;
      if (pastaData.medicoId !== SISTEMA_MEDICO_ID) {
        return NextResponse.json({ error: 'Somente pastas SISTEMA podem ser excluídas aqui.' }, { status: 403 });
      }

      const itensSnap = await db.collection(COL_PRESCRICOES).where('pastaId', '==', id).get();
      let itensRemovidos = 0;
      if (!itensSnap.empty) {
        const batch = db.batch();
        for (const docSnap of itensSnap.docs) {
          const data = docSnap.data();
          if (data.medicoId !== SISTEMA_MEDICO_ID || data.isTemplate !== true) continue;
          batch.delete(docSnap.ref);
          itensRemovidos++;
        }
        batch.delete(ref);
        await batch.commit();
      } else {
        await ref.delete();
      }

      return NextResponse.json({ ok: true, itensRemovidos });
    }

    const ref = db.collection(COL_PRESCRICOES).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ error: 'Item não encontrado.' }, { status: 404 });
    }
    const data = existing.data()!;
    if (data.medicoId !== SISTEMA_MEDICO_ID || data.isTemplate !== true) {
      return NextResponse.json({ error: 'Somente itens SISTEMA podem ser excluídos aqui.' }, { status: 403 });
    }
    await ref.delete();
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[metaadmingeral/prescricoes-catalogo DELETE]', e);
    return NextResponse.json({ error: 'Falha ao excluir.' }, { status: 500 });
  }
}

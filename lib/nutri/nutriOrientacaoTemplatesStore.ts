import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const NUTRI_ORIENTACAO_TEMPLATES_COLLECTION = 'nutri_orientacao_templates';

export const NUTRI_ORIENTACAO_TEMAS = [
  'Alimentação',
  'Hidratação',
  'Intestino',
  'Suplementos',
  'Horários das refeições',
  'Refeições fora de casa',
  'Treino',
  'Efeitos colaterais',
  'Geral',
] as const;

export type NutriOrientacaoTema = (typeof NUTRI_ORIENTACAO_TEMAS)[number] | string;

export type NutriOrientacaoTemplate = {
  id: string;
  ownerId: string;
  titulo: string;
  tema: string;
  mensagem: string;
  mensagemHtml?: string;
  createdAt: Date;
  updatedAt: Date;
  createdByName?: string;
  createdByRole?: 'nutritionist' | 'doctor';
};

function templatesCol() {
  return collection(db, NUTRI_ORIENTACAO_TEMPLATES_COLLECTION);
}

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value) {
    return (value as Timestamp).toDate();
  }
  const d = new Date(String(value || ''));
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function normalizeOrientacaoTema(value?: string | null): string {
  const tema = String(value || '').trim();
  return tema || 'Geral';
}

export function normalizeOrientacaoTitulo(value?: string | null): string {
  return String(value || '').trim();
}

function mapDoc(id: string, data: Record<string, unknown>): NutriOrientacaoTemplate {
  return {
    id,
    ownerId: String(data.ownerId || ''),
    titulo: String(data.titulo || 'Orientação nutricional'),
    tema: normalizeOrientacaoTema(typeof data.tema === 'string' ? data.tema : ''),
    mensagem: String(data.mensagem || ''),
    mensagemHtml: typeof data.mensagemHtml === 'string' ? data.mensagemHtml : undefined,
    createdAt: toDate(data.createdAt),
    updatedAt: toDate(data.updatedAt ?? data.createdAt),
    createdByName: typeof data.createdByName === 'string' ? data.createdByName : undefined,
    createdByRole: data.createdByRole === 'doctor' ? 'doctor' : 'nutritionist',
  };
}

export async function listNutriOrientacaoTemplates(ownerId: string): Promise<NutriOrientacaoTemplate[]> {
  const id = String(ownerId || '').trim();
  if (!id) return [];
  try {
    const snap = await getDocs(
      query(templatesCol(), where('ownerId', '==', id), orderBy('titulo', 'asc'))
    );
    return snap.docs.map((d) => mapDoc(d.id, d.data() as Record<string, unknown>));
  } catch {
    const snap = await getDocs(query(templatesCol(), where('ownerId', '==', id)));
    return snap.docs
      .map((d) => mapDoc(d.id, d.data() as Record<string, unknown>))
      .sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR'));
  }
}

export function groupNutriOrientacaoTemplatesByTema(
  items: NutriOrientacaoTemplate[]
): Array<{ tema: string; items: NutriOrientacaoTemplate[] }> {
  const map = new Map<string, NutriOrientacaoTemplate[]>();
  for (const item of items) {
    const tema = normalizeOrientacaoTema(item.tema);
    const list = map.get(tema) ?? [];
    list.push(item);
    map.set(tema, list);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === 'Geral') return 1;
      if (b === 'Geral') return -1;
      return a.localeCompare(b, 'pt-BR');
    })
    .map(([tema, grouped]) => ({
      tema,
      items: [...grouped].sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR')),
    }));
}

export async function saveNutriOrientacaoTemplate(input: {
  id?: string | null;
  ownerId: string;
  titulo: string;
  tema?: string | null;
  mensagem: string;
  mensagemHtml?: string;
  createdByName?: string;
  createdByRole?: 'nutritionist' | 'doctor';
  existing?: NutriOrientacaoTemplate[];
}): Promise<NutriOrientacaoTemplate> {
  const ownerId = String(input.ownerId || '').trim();
  const titulo = normalizeOrientacaoTitulo(input.titulo);
  const tema = normalizeOrientacaoTema(input.tema);
  const mensagem = String(input.mensagem || '').trim();
  if (!ownerId) throw new Error('Não foi possível identificar o profissional.');
  if (!titulo) throw new Error('Informe um título para guardar no diretório.');
  if (!mensagem) throw new Error('Escreva a orientação antes de guardar.');

  const now = new Date();
  const existing = input.existing ?? [];
  const sameTitle = existing.find(
    (item) => item.titulo.localeCompare(titulo, 'pt-BR', { sensitivity: 'accent' }) === 0
  );
  const id = String(input.id || sameTitle?.id || '').trim();

  const payload = {
    ownerId,
    titulo,
    tema,
    mensagem,
    mensagemHtml: input.mensagemHtml || null,
    updatedAt: now,
    createdByName: input.createdByName || null,
    createdByRole: input.createdByRole || 'nutritionist',
  };

  if (id) {
    await updateDoc(doc(db, NUTRI_ORIENTACAO_TEMPLATES_COLLECTION, id), payload);
    return {
      id,
      ownerId,
      titulo,
      tema,
      mensagem,
      mensagemHtml: input.mensagemHtml,
      createdAt: sameTitle?.createdAt || now,
      updatedAt: now,
      createdByName: input.createdByName,
      createdByRole: input.createdByRole || 'nutritionist',
    };
  }

  const ref = await addDoc(templatesCol(), {
    ...payload,
    createdAt: now,
  });
  return {
    id: ref.id,
    ownerId,
    titulo,
    tema,
    mensagem,
    mensagemHtml: input.mensagemHtml,
    createdAt: now,
    updatedAt: now,
    createdByName: input.createdByName,
    createdByRole: input.createdByRole || 'nutritionist',
  };
}

export async function deleteNutriOrientacaoTemplate(templateId: string): Promise<void> {
  const id = String(templateId || '').trim();
  if (!id) return;
  await deleteDoc(doc(db, NUTRI_ORIENTACAO_TEMPLATES_COLLECTION, id));
}

import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import {
  criarRefeicoesPlanoVazias,
  normalizarItemComPorcao,
  type NutriPlanoCardapioTemplate,
  type RefeicaoPlanoKey,
  type RefeicaoPlanoTemplate,
} from '@/lib/nutri/planosNutricionista';

const SUBCOL = 'planos_cardapio';

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
  // Date, Timestamp, FieldValue (serverTimestamp), etc.
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    return value;
  }
  const out: Record<string, unknown> = {};
  for (const [key, nested] of Object.entries(value as Record<string, unknown>)) {
    if (nested === undefined) continue;
    out[key] = omitUndefinedDeep(nested);
  }
  return out as T;
}

function serializarItem(item: RefeicaoPlanoTemplate['itens'][number]) {
  return omitUndefinedDeep({
    id: item.id,
    nome: item.nome,
    categoria: item.categoria,
    proteina_g: item.proteina_g ?? 0,
    calorias_kcal: item.calorias_kcal ?? 0,
    descricao: item.descricao || undefined,
    peso_g: typeof item.peso_g === 'number' ? item.peso_g : undefined,
    quantidade: typeof item.quantidade === 'number' ? item.quantidade : undefined,
    unidade: item.unidade?.trim() || undefined,
    proteinaBase_g: typeof item.proteinaBase_g === 'number' ? item.proteinaBase_g : undefined,
    caloriasBase_kcal:
      typeof item.caloriasBase_kcal === 'number' ? item.caloriasBase_kcal : undefined,
    pesoBase_g: typeof item.pesoBase_g === 'number' ? item.pesoBase_g : undefined,
    carboidrato_g: typeof item.carboidrato_g === 'number' ? item.carboidrato_g : undefined,
    gordura_g: typeof item.gordura_g === 'number' ? item.gordura_g : undefined,
    fibra_g: typeof item.fibra_g === 'number' ? item.fibra_g : undefined,
    carboidratoBase_g:
      typeof item.carboidratoBase_g === 'number' ? item.carboidratoBase_g : undefined,
    gorduraBase_g: typeof item.gorduraBase_g === 'number' ? item.gorduraBase_g : undefined,
    fibraBase_g: typeof item.fibraBase_g === 'number' ? item.fibraBase_g : undefined,
    origemAlimento: item.origemAlimento || undefined,
    alimentoGlobalId: item.alimentoGlobalId?.trim() || undefined,
  });
}

function serializarRefeicao(refeicao: RefeicaoPlanoTemplate) {
  return omitUndefinedDeep({
    itens: (refeicao.itens || []).map(serializarItem),
    itensSelecionados: refeicao.itensSelecionados || [],
    proteina_g: refeicao.proteina_g ?? 0,
    calorias_kcal: refeicao.calorias_kcal ?? 0,
    carboidrato_g: typeof refeicao.carboidrato_g === 'number' ? refeicao.carboidrato_g : undefined,
    gordura_g: typeof refeicao.gordura_g === 'number' ? refeicao.gordura_g : undefined,
    fibra_g: typeof refeicao.fibra_g === 'number' ? refeicao.fibra_g : undefined,
    titulo: refeicao.titulo || '',
    descricao: refeicao.descricao || '',
    observacao: refeicao.observacao?.trim() || undefined,
  });
}

function serializarRefeicoes(refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>) {
  const out = {} as Record<RefeicaoPlanoKey, ReturnType<typeof serializarRefeicao>>;
  (Object.keys(criarRefeicoesPlanoVazias()) as RefeicaoPlanoKey[]).forEach((key) => {
    out[key] = serializarRefeicao(refeicoes[key] || criarRefeicoesPlanoVazias()[key]);
  });
  return out;
}

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  if (typeof v === 'string' || typeof v === 'number') {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function parseRefeicao(raw: unknown): RefeicaoPlanoTemplate {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const itensRaw = Array.isArray(r.itens) ? r.itens : [];
  const itens = itensRaw
    .map((it) => {
      if (!it || typeof it !== 'object') return null;
      const i = it as Record<string, unknown>;
      const id = typeof i.id === 'string' ? i.id : '';
      const nome = typeof i.nome === 'string' ? i.nome : '';
      if (!id || !nome) return null;
      return normalizarItemComPorcao({
        id,
        nome,
        categoria: (typeof i.categoria === 'string' ? i.categoria : 'extra') as RefeicaoPlanoTemplate['itens'][number]['categoria'],
        proteina_g: typeof i.proteina_g === 'number' ? i.proteina_g : Number(i.proteina_g) || 0,
        calorias_kcal:
          typeof i.calorias_kcal === 'number' ? i.calorias_kcal : Number(i.calorias_kcal) || 0,
        descricao: typeof i.descricao === 'string' ? i.descricao : undefined,
        peso_g: typeof i.peso_g === 'number' ? i.peso_g : undefined,
        quantidade: typeof i.quantidade === 'number' ? i.quantidade : undefined,
        unidade: typeof i.unidade === 'string' ? i.unidade : undefined,
        proteinaBase_g: typeof i.proteinaBase_g === 'number' ? i.proteinaBase_g : undefined,
        caloriasBase_kcal:
          typeof i.caloriasBase_kcal === 'number' ? i.caloriasBase_kcal : undefined,
        pesoBase_g: typeof i.pesoBase_g === 'number' ? i.pesoBase_g : undefined,
        carboidrato_g: typeof i.carboidrato_g === 'number' ? i.carboidrato_g : undefined,
        gordura_g: typeof i.gordura_g === 'number' ? i.gordura_g : undefined,
        fibra_g: typeof i.fibra_g === 'number' ? i.fibra_g : undefined,
        carboidratoBase_g:
          typeof i.carboidratoBase_g === 'number' ? i.carboidratoBase_g : undefined,
        gorduraBase_g: typeof i.gorduraBase_g === 'number' ? i.gorduraBase_g : undefined,
        fibraBase_g: typeof i.fibraBase_g === 'number' ? i.fibraBase_g : undefined,
        origemAlimento:
          i.origemAlimento === 'metanutri' ||
          i.origemAlimento === 'taco' ||
          i.origemAlimento === 'manual' ||
          i.origemAlimento === 'legacy'
            ? i.origemAlimento
            : undefined,
        alimentoGlobalId:
          typeof i.alimentoGlobalId === 'string' ? i.alimentoGlobalId : undefined,
      });
    })
    .filter(Boolean) as RefeicaoPlanoTemplate['itens'];

  const selecionados = Array.isArray(r.itensSelecionados)
    ? r.itensSelecionados.filter((x): x is string => typeof x === 'string')
    : [];

  return {
    itens,
    itensSelecionados: selecionados,
    proteina_g: typeof r.proteina_g === 'number' ? r.proteina_g : 0,
    calorias_kcal: typeof r.calorias_kcal === 'number' ? r.calorias_kcal : 0,
    carboidrato_g: typeof r.carboidrato_g === 'number' ? r.carboidrato_g : undefined,
    gordura_g: typeof r.gordura_g === 'number' ? r.gordura_g : undefined,
    fibra_g: typeof r.fibra_g === 'number' ? r.fibra_g : undefined,
    titulo: typeof r.titulo === 'string' ? r.titulo : '',
    descricao: typeof r.descricao === 'string' ? r.descricao : '',
    observacao: typeof r.observacao === 'string' ? r.observacao : '',
  };
}

function parseTemplate(
  id: string,
  nutricionistaId: string,
  data: Record<string, unknown>
): NutriPlanoCardapioTemplate {
  const base = criarRefeicoesPlanoVazias();
  const refeicoesRaw =
    data.refeicoes && typeof data.refeicoes === 'object'
      ? (data.refeicoes as Record<string, unknown>)
      : {};
  (Object.keys(base) as RefeicaoPlanoKey[]).forEach((key) => {
    base[key] = parseRefeicao(refeicoesRaw[key]);
  });
  return {
    id,
    nutricionistaId,
    nome: typeof data.nome === 'string' ? data.nome : 'Plano sem nome',
    criadoEm: toDateSafe(data.criadoEm),
    atualizadoEm: toDateSafe(data.atualizadoEm),
    refeicoes: base,
  };
}

export class NutriPlanosTemplateService {
  static collectionRef(nutricionistaId: string) {
    return collection(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL);
  }

  static async listar(nutricionistaId: string): Promise<NutriPlanoCardapioTemplate[]> {
    const q = query(this.collectionRef(nutricionistaId), orderBy('atualizadoEm', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) =>
      parseTemplate(d.id, nutricionistaId, d.data() as Record<string, unknown>)
    );
  }

  static async salvar(
    nutricionistaId: string,
    input: {
      id?: string;
      nome: string;
      refeicoes: Record<RefeicaoPlanoKey, RefeicaoPlanoTemplate>;
      criadoEm?: Date;
    }
  ): Promise<NutriPlanoCardapioTemplate> {
    const nome = input.nome.trim();
    if (!nome) throw new Error('Informe o nome do plano.');
    const id = input.id || doc(this.collectionRef(nutricionistaId)).id;
    const ref = doc(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL, id);
    const agora = new Date();
    const payload = omitUndefinedDeep({
      nome,
      refeicoes: serializarRefeicoes(input.refeicoes),
      atualizadoEm: serverTimestamp(),
      ...(input.id
        ? {}
        : { criadoEm: input.criadoEm ? Timestamp.fromDate(input.criadoEm) : serverTimestamp() }),
    });
    await setDoc(ref, payload, { merge: true });
    return {
      id,
      nutricionistaId,
      nome,
      criadoEm: input.criadoEm || agora,
      atualizadoEm: agora,
      refeicoes: input.refeicoes,
    };
  }

  static async excluir(nutricionistaId: string, planoId: string): Promise<void> {
    await deleteDoc(doc(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL, planoId));
  }
}

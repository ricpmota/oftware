import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COL_NUTRICIONISTAS } from '@/features/metaNutri/metaNutri.constants';
import {
  GRUPOS_ALIMENTO_ORDEM,
  IDS_ALIMENTOS_DEPRECADOS,
  seedAlimentosDoCatalogoBase,
  type AlimentoNutricionista,
  type GrupoAlimentoRefeicao,
} from '@/lib/nutri/alimentosNutricionista';
import {
  nomeBaseAlimento,
  type CategoriaItemPlano,
} from '@/lib/nutri/planosNutricionista';

const SUBCOL = 'alimentos';

function omitUndefinedDeep<T>(value: T): T {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) {
    return value.map((item) => omitUndefinedDeep(item)) as T;
  }
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

function parseAlimento(id: string, data: Record<string, unknown>): AlimentoNutricionista {
  const gruposRaw = Array.isArray(data.grupos) ? data.grupos : [];
  const grupos = gruposRaw.filter(
    (g): g is GrupoAlimentoRefeicao =>
      typeof g === 'string' && GRUPOS_ALIMENTO_ORDEM.includes(g as GrupoAlimentoRefeicao)
  );
  return {
    id,
    nome: nomeBaseAlimento(typeof data.nome === 'string' ? data.nome : 'Alimento'),
    categoria: (typeof data.categoria === 'string'
      ? data.categoria
      : 'extra') as CategoriaItemPlano,
    proteina_g: typeof data.proteina_g === 'number' ? data.proteina_g : Number(data.proteina_g) || 0,
    calorias_kcal:
      typeof data.calorias_kcal === 'number' ? data.calorias_kcal : Number(data.calorias_kcal) || 0,
    descricao: typeof data.descricao === 'string' ? data.descricao : undefined,
    peso_g: typeof data.peso_g === 'number' ? data.peso_g : undefined,
    quantidade: typeof data.quantidade === 'number' ? data.quantidade : undefined,
    unidade: typeof data.unidade === 'string' ? data.unidade : undefined,
    proteinaBase_g: typeof data.proteinaBase_g === 'number' ? data.proteinaBase_g : undefined,
    caloriasBase_kcal:
      typeof data.caloriasBase_kcal === 'number' ? data.caloriasBase_kcal : undefined,
    pesoBase_g: typeof data.pesoBase_g === 'number' ? data.pesoBase_g : undefined,
    favorito: Boolean(data.favorito),
    grupos: grupos.length > 0 ? grupos : [...GRUPOS_ALIMENTO_ORDEM],
    origemCatalogo: Boolean(data.origemCatalogo),
    criadoEm: toDateSafe(data.criadoEm),
    atualizadoEm: toDateSafe(data.atualizadoEm),
  };
}

function serializarAlimento(alimento: AlimentoNutricionista, isNew: boolean) {
  return omitUndefinedDeep({
    nome: nomeBaseAlimento(alimento.nome),
    categoria: alimento.categoria,
    proteina_g: alimento.proteina_g ?? 0,
    calorias_kcal: alimento.calorias_kcal ?? 0,
    descricao: alimento.descricao || undefined,
    peso_g: typeof alimento.peso_g === 'number' ? alimento.peso_g : undefined,
    quantidade: typeof alimento.quantidade === 'number' ? alimento.quantidade : undefined,
    unidade: alimento.unidade?.trim() || undefined,
    proteinaBase_g:
      typeof alimento.proteinaBase_g === 'number' ? alimento.proteinaBase_g : undefined,
    caloriasBase_kcal:
      typeof alimento.caloriasBase_kcal === 'number' ? alimento.caloriasBase_kcal : undefined,
    pesoBase_g: typeof alimento.pesoBase_g === 'number' ? alimento.pesoBase_g : undefined,
    favorito: Boolean(alimento.favorito),
    grupos: Array.isArray(alimento.grupos) ? alimento.grupos : [],
    origemCatalogo: Boolean(alimento.origemCatalogo),
    ...(isNew ? { criadoEm: serverTimestamp() } : {}),
    atualizadoEm: serverTimestamp(),
  });
}

export class NutriAlimentosService {
  static collectionRef(nutricionistaId: string) {
    return collection(db, COL_NUTRICIONISTAS, nutricionistaId, SUBCOL);
  }

  static async listar(nutricionistaId: string): Promise<AlimentoNutricionista[]> {
    const snap = await getDocs(
      query(this.collectionRef(nutricionistaId), orderBy('nome', 'asc'))
    );
    return snap.docs.map((d) => parseAlimento(d.id, d.data() as Record<string, unknown>));
  }

  /**
   * Garante a lista curada na base do nutricionista:
   * - upsert dos alimentos do catálogo oficial (preserva favorito)
   * - remove IDs duplicados/depreciados
   * - mantém alimentos criados pela própria nutri (`origemCatalogo: false`)
   */
  static async garantirSeed(nutricionistaId: string): Promise<AlimentoNutricionista[]> {
    const existentes = await this.listar(nutricionistaId);
    const porId = new Map(existentes.map((a) => [a.id, a]));
    const seed = seedAlimentosDoCatalogoBase();
    const seedIds = new Set(seed.map((s) => s.id));
    const now = new Date();
    const CHUNK = 400;

    // Upsert catálogo curado
    for (let i = 0; i < seed.length; i += CHUNK) {
      const slice = seed.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const item of slice) {
        const atual = porId.get(item.id);
        const favorito = atual?.favorito ?? false;
        // Se a nutri já customizou um item do catálogo (mesmo id), preserva favorito;
        // macros/nome/peso/grupos/unidade vêm da versão curada oficial.
        const payload = omitUndefinedDeep({
          ...item,
          favorito,
          criadoEm: atual ? undefined : serverTimestamp(),
          atualizadoEm: serverTimestamp(),
        });
        batch.set(doc(this.collectionRef(nutricionistaId), item.id), payload, { merge: true });
      }
      await batch.commit();
    }

    // Remove duplicatas/depreciados + itens de catálogo que saíram da lista oficial
    const paraRemover = existentes.filter((a) => {
      if (!a.origemCatalogo) return false;
      if (IDS_ALIMENTOS_DEPRECADOS.includes(a.id)) return true;
      if (!seedIds.has(a.id)) return true;
      return false;
    });
    for (let i = 0; i < paraRemover.length; i += CHUNK) {
      const slice = paraRemover.slice(i, i + CHUNK);
      const batch = writeBatch(db);
      for (const item of slice) {
        batch.delete(doc(this.collectionRef(nutricionistaId), item.id));
      }
      await batch.commit();
    }

    return this.listar(nutricionistaId).then((lista) =>
      lista.length
        ? lista
        : seed.map((item) => ({
            ...item,
            criadoEm: now,
            atualizadoEm: now,
          }))
    );
  }

  static async salvar(
    nutricionistaId: string,
    alimento: AlimentoNutricionista,
    opts?: { isNew?: boolean }
  ): Promise<void> {
    const isNew = Boolean(opts?.isNew);
    const ref = doc(this.collectionRef(nutricionistaId), alimento.id);
    await setDoc(ref, serializarAlimento(alimento, isNew), { merge: true });
  }

  static async excluir(nutricionistaId: string, alimentoId: string): Promise<void> {
    await deleteDoc(doc(this.collectionRef(nutricionistaId), alimentoId));
  }
}

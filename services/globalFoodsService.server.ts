/**
 * Service server-only da Base Global de Alimentos (Patrimônio Global).
 * Usa Admin SDK — importar apenas em rotas/API ou código server.
 * Não misturar com NutriAlimentosService.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import {
  COL_ALIMENTOS_GLOBAIS,
  alimentoGlobalToJson,
  alimentoMatchesFilters,
  isStatusAlimentoGlobal,
  normalizeNomeAlimento,
  parseAlimentoGlobalDoc,
  serializeAlimentoGlobalPayload,
  type AlimentoGlobal,
  type AlimentoGlobalCreateInput,
  type AlimentoGlobalListFilters,
  type AlimentoGlobalUpdateInput,
  type StatusAlimentoGlobal,
} from '@/lib/metaadmingeral/alimentosGlobais';

export class GlobalFoodsService {
  static collectionRef() {
    return getFirestoreAdmin().collection(COL_ALIMENTOS_GLOBAIS);
  }

  static async listar(filters: AlimentoGlobalListFilters = {}): Promise<AlimentoGlobal[]> {
    let snap;
    try {
      snap = await this.collectionRef().orderBy('nomeNormalizado', 'asc').get();
    } catch (error) {
      console.warn('[GlobalFoodsService.listar] orderBy falhou; fallback sem ordem.', error);
      snap = await this.collectionRef().get();
    }
    const itens: AlimentoGlobal[] = [];
    for (const doc of snap.docs) {
      const parsed = parseAlimentoGlobalDoc(doc.id, doc.data() as Record<string, unknown>);
      if (parsed && alimentoMatchesFilters(parsed, filters)) {
        itens.push(parsed);
      }
    }
    itens.sort((a, b) => a.nomeNormalizado.localeCompare(b.nomeNormalizado, 'pt-BR'));
    return itens;
  }

  static async buscar(filters: AlimentoGlobalListFilters): Promise<AlimentoGlobal[]> {
    return this.listar(filters);
  }

  static async obterPorId(id: string): Promise<AlimentoGlobal | null> {
    const snap = await this.collectionRef().doc(id).get();
    if (!snap.exists) return null;
    return parseAlimentoGlobalDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  /**
   * Busca server-side de alimentos published (MetaNutri).
   * Prefixo em nomeNormalizado + status==published.
   * Não retorna draft/review/inactive.
   */
  static async buscarPublicados(opts: {
    q: string;
    limit?: number;
    segmento?: string | null;
    startAfterNomeNormalizado?: string | null;
  }): Promise<AlimentoGlobal[]> {
    const qNorm = normalizeNomeAlimento(opts.q).trim();
    const limit = Math.min(50, Math.max(1, opts.limit ?? 30));
    if (qNorm.length < 2) return [];

    const end = `${qNorm}\uf8ff`;
    let snap;
    try {
      let qRef = this.collectionRef()
        .where('status', '==', 'published')
        .where('nomeNormalizado', '>=', qNorm)
        .where('nomeNormalizado', '<=', end)
        .orderBy('nomeNormalizado', 'asc');
      if (opts.startAfterNomeNormalizado) {
        qRef = qRef.startAfter(opts.startAfterNomeNormalizado);
      }
      snap = await qRef.limit(Math.min(100, limit * 3)).get();
    } catch (error) {
      console.warn(
        '[GlobalFoodsService.buscarPublicados] query indexada falhou; fallback status+memória.',
        error
      );
      try {
        snap = await this.collectionRef()
          .where('status', '==', 'published')
          .orderBy('nomeNormalizado', 'asc')
          .limit(400)
          .get();
      } catch (err2) {
        console.warn('[GlobalFoodsService.buscarPublicados] fallback amplo falhou.', err2);
        snap = await this.collectionRef().where('status', '==', 'published').limit(400).get();
      }
    }

    const itens: AlimentoGlobal[] = [];
    for (const doc of snap.docs) {
      const parsed = parseAlimentoGlobalDoc(doc.id, doc.data() as Record<string, unknown>);
      if (!parsed || parsed.status !== 'published') continue;
      if (opts.segmento && parsed.segmento !== opts.segmento) continue;
      const marcaNorm = parsed.marca ? normalizeNomeAlimento(parsed.marca) : '';
      const matchPrefix = parsed.nomeNormalizado.startsWith(qNorm);
      const matchIncludes =
        parsed.nomeNormalizado.includes(qNorm) ||
        (marcaNorm.length > 0 && marcaNorm.includes(qNorm));
      if (matchPrefix || matchIncludes) {
        itens.push(parsed);
      }
      if (itens.length >= limit) break;
    }

    itens.sort((a, b) => {
      const aP = a.nomeNormalizado.startsWith(qNorm) ? 0 : 1;
      const bP = b.nomeNormalizado.startsWith(qNorm) ? 0 : 1;
      if (aP !== bP) return aP - bP;
      return a.nomeNormalizado.localeCompare(b.nomeNormalizado, 'pt-BR');
    });
    return itens.slice(0, limit);
  }

  /**
   * Listagem paginada de published (busca vazia / carregar mais).
   * Opcionalmente filtra por segmento.
   */
  static async listarPublicados(opts: {
    limit?: number;
    segmento?: string | null;
    startAfterNomeNormalizado?: string | null;
  } = {}): Promise<AlimentoGlobal[]> {
    const limit = Math.min(50, Math.max(1, opts.limit ?? 30));
    let snap;
    try {
      let qRef = this.collectionRef().where('status', '==', 'published');
      if (opts.segmento) {
        qRef = qRef.where('segmento', '==', opts.segmento);
      }
      qRef = qRef.orderBy('nomeNormalizado', 'asc');
      if (opts.startAfterNomeNormalizado) {
        qRef = qRef.startAfter(opts.startAfterNomeNormalizado);
      }
      snap = await qRef.limit(limit).get();
    } catch (error) {
      console.warn('[GlobalFoodsService.listarPublicados] query falhou; fallback.', error);
      snap = await this.collectionRef()
        .where('status', '==', 'published')
        .limit(200)
        .get();
    }

    const itens: AlimentoGlobal[] = [];
    for (const doc of snap.docs) {
      const parsed = parseAlimentoGlobalDoc(doc.id, doc.data() as Record<string, unknown>);
      if (!parsed || parsed.status !== 'published') continue;
      if (opts.segmento && parsed.segmento !== opts.segmento) continue;
      itens.push(parsed);
    }
    itens.sort((a, b) => a.nomeNormalizado.localeCompare(b.nomeNormalizado, 'pt-BR'));
    return itens.slice(0, limit);
  }

  static async criar(
    input: AlimentoGlobalCreateInput,
    opts: { uid: string }
  ): Promise<AlimentoGlobal> {
    const payload = serializeAlimentoGlobalPayload(input, { forCreate: true, uid: opts.uid });
    const ref = input.id
      ? this.collectionRef().doc(input.id)
      : this.collectionRef().doc();
    await ref.set({
      ...payload,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });
    const created = await this.obterPorId(ref.id);
    if (!created) throw new Error('Falha ao ler alimento recém-criado.');
    return created;
  }

  static async atualizar(
    id: string,
    input: AlimentoGlobalUpdateInput,
    opts: { uid: string }
  ): Promise<AlimentoGlobal> {
    const existente = await this.obterPorId(id);
    if (!existente) throw new Error('Alimento não encontrado.');
    const payload = serializeAlimentoGlobalPayload(
      { ...input, nome: input.nome ?? existente.nome },
      { forCreate: false, uid: opts.uid }
    );
    await this.collectionRef().doc(id).set(
      {
        ...payload,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    const updated = await this.obterPorId(id);
    if (!updated) throw new Error('Falha ao ler alimento atualizado.');
    return updated;
  }

  static async alterarStatus(
    id: string,
    status: StatusAlimentoGlobal,
    opts: { uid: string }
  ): Promise<AlimentoGlobal> {
    if (!isStatusAlimentoGlobal(status)) throw new Error('Status inválido.');
    const existente = await this.obterPorId(id);
    if (!existente) throw new Error('Alimento não encontrado.');
    await this.collectionRef().doc(id).set(
      {
        status,
        atualizadoPorUid: opts.uid,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    const updated = await this.obterPorId(id);
    if (!updated) throw new Error('Falha ao ler alimento atualizado.');
    return updated;
  }

  static toJsonList(itens: AlimentoGlobal[]) {
    return itens.map(alimentoGlobalToJson);
  }
}

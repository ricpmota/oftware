/**
 * Service server-only de importações PDF → drafts (não publica em alimentos_globais).
 */

import { FieldValue } from 'firebase-admin/firestore';
import { getAdminStorageBucket, getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import type { ExtractedPdfPage } from '@/lib/oftpay/extractedPdfPage';
import { COL_ALIMENTOS_GLOBAIS } from '@/lib/metaadmingeral/alimentosGlobais/constants';
import { normalizeNomeAlimento } from '@/lib/metaadmingeral/alimentosGlobais/normalizeNomeAlimento';
import {
  COL_ALIMENTOS_IMPORTACOES,
  FOOD_IMPORT_MAP_PAGES_PER_BATCH,
  FOOD_IMPORT_PAGES_PER_CACHE_DOC,
  FOOD_PDF_PROMPT_VERSION,
  SUBCOL_IMPORT_ITENS,
  SUBCOL_IMPORT_LOTES,
  SUBCOL_IMPORT_PAGINAS,
  SUBCOL_IMPORT_PAGE_IMAGES,
  SUBCOL_IMPORT_SCHEMAS,
  type StatusImportacaoAlimento,
  type StatusLoteImport,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import {
  buildChunkTextForGemini,
  isImportProcessingComplete,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/chunking';
import {
  buildDocumentFoodMapThrough,
  classificationForPage,
  isDocumentFoodMapComplete,
  shouldExtractFoods,
  summarizeDocumentFoodMap,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage';
import { findDuplicateMatches } from '@/lib/metaadmingeral/alimentosGlobais/importacao/detectDuplicates';
import {
  emptyObservability,
  extractFoodsForChunk,
  mergeObservability,
  selectNextMappedChunk,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/processImportLoteCore';
import { discoverFoodTableSchema } from '@/lib/metaadmingeral/alimentosGlobais/importacao/foodPdfSchemaDiscovery.server';
import { normalizeExtractionItem } from '@/lib/metaadmingeral/alimentosGlobais/importacao/normalizeExtraction';
import {
  computeNextRetryDelayMs,
  GeminiImportError,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/geminiRetry';
import {
  applyValidationAndDuplicates,
  foodDraftHasNutrientData,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/validateExtraction';
import { computePublicationReadiness } from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationReadiness';
import { parseFoodTableSchema, type FoodTableSchema } from '@/lib/metaadmingeral/alimentosGlobais/importacao/tableSchema';
import type {
  AlimentoImportacaoDoc,
  AlimentoImportacaoLote,
  ImportObservability,
  ImportedFoodDraft,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/types';

const LEGACY_PAGES_CACHE_FIELD = 'pagesText';

function toDateSafe(v: unknown): Date {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: () => Date }).toDate === 'function') {
    return (v as { toDate: () => Date }).toDate();
  }
  return new Date();
}

function pagesCacheChunkId(chunkIndex: number): string {
  return `chunk_${String(chunkIndex).padStart(4, '0')}`;
}

function parseImportDoc(id: string, data: Record<string, unknown>): AlimentoImportacaoDoc {
  return {
    id,
    arquivoNome: String(data.arquivoNome || ''),
    arquivoStoragePath: String(data.arquivoStoragePath || ''),
    arquivoUrl: typeof data.arquivoUrl === 'string' ? data.arquivoUrl : null,
    fonteNome: String(data.fonteNome || ''),
    fonteVersao: typeof data.fonteVersao === 'string' ? data.fonteVersao : null,
    fonteAno: typeof data.fonteAno === 'number' ? data.fonteAno : null,
    licenca: typeof data.licenca === 'string' ? data.licenca : null,
    observacao: typeof data.observacao === 'string' ? data.observacao : null,
    tipoConteudoEsperado:
      typeof data.tipoConteudoEsperado === 'string' ? data.tipoConteudoEsperado : null,
    status: (data.status as StatusImportacaoAlimento) || 'uploaded',
    totalPaginas: typeof data.totalPaginas === 'number' ? data.totalPaginas : 0,
    paginasProcessadas: typeof data.paginasProcessadas === 'number' ? data.paginasProcessadas : 0,
    totalItensExtraidos: typeof data.totalItensExtraidos === 'number' ? data.totalItensExtraidos : 0,
    totalValidos: typeof data.totalValidos === 'number' ? data.totalValidos : 0,
    totalComAtencao: typeof data.totalComAtencao === 'number' ? data.totalComAtencao : 0,
    totalParaRevisao: typeof data.totalParaRevisao === 'number' ? data.totalParaRevisao : 0,
    totalDuplicados: typeof data.totalDuplicados === 'number' ? data.totalDuplicados : 0,
    geminiModel: typeof data.geminiModel === 'string' ? data.geminiModel : null,
    promptVersion: typeof data.promptVersion === 'string' ? data.promptVersion : null,
    erro: typeof data.erro === 'string' ? data.erro : null,
    documentFoodMap:
      data.documentFoodMap && typeof data.documentFoodMap === 'object'
        ? (data.documentFoodMap as AlimentoImportacaoDoc['documentFoodMap'])
        : null,
    activeTableSchemaId:
      typeof data.activeTableSchemaId === 'string' ? data.activeTableSchemaId : null,
    observability:
      data.observability && typeof data.observability === 'object'
        ? (data.observability as AlimentoImportacaoDoc['observability'])
        : null,
    publicationSummary:
      data.publicationSummary && typeof data.publicationSummary === 'object'
        ? (data.publicationSummary as AlimentoImportacaoDoc['publicationSummary'])
        : null,
    publishedAt: data.publishedAt ? toDateSafe(data.publishedAt) : null,
    publishedByUid: typeof data.publishedByUid === 'string' ? data.publishedByUid : null,
    criadoPorUid: String(data.criadoPorUid || ''),
    criadoPorEmail: typeof data.criadoPorEmail === 'string' ? data.criadoPorEmail : null,
    criadoEm: toDateSafe(data.criadoEm),
    atualizadoEm: toDateSafe(data.atualizadoEm),
  };
}

function draftToFirestore(d: ImportedFoodDraft): Record<string, unknown> {
  // rawGemini pode ser grande — não persistir no item (rastreio fica em valoresOriginais/lote)
  const { rawGemini: _raw, ...rest } = d;
  return {
    ...rest,
    criadoEm: d.criadoEm,
    atualizadoEm: FieldValue.serverTimestamp(),
  };
}

export class GlobalFoodsImportService {
  static collectionRef() {
    return getFirestoreAdmin().collection(COL_ALIMENTOS_IMPORTACOES);
  }

  static async listarImportacoes(): Promise<AlimentoImportacaoDoc[]> {
    const snap = await this.collectionRef().orderBy('criadoEm', 'desc').limit(100).get();
    return snap.docs.map((d) => parseImportDoc(d.id, d.data() as Record<string, unknown>));
  }

  static async obterImportacao(id: string): Promise<AlimentoImportacaoDoc | null> {
    const snap = await this.collectionRef().doc(id).get();
    if (!snap.exists) return null;
    return parseImportDoc(snap.id, snap.data() as Record<string, unknown>);
  }

  static async listarItens(importId: string): Promise<ImportedFoodDraft[]> {
    const snap = await this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_ITENS).get();
    return snap.docs
      .map((d) => {
        const data = d.data() as Record<string, unknown>;
        return {
          ...(data as unknown as ImportedFoodDraft),
          id: d.id,
          criadoEm: toDateSafe(data.criadoEm),
          atualizadoEm: toDateSafe(data.atualizadoEm),
        };
      })
      .filter((item) => foodDraftHasNutrientData(item as ImportedFoodDraft & Record<string, unknown>));
  }

  static async listarLotes(importId: string): Promise<AlimentoImportacaoLote[]> {
    const snap = await this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_LOTES).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      return {
        id: d.id,
        importId,
        pageStart: Number(data.pageStart) || 0,
        pageEnd: Number(data.pageEnd) || 0,
        status: (data.status as AlimentoImportacaoLote['status']) || 'pending',
        foodsExtracted: Number(data.foodsExtracted) || 0,
        error: typeof data.error === 'string' ? data.error : null,
        errorCode: typeof data.errorCode === 'string' ? data.errorCode : null,
        errorType: typeof data.errorType === 'string' ? data.errorType : null,
        durationMs: typeof data.durationMs === 'number' ? data.durationMs : null,
        geminiModel: typeof data.geminiModel === 'string' ? data.geminiModel : null,
        promptVersion: typeof data.promptVersion === 'string' ? data.promptVersion : null,
        schemaId: typeof data.schemaId === 'string' ? data.schemaId : null,
        extractionSource: typeof data.extractionSource === 'string' ? data.extractionSource : null,
        classification: typeof data.classification === 'string' ? data.classification : null,
        attemptCount: typeof data.attemptCount === 'number' ? data.attemptCount : 0,
        lastAttemptAt: data.lastAttemptAt ? toDateSafe(data.lastAttemptAt) : null,
        nextRetryAt: data.nextRetryAt ? toDateSafe(data.nextRetryAt) : null,
        lastErrorCode: typeof data.lastErrorCode === 'string' ? data.lastErrorCode : null,
        lastErrorMessage: typeof data.lastErrorMessage === 'string' ? data.lastErrorMessage : null,
        lastErrorType: typeof data.lastErrorType === 'string' ? data.lastErrorType : null,
        criadoEm: toDateSafe(data.criadoEm),
        atualizadoEm: toDateSafe(data.atualizadoEm),
      };
    });
  }

  static async criarImportacao(opts: {
    buffer: Buffer;
    arquivoNome: string;
    fonteNome: string;
    fonteVersao?: string | null;
    fonteAno?: number | null;
    licenca?: string | null;
    observacao?: string | null;
    tipoConteudoEsperado?: string | null;
    uid: string;
    email?: string;
  }): Promise<AlimentoImportacaoDoc> {
    const ref = this.collectionRef().doc();
    const storagePath = `alimentos_importacoes/${ref.id}/source.pdf`;
    const bucket = getAdminStorageBucket();
    const file = bucket.file(storagePath);
    await file.save(opts.buffer, {
      contentType: 'application/pdf',
      metadata: { contentType: 'application/pdf', metadata: { importId: ref.id } },
    });

    let arquivoUrl: string | null = null;
    try {
      await file.makePublic();
      arquivoUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    } catch {
      arquivoUrl = null;
    }

    const { extractPdfTextByPage } = await import('@/lib/oftpay/extractPdfTextByPage');
    const { pages, totalPages } = await extractPdfTextByPage(opts.buffer);

    await ref.set({
      arquivoNome: opts.arquivoNome,
      arquivoStoragePath: storagePath,
      arquivoUrl,
      fonteNome: opts.fonteNome.trim(),
      fonteVersao: opts.fonteVersao?.trim() || null,
      fonteAno: opts.fonteAno ?? null,
      licenca: opts.licenca?.trim() || null,
      observacao: opts.observacao?.trim() || null,
      tipoConteudoEsperado: opts.tipoConteudoEsperado?.trim() || null,
      status: 'uploaded',
      totalPaginas: totalPages,
      paginasProcessadas: 0,
      totalItensExtraidos: 0,
      totalValidos: 0,
      totalComAtencao: 0,
      totalParaRevisao: 0,
      totalDuplicados: 0,
      geminiModel: null,
      promptVersion: FOOD_PDF_PROMPT_VERSION,
      erro: null,
      // Texto por página vai para subcoleção `paginas/` — nunca no doc pai (limite 1 MiB).
      pagesTextCached: true,
      pagesTextStorage: 'subcollection',
      criadoPorUid: opts.uid,
      criadoPorEmail: opts.email || null,
      criadoEm: FieldValue.serverTimestamp(),
      atualizadoEm: FieldValue.serverTimestamp(),
    });

    await this.savePagesToSubcollection(ref.id, pages);

    const created = await this.obterImportacao(ref.id);
    if (!created) throw new Error('Falha ao ler importação criada.');
    return created;
  }

  /**
   * Persiste texto do PDF em documentos pequenos:
   * alimentos_importacoes/{id}/paginas/chunk_0000 … (N páginas por doc).
   * Remove cache legado `pagesText` do documento pai, se existir.
   */
  private static async savePagesToSubcollection(
    importId: string,
    pages: ExtractedPdfPage[]
  ): Promise<void> {
    const col = this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_PAGINAS);
    const perDoc = FOOD_IMPORT_PAGES_PER_CACHE_DOC;
    const totalChunks = Math.ceil(pages.length / perDoc) || 1;

    // Limpa chunks antigos (retry / re-extração)
    const existing = await col.get();
    if (!existing.empty) {
      let delBatch = getFirestoreAdmin().batch();
      let delOps = 0;
      for (const d of existing.docs) {
        delBatch.delete(d.ref);
        delOps += 1;
        if (delOps >= 400) {
          await delBatch.commit();
          delBatch = getFirestoreAdmin().batch();
          delOps = 0;
        }
      }
      if (delOps > 0) await delBatch.commit();
    }

    let batch = getFirestoreAdmin().batch();
    let ops = 0;
    for (let i = 0; i < totalChunks; i += 1) {
      const slice = pages.slice(i * perDoc, (i + 1) * perDoc);
      const docRef = col.doc(pagesCacheChunkId(i));
      batch.set(docRef, {
        chunkIndex: i,
        pageStart: slice[0]?.page ?? 0,
        pageEnd: slice[slice.length - 1]?.page ?? 0,
        pages: slice.map((p) => ({
          page: p.page,
          content: typeof p.content === 'string' ? p.content : '',
        })),
      });
      ops += 1;
      if (ops >= 400) {
        await batch.commit();
        batch = getFirestoreAdmin().batch();
        ops = 0;
      }
    }
    if (ops > 0) await batch.commit();

    // Garante que o doc pai não carregue o array monolítico legado
    await this.collectionRef().doc(importId).set(
      {
        [LEGACY_PAGES_CACHE_FIELD]: FieldValue.delete(),
        pagesTextCached: true,
        pagesTextStorage: 'subcollection',
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  private static async loadPagesFromSubcollection(
    importId: string
  ): Promise<ExtractedPdfPage[] | null> {
    const snap = await this.collectionRef()
      .doc(importId)
      .collection(SUBCOL_IMPORT_PAGINAS)
      .orderBy('chunkIndex', 'asc')
      .get();
    if (snap.empty) return null;
    const pages: ExtractedPdfPage[] = [];
    for (const doc of snap.docs) {
      const data = doc.data() as { pages?: unknown };
      if (!Array.isArray(data.pages)) continue;
      for (const raw of data.pages) {
        if (!raw || typeof raw !== 'object') continue;
        const r = raw as Record<string, unknown>;
        const page = typeof r.page === 'number' ? r.page : Number(r.page);
        const content = typeof r.content === 'string' ? r.content : '';
        if (Number.isFinite(page) && page > 0) {
          pages.push({ page, content });
        }
      }
    }
    pages.sort((a, b) => a.page - b.page);
    return pages.length ? pages : null;
  }

  /**
   * Carrega texto das páginas já cacheadas (subcoleção / legado).
   * Não baixa nem parseia o PDF — seguro para a Fase 1 (Mapear) sem pdfjs.
   */
  private static async loadPagesCachedOnly(importId: string): Promise<ExtractedPdfPage[]> {
    const fromSub = await this.loadPagesFromSubcollection(importId);
    if (fromSub) return fromSub;

    const snap = await this.collectionRef().doc(importId).get();
    const data = snap.data() as Record<string, unknown> | undefined;
    if (Array.isArray(data?.[LEGACY_PAGES_CACHE_FIELD])) {
      const legacy = data![LEGACY_PAGES_CACHE_FIELD] as ExtractedPdfPage[];
      await this.savePagesToSubcollection(importId, legacy);
      return legacy;
    }

    throw new Error(
      'Texto do PDF não está em cache. Reenvie o arquivo (upload) para extrair as páginas de novo.'
    );
  }

  private static async loadPages(importId: string): Promise<ExtractedPdfPage[]> {
    try {
      return await this.loadPagesCachedOnly(importId);
    } catch {
      // fallback: reextrai do Storage (pode precisar de @napi-rs/canvas no runtime)
    }

    const snap = await this.collectionRef().doc(importId).get();
    const data = snap.data() as Record<string, unknown> | undefined;
    const path = String(data?.arquivoStoragePath || '');
    if (!path) throw new Error('PDF não encontrado na importação.');
    const [buf] = await getAdminStorageBucket().file(path).download();
    const { extractPdfTextByPage } = await import('@/lib/oftpay/extractPdfTextByPage');
    const { pages } = await extractPdfTextByPage(Buffer.from(buf));
    await this.savePagesToSubcollection(importId, pages);
    return pages;
  }

  private static async loadGlobalDupPeers() {
    const snap = await getFirestoreAdmin().collection(COL_ALIMENTOS_GLOBAIS).limit(2000).get();
    return snap.docs.map((d) => {
      const data = d.data() as Record<string, unknown>;
      const nome = String(data.nome || '');
      return {
        id: d.id,
        nome,
        nomeNormalizado:
          typeof data.nomeNormalizado === 'string'
            ? data.nomeNormalizado
            : normalizeNomeAlimento(nome),
        codigoOriginal:
          data.fonte && typeof data.fonte === 'object'
            ? ((data.fonte as { codigoOriginal?: string }).codigoOriginal ?? null)
            : null,
        nomeCientifico: typeof data.nomeCientifico === 'string' ? data.nomeCientifico : null,
        marca: typeof data.marca === 'string' ? data.marca : null,
        preparo: typeof data.preparo === 'string' ? data.preparo : null,
        processamento: typeof data.processamento === 'string' ? data.processamento : null,
        codigoPreparacao:
          typeof data.codigoPreparacao === 'string' ? data.codigoPreparacao : null,
      };
    });
  }

  private static async recountTotals(importId: string) {
    const itens = await this.listarItens(importId);
    const active = itens.filter((i) => !i.ignored && i.reviewStatus !== 'IGNORE');
    const totalValidos = active.filter((i) => i.reviewStatus === 'OK').length;
    const totalComAtencao = active.filter((i) => i.reviewStatus === 'ATTENTION').length;
    const totalParaRevisao = active.filter((i) => i.reviewStatus === 'REVIEW').length;
    const totalDuplicados = active.filter((i) => i.duplicateCandidate).length;
    await this.collectionRef().doc(importId).set(
      {
        totalItensExtraidos: active.length,
        totalValidos,
        totalComAtencao,
        totalParaRevisao,
        totalDuplicados,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }


  /**
   * Fase 1 — classifica páginas em fatias (sem Gemini).
   * Retorna progresso para a barra da UI.
   */
  static async mapearPaginas(
    importId: string,
    opts?: { pageBatchSize?: number; restart?: boolean }
  ): Promise<{
    importacao: AlimentoImportacaoDoc;
    done: boolean;
    pagesMapped: number;
    totalPages: number;
    summary: ReturnType<typeof summarizeDocumentFoodMap>;
    message: string;
  }> {
    let imp = await this.obterImportacao(importId);
    if (!imp) throw new Error('Importação não encontrada.');

    const batchSize = Math.min(
      80,
      Math.max(5, Number(opts?.pageBatchSize) || FOOD_IMPORT_MAP_PAGES_PER_BATCH)
    );
    const pages = await this.loadPagesCachedOnly(importId);
    const totalPages = Math.max(imp.totalPaginas, pages.length);

    if (opts?.restart) {
      await this.collectionRef().doc(importId).set(
        {
          documentFoodMap: FieldValue.delete(),
          status: 'mapping',
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      imp = (await this.obterImportacao(importId))!;
    }

    if (isDocumentFoodMapComplete(imp.documentFoodMap, totalPages)) {
      const map = imp.documentFoodMap!;
      const summary = summarizeDocumentFoodMap(map);
      if (imp.status === 'mapping' || imp.status === 'uploaded') {
        await this.collectionRef().doc(importId).set(
          {
            status: 'mapped',
            documentFoodMap: { ...map, complete: true, pagesMapped: totalPages },
            atualizadoEm: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        imp = (await this.obterImportacao(importId))!;
      }
      return {
        importacao: imp,
        done: true,
        pagesMapped: totalPages,
        totalPages,
        summary: summarizeDocumentFoodMap(imp.documentFoodMap),
        message: `Mapa pronto: ${summary.tablePages} pág. com tabela · ${summary.narrativePages} narrativa.`,
      };
    }

    const already =
      typeof imp.documentFoodMap?.pagesMapped === 'number'
        ? imp.documentFoodMap.pagesMapped
        : 0;
    const throughPage = Math.min(already + batchSize, totalPages);
    const map = buildDocumentFoodMapThrough(pages, throughPage, totalPages);
    const summary = summarizeDocumentFoodMap(map);
    const done = Boolean(map.complete);

    await this.collectionRef().doc(importId).set(
      {
        documentFoodMap: map,
        status: done ? 'mapped' : 'mapping',
        erro: null,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated = await this.obterImportacao(importId);
    return {
      importacao: updated!,
      done,
      pagesMapped: map.pagesMapped || throughPage,
      totalPages,
      summary,
      message: done
        ? `Mapeamento concluído: ${summary.tablePages} pág. com tabela · ${summary.narrativePages} narrativa · ${summary.tableRanges} faixa(s).`
        : `Mapeando páginas ${map.pagesMapped}/${totalPages}…`,
    };
  }

  private static async loadSchema(importId: string, schemaId: string): Promise<FoodTableSchema | null> {
    const snap = await this.collectionRef()
      .doc(importId)
      .collection(SUBCOL_IMPORT_SCHEMAS)
      .doc(schemaId)
      .get();
    if (!snap.exists) return null;
    return parseFoodTableSchema(snap.data(), schemaId);
  }

  private static async saveSchema(importId: string, schema: FoodTableSchema) {
    await this.collectionRef()
      .doc(importId)
      .collection(SUBCOL_IMPORT_SCHEMAS)
      .doc(schema.id)
      .set({
        ...schema,
        criadoEm: FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      });
  }

  /** Cache de PNG por página — Storage + metadados em subcoleção. */
  private static async getOrRenderPageImage(
    importId: string,
    pageNumber: number
  ): Promise<Buffer | null> {
    const imgRef = this.collectionRef()
      .doc(importId)
      .collection(SUBCOL_IMPORT_PAGE_IMAGES)
      .doc(`p${pageNumber}`);
    const snap = await imgRef.get();
    const storagePath =
      snap.exists && typeof snap.data()?.storagePath === 'string'
        ? String(snap.data()!.storagePath)
        : `alimentos_importacoes/${importId}/pages/p${pageNumber}.png`;

    try {
      const [buf] = await getAdminStorageBucket().file(storagePath).download();
      if (buf?.length) return Buffer.from(buf);
    } catch {
      // render
    }

    const imp = await this.obterImportacao(importId);
    if (!imp?.arquivoStoragePath) return null;
    try {
      const [pdfBuf] = await getAdminStorageBucket().file(imp.arquivoStoragePath).download();
      const { renderPdfPageToPng } = await import(
        '@/lib/metaadmingeral/alimentosGlobais/importacao/renderPdfPage.server'
      );
      const rendered = await renderPdfPageToPng(Buffer.from(pdfBuf), pageNumber);
      await getAdminStorageBucket().file(storagePath).save(rendered.pngBuffer, {
        contentType: 'image/png',
        metadata: { metadata: { importId, pageNumber: String(pageNumber) } },
      });
      await imgRef.set(
        {
          pageNumber,
          storagePath,
          width: rendered.width,
          height: rendered.height,
          scale: rendered.scale,
          mimeType: 'image/png',
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      return rendered.pngBuffer;
    } catch (e) {
      console.warn('[getOrRenderPageImage]', importId, pageNumber, e);
      return null;
    }
  }

  /** Inspecionar página (MetaAdmin) — texto + classificação + imagem base64. */
  static async inspecionarPagina(importId: string, pageNumber: number) {
    const imp = await this.obterImportacao(importId);
    if (!imp) throw new Error('Importação não encontrada.');
    const pages = await this.loadPagesCachedOnly(importId);
    const page = pages.find((p) => p.page === pageNumber);
    if (!page) throw new Error(`Página ${pageNumber} não encontrada no cache.`);
    const { classifyPdfPage } = await import(
      '@/lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage'
    );
    const classified = classifyPdfPage(page);
    let imageBase64: string | null = null;
    try {
      const png = await this.getOrRenderPageImage(importId, pageNumber);
      if (png) imageBase64 = png.toString('base64');
    } catch {
      imageBase64 = null;
    }
    const lotes = await this.listarLotes(importId);
    const lote = lotes.find((l) => pageNumber >= l.pageStart && pageNumber <= l.pageEnd);
    const schema = imp.activeTableSchemaId
      ? await this.loadSchema(importId, imp.activeTableSchemaId)
      : null;
    return {
      importId,
      pageNumber,
      classification: classified.classification,
      textQuality: classified.textQuality,
      textChars: (page.content || '').length,
      textPreview: (page.content || '').slice(0, 2000),
      schemaId: lote?.schemaId || imp.activeTableSchemaId || null,
      schema,
      foodsExtractedInLote: lote?.foodsExtracted ?? null,
      loteStatus: lote?.status ?? null,
      imageBase64,
      imageMimeType: imageBase64 ? 'image/png' : null,
    };
  }

  private static async bumpObservability(
    importId: string,
    current: ImportObservability | null | undefined,
    delta: Partial<ImportObservability>
  ) {
    const next = mergeObservability(current, delta);
    await this.collectionRef().doc(importId).set(
      { observability: next, atualizadoEm: FieldValue.serverTimestamp() },
      { merge: true }
    );
    return next;
  }

  /**
   * Processa o próximo lote (ou retry vencido).
   * Idempotente para done / done_no_food_table.
   */
  static async processarProximoLote(importId: string): Promise<{
    importacao: AlimentoImportacaoDoc;
    lote: AlimentoImportacaoLote | null;
    done: boolean;
    message: string;
  }> {
    let imp = await this.obterImportacao(importId);
    if (!imp) throw new Error('Importação não encontrada.');

    const pages = await this.loadPages(importId);
    const totalPages = Math.max(imp.totalPaginas, pages.length);
    if (!isDocumentFoodMapComplete(imp.documentFoodMap, totalPages)) {
      throw new Error(
        'Mapeie o documento antes de ler as tabelas (Fase 1 incompleta).'
      );
    }
    const map = imp.documentFoodMap!;
    if (imp.status === 'mapped' || imp.status === 'uploaded') {
      await this.collectionRef().doc(importId).set(
        { status: 'processing', atualizadoEm: FieldValue.serverTimestamp() },
        { merge: true }
      );
      imp = (await this.obterImportacao(importId))!;
    }

    // Retries persistentes vencidos têm prioridade
    const lotes = await this.listarLotes(importId);
    const now = Date.now();
    const waiting = lotes
      .filter((l) => l.status === 'waiting_retry')
      .sort((a, b) => (a.nextRetryAt?.getTime() || 0) - (b.nextRetryAt?.getTime() || 0));
    const due = waiting.find((l) => !l.nextRetryAt || l.nextRetryAt.getTime() <= now);
    if (waiting.length && !due) {
      const nextAt = waiting[0].nextRetryAt;
      return {
        importacao: imp,
        lote: waiting[0],
        done: false,
        message: `Aguardando Gemini (retry em ${nextAt ? nextAt.toISOString() : 'breve'}).`,
      };
    }

    let pageStart: number;
    let pageEnd: number;
    let loteId: string;
    let chunk: ExtractedPdfPage[];
    let classification: string;

    if (due) {
      pageStart = due.pageStart;
      pageEnd = due.pageEnd;
      loteId = due.id;
      chunk = pages.filter((p) => p.page >= pageStart && p.page <= pageEnd);
      classification = due.classification || classificationForPage(map, pageStart);
    } else {
      const selected = selectNextMappedChunk(pages, imp.paginasProcessadas, map);
      chunk = selected.chunk;
      classification = selected.classification;
      if (chunk.length === 0) {
        await this.collectionRef().doc(importId).set(
          {
            status: 'review',
            paginasProcessadas: imp.totalPaginas,
            atualizadoEm: FieldValue.serverTimestamp(),
            erro: null,
          },
          { merge: true }
        );
        await this.recountTotals(importId);
        const updated = await this.obterImportacao(importId);
        return {
          importacao: updated!,
          lote: null,
          done: true,
          message: 'Todos os lotes já foram processados.',
        };
      }
      pageStart = chunk[0].page;
      pageEnd = chunk[chunk.length - 1].page;
      loteId = `p${pageStart}_${pageEnd}`;
    }

    const loteRef = this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_LOTES).doc(loteId);
    const loteSnap = await loteRef.get();
    const prevStatus = loteSnap.exists ? String(loteSnap.data()?.status || '') : '';
    if (
      loteSnap.exists &&
      (prevStatus === 'done' || prevStatus === 'done_no_food_table') &&
      !due
    ) {
      await this.collectionRef().doc(importId).set(
        {
          paginasProcessadas: Math.max(imp.paginasProcessadas, pageEnd),
          status: isImportProcessingComplete(pageEnd, imp.totalPaginas) ? 'review' : 'processing',
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      const updated = await this.obterImportacao(importId);
      return {
        importacao: updated!,
        lote: null,
        done: isImportProcessingComplete(pageEnd, imp.totalPaginas),
        message: `Lote ${loteId} já processado (idempotente).`,
      };
    }

    const attemptCount = due ? (due.attemptCount || 0) + 1 : 1;

    await this.collectionRef().doc(importId).set(
      { status: 'processing', erro: null, atualizadoEm: FieldValue.serverTimestamp() },
      { merge: true }
    );
    await loteRef.set(
      {
        importId,
        pageStart,
        pageEnd,
        status: 'processing',
        foodsExtracted: 0,
        error: null,
        errorCode: null,
        classification,
        attemptCount,
        lastAttemptAt: FieldValue.serverTimestamp(),
        promptVersion: FOOD_PDF_PROMPT_VERSION,
        criadoEm: loteSnap.exists ? loteSnap.data()?.criadoEm : FieldValue.serverTimestamp(),
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    try {
      // Narrativa / referência: sem Gemini
      if (!shouldExtractFoods(classification as import('@/lib/metaadmingeral/alimentosGlobais/importacao/tableSchema').PageClassification)) {
        await loteRef.set(
          {
            status: 'done_no_food_table',
            foodsExtracted: 0,
            errorCode: 'NO_FOOD_TABLE',
            extractionSource: 'skipped_narrative',
            error: null,
            atualizadoEm: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await this.bumpObservability(importId, imp.observability, {
          pagesSkippedNarrative: chunk.length,
        });
        const complete = isImportProcessingComplete(pageEnd, imp.totalPaginas);
        await this.collectionRef().doc(importId).set(
          {
            paginasProcessadas: pageEnd,
            status: complete ? 'review' : 'processing',
            atualizadoEm: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        const updated = await this.obterImportacao(importId);
        return {
          importacao: updated!,
          lote: (await this.listarLotes(importId)).find((l) => l.id === loteId) || null,
          done: complete,
          message: `Lote ${loteId}: páginas sem tabela (${classification}).`,
        };
      }

      let activeSchema: FoodTableSchema | null = null;
      if (imp.activeTableSchemaId) {
        activeSchema = await this.loadSchema(importId, imp.activeTableSchemaId);
      }

      // Continuação: reutiliza schema; novo Quadro/Tabela → rediscovery
      const pageText = chunk[0]?.content || '';
      const quadroMatch = /quadro\s*(\d+)/i.exec(pageText);
      const tabelaMatch = /tabela\s*(\d+)/i.exec(pageText);
      const marker = quadroMatch?.[0] || tabelaMatch?.[0] || '';
      const activeLabel = `${activeSchema?.tableNumber || ''} ${activeSchema?.tableTitle || ''}`;
      const isNewTableHeader =
        Boolean(marker) &&
        Boolean(activeSchema) &&
        !activeLabel.toLowerCase().includes(marker.toLowerCase()) &&
        !(activeSchema?.tableTitle || '').toLowerCase().includes(
          (quadroMatch?.[1] || tabelaMatch?.[1] || '').toLowerCase()
        );
      const schemaForChunk =
        classification === 'TABLE_CONTINUATION' || (activeSchema && !isNewTableHeader)
          ? activeSchema
          : null;

      const result = await extractFoodsForChunk({
        chunk,
        classification,
        fonteNome: imp.fonteNome,
        schema: schemaForChunk,
        ensureSchema: async (sample, imagePng) => {
          if (activeSchema && classification === 'TABLE_CONTINUATION') {
            return activeSchema;
          }
          const sampleText = buildChunkTextForGemini(sample);
          const schemaId = `schema_${sample[0].page}_${Date.now().toString(36)}`;
          const pageImage =
            imagePng || (await this.getOrRenderPageImage(importId, sample[0].page));
          const discovered = await discoverFoodTableSchema({
            chunkText: sampleText,
            pageStart: sample[0].page,
            pageEnd: sample[sample.length - 1].page,
            fonteNome: imp.fonteNome,
            schemaId,
            pageImagePng: pageImage,
            textQuality: (
              await import('@/lib/metaadmingeral/alimentosGlobais/importacao/classifyPdfPage')
            ).assessTextExtractionQuality(sample[0].content || ''),
          });
          if (!discovered.schema) return null;
          if (discovered.isContinuation && activeSchema) return activeSchema;
          await this.saveSchema(importId, discovered.schema);
          await this.collectionRef().doc(importId).set(
            {
              activeTableSchemaId: discovered.schema.id,
              atualizadoEm: FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
          activeSchema = discovered.schema;
          return discovered.schema;
        },
        resolvePageImage: async (pageNumber) =>
          this.getOrRenderPageImage(importId, pageNumber),
      });

      await this.bumpObservability(importId, imp.observability, {
        geminiCalls: result.geminiCalls,
        pagesSentToGemini: result.pagesSentToGemini,
        inputTokens: result.inputTokens,
        outputTokens: result.outputTokens,
      });

      const foods = result.foods;
      const existingItens = await this.listarItens(importId);
      const globalPeers = await this.loadGlobalDupPeers();
      let saved = 0;

      for (let i = 0; i < foods.length; i++) {
        const raw = foods[i];
        const schemaPart = result.schema?.id || 'noschema';
        const itemId = `${importId}_${schemaPart}_p${pageStart}_r${i}`;
        const normalized = normalizeExtractionItem({
          raw: raw || {},
          importId,
          loteId,
          itemId,
          documentPage: pageStart,
          documentTable: result.schema?.tableTitle || result.schema?.tableNumber || null,
          documentBaseQty: result.schema?.base?.quantity ?? null,
          documentBaseUnit: result.schema?.base?.unit ?? null,
        });
        // Sem código da fonte: identidade temporária (não inventar codigoOriginal)
        if (!normalized.codigoOriginal) {
          normalized.fonteIdentidade = `${importId}:${schemaPart}:p${pageStart}:r${i}`;
        }
        const matches = findDuplicateMatches({
          item: normalized,
          importPeers: existingItens.map((x) => ({
            id: x.id,
            nome: x.nome,
            nomeNormalizado: x.nomeNormalizado,
            codigoOriginal: x.codigoOriginal,
            codigoPreparacao: x.codigoPreparacao,
            nomeCientifico: x.nomeCientifico,
            marca: x.marca,
            preparo: x.preparo,
            processamento: x.processamento,
          })),
          globalPeers,
        });
        const draft = applyValidationAndDuplicates(normalized, matches);
        if (!foodDraftHasNutrientData(draft as ImportedFoodDraft & Record<string, unknown>)) {
          continue;
        }
        if (result.flags.includes('POSSIBLE_PARTIAL_EXTRACTION')) {
          draft.qualityFlags = [...(draft.qualityFlags || []), 'POSSIBLE_PARTIAL_EXTRACTION'];
          if (draft.reviewStatus === 'OK') draft.reviewStatus = 'ATTENTION';
        }
        if (!result.schema?.base?.unit || result.schema.base.unit === 'unknown') {
          draft.qualityFlags = [...(draft.qualityFlags || []), 'BASE_UNKNOWN'];
          if (draft.reviewStatus === 'OK') draft.reviewStatus = 'REVIEW';
        }
        existingItens.push(draft);
        await this.collectionRef()
          .doc(importId)
          .collection(SUBCOL_IMPORT_ITENS)
          .doc(itemId)
          .set({
            ...draftToFirestore(draft),
            criadoEm: FieldValue.serverTimestamp(),
          });
        saved += 1;
      }

      let loteStatus: StatusLoteImport = 'done';
      let loteError: string | null = null;
      let errorCode: string | null = null;
      if (saved === 0 && result.errorCode === 'TABLE_DETECTED_ZERO_ITEMS') {
        loteStatus = 'failed_extraction';
        errorCode = 'TABLE_DETECTED_ZERO_ITEMS';
        loteError =
          'Tabela detectada, mas nenhum alimento foi extraído (REVIEW_REQUIRED).';
      }

      await loteRef.set(
        {
          status: loteStatus,
          foodsExtracted: saved,
          durationMs: result.durationMs,
          geminiModel: result.model,
          promptVersion: result.promptVersion,
          extractionSource: result.extractionSource,
          extractionMode: result.extractionMode,
          schemaId: result.schema?.id || null,
          classification,
          pageMetrics: result.pageMetrics,
          flags: result.flags,
          error: loteError,
          errorCode,
          nextRetryAt: null,
          lastErrorCode: errorCode,
          lastErrorMessage: loteError,
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const complete = isImportProcessingComplete(pageEnd, imp.totalPaginas);
      await this.collectionRef().doc(importId).set(
        {
          paginasProcessadas: pageEnd,
          status: complete
            ? loteStatus === 'failed_extraction'
              ? 'partially_completed'
              : 'review'
            : 'processing',
          geminiModel: result.model,
          promptVersion: result.promptVersion,
          ...(loteError ? { erro: loteError } : { erro: null }),
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      // Atualiza "Encontrados" a cada lote (não só no fim)
      await this.recountTotals(importId);

      const updated = await this.obterImportacao(importId);
      return {
        importacao: updated!,
        lote: (await this.listarLotes(importId)).find((l) => l.id === loteId) || null,
        done: complete,
        message:
          loteStatus === 'failed_extraction'
            ? `Lote ${loteId}: REVIEW_REQUIRED (0 alimentos).`
            : `Lote ${loteId}: ${saved} alimento(s) via ${result.extractionSource}${
                result.flags.includes('POSSIBLE_PARTIAL_EXTRACTION')
                  ? ' · POSSIBLE_PARTIAL_EXTRACTION'
                  : ''
              }.`,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha no lote';
      const isTransient =
        error instanceof GeminiImportError
          ? error.transient
          : /RESOURCE_EXHAUSTED|429|503|UNAVAILABLE|timeout/i.test(message);
      const errorCode =
        error instanceof GeminiImportError ? error.code : isTransient ? 'GEMINI_UNAVAILABLE' : 'PARSER_ERROR';

      if (isTransient) {
        const delay = computeNextRetryDelayMs(attemptCount);
        const nextRetryAt = new Date(Date.now() + delay);
        const statusLote: StatusLoteImport =
          attemptCount >= 5 ? 'failed_transient' : 'waiting_retry';
        await loteRef.set(
          {
            status: statusLote,
            error: message,
            errorCode,
            lastErrorCode: errorCode,
            lastErrorMessage: message,
            lastErrorType: 'TRANSIENT',
            attemptCount,
            nextRetryAt: statusLote === 'waiting_retry' ? nextRetryAt : null,
            atualizadoEm: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        await this.bumpObservability(importId, imp.observability, {
          rateLimitHits: errorCode === 'GEMINI_RATE_LIMITED' ? 1 : 0,
          retryCalls: 1,
        });
        await this.collectionRef().doc(importId).set(
          {
            status: statusLote === 'failed_transient' ? 'partially_completed' : 'processing',
            erro: message,
            atualizadoEm: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
        const updated = await this.obterImportacao(importId);
        return {
          importacao: updated!,
          lote: (await this.listarLotes(importId)).find((l) => l.id === loteId) || null,
          done: false,
          message:
            statusLote === 'waiting_retry'
              ? `Limite temporário do Gemini. Nova tentativa após ${nextRetryAt.toISOString()}.`
              : `Lote ${loteId}: falha temporária esgotada (${errorCode}).`,
        };
      }

      await loteRef.set(
        {
          status: 'failed',
          error: message,
          errorCode,
          lastErrorCode: errorCode,
          lastErrorMessage: message,
          lastErrorType: 'PERMANENT',
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      await this.collectionRef().doc(importId).set(
        {
          status: 'failed',
          erro: message,
          atualizadoEm: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
      throw error;
    }
  }

  static async retryLote(importId: string, loteId: string) {
    const loteRef = this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_LOTES).doc(loteId);
    const loteSnap = await loteRef.get();
    if (!loteSnap.exists) throw new Error('Lote não encontrado.');
    const data = loteSnap.data() as Record<string, unknown>;
    const pageStart = Number(data.pageStart) || 0;
    // Volta o ponteiro para pageStart-1 para reprocessar
    await this.collectionRef().doc(importId).set(
      {
        paginasProcessadas: Math.max(0, pageStart - 1),
        status: 'processing',
        erro: null,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await loteRef.set(
      { status: 'pending', error: null, atualizadoEm: FieldValue.serverTimestamp() },
      { merge: true }
    );

    // Remove itens do lote anterior (evita duplicar na reexecução)
    const itens = await this.listarItens(importId);
    const batch = getFirestoreAdmin().batch();
    let ops = 0;
    for (const item of itens) {
      if (item.loteId === loteId) {
        batch.delete(
          this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_ITENS).doc(item.id)
        );
        ops += 1;
        if (ops >= 400) break;
      }
    }
    if (ops > 0) await batch.commit();

    return this.processarProximoLote(importId);
  }

  /**
   * Zera ponteiro + lotes + itens + mapa + schemas e deixa pronto para Fase 1 (Mapear).
   */
  static async resetarParaReprocessamento(importId: string): Promise<AlimentoImportacaoDoc> {
    const imp = await this.obterImportacao(importId);
    if (!imp) throw new Error('Importação não encontrada.');

    const deleteCollection = async (sub: string) => {
      const snap = await this.collectionRef().doc(importId).collection(sub).get();
      let batch = getFirestoreAdmin().batch();
      let ops = 0;
      for (const d of snap.docs) {
        batch.delete(d.ref);
        ops += 1;
        if (ops >= 400) {
          await batch.commit();
          batch = getFirestoreAdmin().batch();
          ops = 0;
        }
      }
      if (ops > 0) await batch.commit();
    };

    await deleteCollection(SUBCOL_IMPORT_ITENS);
    await deleteCollection(SUBCOL_IMPORT_LOTES);
    await deleteCollection(SUBCOL_IMPORT_SCHEMAS);

    await this.collectionRef().doc(importId).set(
      {
        paginasProcessadas: 0,
        status: 'uploaded',
        totalItensExtraidos: 0,
        totalValidos: 0,
        totalComAtencao: 0,
        totalParaRevisao: 0,
        totalDuplicados: 0,
        documentFoodMap: FieldValue.delete(),
        activeTableSchemaId: FieldValue.delete(),
        observability: emptyObservability(),
        publicationSummary: FieldValue.delete(),
        erro: null,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const updated = await this.obterImportacao(importId);
    if (!updated) throw new Error('Falha ao ler importação após reset.');
    return updated;
  }

  static async atualizarItem(
    importId: string,
    itemId: string,
    patch: Partial<ImportedFoodDraft>
  ): Promise<ImportedFoodDraft> {
    const ref = this.collectionRef().doc(importId).collection(SUBCOL_IMPORT_ITENS).doc(itemId);
    const snap = await ref.get();
    if (!snap.exists) throw new Error('Item não encontrado.');
    const current = {
      ...(snap.data() as unknown as ImportedFoodDraft),
      id: itemId,
    };
    const merged = {
      ...current,
      ...patch,
      id: itemId,
      importId,
      nomeNormalizado: patch.nome
        ? normalizeNomeAlimento(patch.nome)
        : current.nomeNormalizado,
    };
    const validated = applyValidationAndDuplicates(merged, merged.duplicateMatches || []);
    await ref.set(
      {
        ...validated,
        atualizadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    await this.recountTotals(importId);
    return validated;
  }

  static toJsonImport(doc: AlimentoImportacaoDoc) {
    const mapSummary = summarizeDocumentFoodMap(doc.documentFoodMap);
    return {
      ...doc,
      mapSummary,
      criadoEm: doc.criadoEm.toISOString(),
      atualizadoEm: doc.atualizadoEm.toISOString(),
      publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : null,
    };
  }

  static toJsonItem(item: ImportedFoodDraft) {
    const publicationReadiness =
      item.publicationReadiness ?? computePublicationReadiness(item);
    return {
      ...item,
      publicationReadiness,
      criadoEm: item.criadoEm instanceof Date ? item.criadoEm.toISOString() : item.criadoEm,
      atualizadoEm:
        item.atualizadoEm instanceof Date ? item.atualizadoEm.toISOString() : item.atualizadoEm,
      publishedAt:
        item.publishedAt instanceof Date
          ? item.publishedAt.toISOString()
          : item.publishedAt ?? null,
    };
  }
}

/**
 * Publicação de ImportedFoodDraft → alimentos_globais (CREATE / MERGE / SKIP).
 * Isolado do MetaNutri. Auth via rotas com requireMetaAdminGeral.
 */

import { FieldValue } from 'firebase-admin/firestore';
import { appendFonteHistorico } from '@/lib/metaadmingeral/alimentosGlobais/fontes';
import {
  COL_ALIMENTOS_IMPORTACOES,
  SUBCOL_IMPORT_ITENS,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import { mapImportedDraftToGlobalFood, buildFonteFromImport } from '@/lib/metaadmingeral/alimentosGlobais/importacao/mapImportedDraftToGlobalFood';
import {
  applyMergeResolutions,
  buildMergeSuggestions,
  hasUnresolvedConflicts,
  suggestionsToConflicts,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/mergeFoodFields';
import {
  computePublicationReadiness,
  isSafeForBatchCreate,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationReadiness';
import { buildImportPublicationSummary } from '@/lib/metaadmingeral/alimentosGlobais/importacao/publicationSummary';
import type {
  AlimentoImportacaoDoc,
  ImportPublicationSummary,
  ImportedFoodDraft,
  MergeConflict,
} from '@/lib/metaadmingeral/alimentosGlobais/importacao/types';
import type { MergeResolution, PublicationAction } from '@/lib/metaadmingeral/alimentosGlobais/importacao/constants';
import type { AlimentoGlobal, StatusAlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais';
import { getFirestoreAdmin } from '@/lib/server/firebaseAdminOftware';
import { GlobalFoodsImportService } from '@/services/globalFoodsImportService.server';
import { GlobalFoodsService } from '@/services/globalFoodsService.server';

export type PublishActor = { uid: string; email?: string | null };

export type PublishItemResult = {
  itemId: string;
  action: PublicationAction | null;
  ok: boolean;
  foodId?: string | null;
  error?: string | null;
  idempotent?: boolean;
};

function draftRef(importId: string, itemId: string) {
  return getFirestoreAdmin()
    .collection(COL_ALIMENTOS_IMPORTACOES)
    .doc(importId)
    .collection(SUBCOL_IMPORT_ITENS)
    .doc(itemId);
}

async function markDraftPublished(
  importId: string,
  item: ImportedFoodDraft,
  opts: {
    action: PublicationAction;
    foodId: string;
    actor: PublishActor;
    conflicts?: MergeConflict[] | null;
  }
): Promise<void> {
  await draftRef(importId, item.id).set(
    {
      publicationAction: opts.action,
      publicationStatus: 'published',
      publishedFoodId: opts.foodId,
      publishedAt: FieldValue.serverTimestamp(),
      publishedByUid: opts.actor.uid,
      publishedByEmail: opts.actor.email ?? null,
      mergeTargetFoodId: opts.action === 'MERGE' ? opts.foodId : item.mergeTargetFoodId ?? null,
      mergeConflictsResolved: opts.conflicts ?? null,
      publicationError: null,
      publicationReadiness: computePublicationReadiness(item),
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function markDraftSkipped(
  importId: string,
  item: ImportedFoodDraft,
  actor: PublishActor
): Promise<void> {
  await draftRef(importId, item.id).set(
    {
      publicationAction: 'SKIP',
      publicationStatus: 'skipped',
      publishedFoodId: null,
      publishedAt: FieldValue.serverTimestamp(),
      publishedByUid: actor.uid,
      publishedByEmail: actor.email ?? null,
      publicationError: null,
      publicationReadiness: 'IGNORED',
      ignored: true,
      reviewStatus: 'IGNORE',
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function markDraftFailed(
  importId: string,
  itemId: string,
  error: string
): Promise<void> {
  await draftRef(importId, itemId).set(
    {
      publicationStatus: 'failed',
      publicationError: error,
      atualizadoEm: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

export class GlobalFoodsPublicationService {
  static computeReadiness(draft: ImportedFoodDraft) {
    return computePublicationReadiness(draft);
  }

  static prepareMergePreview(existing: AlimentoGlobal, draft: ImportedFoodDraft) {
    const suggestions = buildMergeSuggestions(existing, draft);
    return {
      suggestions,
      conflicts: suggestionsToConflicts(suggestions),
      hasUnresolved: hasUnresolvedConflicts(suggestionsToConflicts(suggestions)),
    };
  }

  static async setItemAction(
    importId: string,
    itemId: string,
    action: PublicationAction,
    opts?: { mergeTargetFoodId?: string | null }
  ): Promise<ImportedFoodDraft> {
    const patch: Partial<ImportedFoodDraft> = {
      publicationAction: action,
      mergeTargetFoodId: action === 'MERGE' ? opts?.mergeTargetFoodId ?? null : null,
    };
    if (action === 'SKIP') {
      patch.ignored = true;
      patch.reviewStatus = 'IGNORE';
      patch.publicationStatus = 'pending';
      patch.publicationReadiness = 'IGNORED';
    } else {
      patch.ignored = false;
    }
    const updated = await GlobalFoodsImportService.atualizarItem(importId, itemId, patch);
    const readiness = computePublicationReadiness({
      ...updated,
      publicationAction: action,
    });
    return GlobalFoodsImportService.atualizarItem(importId, itemId, {
      publicationReadiness: readiness,
      publicationAction: action,
    });
  }

  static async publishCreate(
    importId: string,
    itemId: string,
    actor: PublishActor,
    opts?: { status?: StatusAlimentoGlobal; forceReviewAlerts?: boolean }
  ): Promise<PublishItemResult> {
    const importacao = await GlobalFoodsImportService.obterImportacao(importId);
    if (!importacao) throw new Error('Importação não encontrada.');
    const itens = await GlobalFoodsImportService.listarItens(importId);
    const item = itens.find((i) => i.id === itemId);
    if (!item) throw new Error('Item não encontrado.');

    if (item.publicationStatus === 'published' && item.publishedFoodId) {
      return {
        itemId,
        action: 'CREATE',
        ok: true,
        foodId: item.publishedFoodId,
        idempotent: true,
      };
    }

    const readiness = computePublicationReadiness({
      ...item,
      publicationAction: item.publicationAction || 'CREATE',
    });
    if (readiness === 'BLOCKED') {
      const err = 'Item BLOCKED — corrija antes de publicar.';
      await markDraftFailed(importId, itemId, err);
      return { itemId, action: 'CREATE', ok: false, error: err };
    }
    if (readiness === 'IGNORED') {
      return { itemId, action: 'SKIP', ok: false, error: 'Item marcado como ignorado.' };
    }
    if (readiness === 'NEEDS_REVIEW' && !opts?.forceReviewAlerts) {
      const err = 'Item NEEDS_REVIEW — confirme publicação com forceReviewAlerts.';
      return { itemId, action: 'CREATE', ok: false, error: err };
    }

    try {
      const payload = mapImportedDraftToGlobalFood(item, {
        importacao,
        status: opts?.status,
        publishedByConfirm: true,
      });
      const created = await GlobalFoodsService.criar(payload, { uid: actor.uid });
      await markDraftPublished(importId, item, {
        action: 'CREATE',
        foodId: created.id,
        actor,
      });
      await this.refreshImportSummary(importId, actor);
      return { itemId, action: 'CREATE', ok: true, foodId: created.id };
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Falha ao criar alimento.';
      await markDraftFailed(importId, itemId, err);
      await this.refreshImportSummary(importId, actor);
      return { itemId, action: 'CREATE', ok: false, error: err };
    }
  }

  static async publishMerge(
    importId: string,
    itemId: string,
    actor: PublishActor,
    opts: {
      targetFoodId: string;
      resolutions: Record<string, MergeResolution>;
    }
  ): Promise<PublishItemResult> {
    const importacao = await GlobalFoodsImportService.obterImportacao(importId);
    if (!importacao) throw new Error('Importação não encontrada.');
    const itens = await GlobalFoodsImportService.listarItens(importId);
    const item = itens.find((i) => i.id === itemId);
    if (!item) throw new Error('Item não encontrado.');

    if (item.publicationStatus === 'published' && item.publishedFoodId) {
      return {
        itemId,
        action: 'MERGE',
        ok: true,
        foodId: item.publishedFoodId,
        idempotent: true,
      };
    }

    const readiness = computePublicationReadiness({
      ...item,
      publicationAction: 'MERGE',
    });
    if (readiness === 'BLOCKED') {
      const err = 'Item BLOCKED — corrija antes de mesclar.';
      await markDraftFailed(importId, itemId, err);
      return { itemId, action: 'MERGE', ok: false, error: err };
    }

    const existing = await GlobalFoodsService.obterPorId(opts.targetFoodId);
    if (!existing) {
      const err = 'Alimento destino não encontrado.';
      await markDraftFailed(importId, itemId, err);
      return { itemId, action: 'MERGE', ok: false, error: err };
    }

    const suggestions = buildMergeSuggestions(existing, item);
    const conflicts = suggestionsToConflicts(suggestions, opts.resolutions);
    if (hasUnresolvedConflicts(conflicts)) {
      const err = 'Há conflitos UNRESOLVED.';
      return { itemId, action: 'MERGE', ok: false, error: err };
    }

    try {
      const fieldPatch = applyMergeResolutions(conflicts);
      const novaFonte = buildFonteFromImport(item, importacao);
      const fontes = appendFonteHistorico(existing.fontes || (existing.fonte ? [existing.fonte] : []), novaFonte);

      await GlobalFoodsService.atualizar(
        opts.targetFoodId,
        {
          ...fieldPatch,
          fonte: novaFonte,
          fontes,
          origemCadastro: existing.origemCadastro || 'pdf_import',
        },
        { uid: actor.uid }
      );

      await markDraftPublished(importId, item, {
        action: 'MERGE',
        foodId: opts.targetFoodId,
        actor,
        conflicts,
      });
      await this.refreshImportSummary(importId, actor);
      return { itemId, action: 'MERGE', ok: true, foodId: opts.targetFoodId };
    } catch (e) {
      const err = e instanceof Error ? e.message : 'Falha no merge.';
      await markDraftFailed(importId, itemId, err);
      await this.refreshImportSummary(importId, actor);
      return { itemId, action: 'MERGE', ok: false, error: err };
    }
  }

  static async publishSkip(
    importId: string,
    itemId: string,
    actor: PublishActor
  ): Promise<PublishItemResult> {
    const itens = await GlobalFoodsImportService.listarItens(importId);
    const item = itens.find((i) => i.id === itemId);
    if (!item) throw new Error('Item não encontrado.');

    if (item.publicationStatus === 'skipped' || item.publicationStatus === 'published') {
      return {
        itemId,
        action: item.publicationAction || 'SKIP',
        ok: true,
        foodId: item.publishedFoodId,
        idempotent: true,
      };
    }

    await markDraftSkipped(importId, item, actor);
    await this.refreshImportSummary(importId, actor);
    return { itemId, action: 'SKIP', ok: true };
  }

  /**
   * Lote seguro: apenas CREATE + READY + sem duplicidade + selecionados.
   */
  static async publishBatchCreate(
    importId: string,
    itemIds: string[],
    actor: PublishActor,
    opts?: { forceReviewAlerts?: boolean }
  ): Promise<{ results: PublishItemResult[]; summary: ImportPublicationSummary }> {
    const itens = await GlobalFoodsImportService.listarItens(importId);
    const byId = new Map(itens.map((i) => [i.id, i]));
    const results: PublishItemResult[] = [];

    for (const id of itemIds) {
      const item = byId.get(id);
      if (!item) {
        results.push({ itemId: id, action: null, ok: false, error: 'Item não encontrado.' });
        continue;
      }
      const withAction: ImportedFoodDraft = {
        ...item,
        publicationAction: item.publicationAction || 'CREATE',
        publicationReadiness: computePublicationReadiness({
          ...item,
          publicationAction: item.publicationAction || 'CREATE',
        }),
      };
      if (!isSafeForBatchCreate(withAction) && !opts?.forceReviewAlerts) {
        results.push({
          itemId: id,
          action: 'CREATE',
          ok: false,
          error: 'Item não é seguro para lote (READY+CREATE sem duplicidade).',
        });
        continue;
      }
      if (withAction.publicationAction === 'SKIP') {
        results.push(await this.publishSkip(importId, id, actor));
        continue;
      }
      results.push(
        await this.publishCreate(importId, id, actor, {
          forceReviewAlerts: opts?.forceReviewAlerts,
        })
      );
    }

    const summary = await this.refreshImportSummary(importId, actor);
    return { results, summary };
  }

  static buildSummary(itens: ImportedFoodDraft[]): ImportPublicationSummary {
    return buildImportPublicationSummary(itens);
  }

  static async refreshImportSummary(
    importId: string,
    actor?: PublishActor
  ): Promise<ImportPublicationSummary> {
    const itens = await GlobalFoodsImportService.listarItens(importId);
    const summary = this.buildSummary(itens);
    const pending = summary.comRevisaoPendente > 0 || summary.falharam > 0;
    const anyPublished =
      summary.criados > 0 || summary.mesclados > 0 || summary.ignorados > 0;

    let status: AlimentoImportacaoDoc['status'] = 'review';
    if (anyPublished && !pending) status = 'completed';
    else if (anyPublished && pending) status = 'partially_completed';

    const patch: Record<string, unknown> = {
      publicationSummary: summary,
      status,
      atualizadoEm: FieldValue.serverTimestamp(),
    };
    if (actor) {
      patch.publishedByUid = actor.uid;
      patch.publishedAt = FieldValue.serverTimestamp();
    }

    await getFirestoreAdmin()
      .collection(COL_ALIMENTOS_IMPORTACOES)
      .doc(importId)
      .set(patch, { merge: true });

    return summary;
  }
}

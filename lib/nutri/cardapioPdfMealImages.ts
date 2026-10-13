/**
 * Hidrata signed URLs das fotos do prato no contexto de impressão do cardápio.
 * Só lê. Não gera imagem.
 */

import type { CardapioPdfContext, CardapioPdfMealImageRef, CardapioPdfOpcao } from '@/types/cardapioPrint';
import { fetchMealDishImageUrl } from '@/lib/nutri/mealImageUrlClient';
import { opcoesDaRefeicaoPdf } from '@/utils/cardapioPdfLayout';

export function cardapioPdfMealImageKey(ref: CardapioPdfMealImageRef): string {
  return `${ref.patientId}:${ref.refeicaoKey}:${ref.slotId}:${ref.sourceHash}`;
}

export function coletarMealImageRefsDoCardapio(ctx: CardapioPdfContext): CardapioPdfMealImageRef[] {
  const seen = new Set<string>();
  const refs: CardapioPdfMealImageRef[] = [];
  for (const refeicao of ctx.refeicoes || []) {
    for (const opcao of opcoesDaRefeicaoPdf(refeicao)) {
      const ref = opcao.mealImageRef;
      if (!ref?.patientId || !ref.refeicaoKey || !ref.slotId) continue;
      const key = cardapioPdfMealImageKey(ref);
      if (seen.has(key)) continue;
      seen.add(key);
      refs.push(ref);
    }
  }
  return refs;
}

function withImageUrl(opcao: CardapioPdfOpcao, urls: Map<string, string>): CardapioPdfOpcao {
  if (opcao.imageUrl) return opcao;
  const ref = opcao.mealImageRef;
  if (!ref) return opcao;
  const url = urls.get(cardapioPdfMealImageKey(ref));
  if (!url) return opcao;
  return { ...opcao, imageUrl: url };
}

export async function hydrateCardapioPdfMealImages(
  ctx: CardapioPdfContext,
  getToken: () => Promise<string | null>
): Promise<CardapioPdfContext> {
  const refs = coletarMealImageRefsDoCardapio(ctx);
  if (refs.length === 0) return ctx;

  const urls = new Map<string, string>();
  await Promise.all(
    refs.map(async (ref) => {
      const url = await fetchMealDishImageUrl(
        {
          patientId: ref.patientId,
          refeicaoKey: ref.refeicaoKey,
          slotId: ref.slotId,
          sourceHash: ref.sourceHash,
          gcsPath: ref.gcsPath,
          generatedAt: ref.generatedAt,
        },
        { getToken }
      );
      if (url) urls.set(cardapioPdfMealImageKey(ref), url);
    })
  );

  if (urls.size === 0) return ctx;

  return {
    ...ctx,
    refeicoes: ctx.refeicoes.map((refeicao) => {
      const opcoes = (refeicao.opcoes?.length ? refeicao.opcoes : undefined)?.map((opcao) =>
        withImageUrl(opcao, urls)
      );
      return opcoes ? { ...refeicao, opcoes } : refeicao;
    }),
  };
}

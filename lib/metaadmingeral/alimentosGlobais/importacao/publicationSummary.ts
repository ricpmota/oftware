import type { ImportPublicationSummary, ImportedFoodDraft } from './types';
import { computePublicationReadiness } from './publicationReadiness';

export function buildImportPublicationSummary(
  itens: ImportedFoodDraft[]
): ImportPublicationSummary {
  let criados = 0;
  let mesclados = 0;
  let ignorados = 0;
  let falharam = 0;
  let comRevisaoPendente = 0;

  for (const i of itens) {
    if (i.publicationStatus === 'published' && i.publicationAction === 'CREATE') criados += 1;
    else if (i.publicationStatus === 'published' && i.publicationAction === 'MERGE') mesclados += 1;
    else if (i.publicationStatus === 'skipped' || i.publicationAction === 'SKIP' || i.ignored) {
      ignorados += 1;
    } else if (i.publicationStatus === 'failed') falharam += 1;
    else {
      const r = computePublicationReadiness(i);
      if (r === 'NEEDS_REVIEW' || r === 'BLOCKED' || r === 'READY') comRevisaoPendente += 1;
    }
  }

  return {
    extraidos: itens.length,
    criados,
    mesclados,
    ignorados,
    comRevisaoPendente,
    falharam,
  };
}

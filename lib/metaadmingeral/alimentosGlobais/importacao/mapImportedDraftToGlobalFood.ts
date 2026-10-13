import {
  ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT,
  ALIMENTO_GLOBAL_BASE_UNIDADE,
} from '../constants';
import type { AlimentoGlobalCreateInput, FonteAlimentoGlobal, StatusAlimentoGlobal } from '../types';
import type { AlimentoImportacaoDoc, ImportedFoodDraft } from './types';
import { isSegmentoAlimento } from '../segmentos';

export type MapDraftOptions = {
  importacao: AlimentoImportacaoDoc;
  status?: StatusAlimentoGlobal;
  publishedByConfirm?: boolean;
};

export function buildFonteFromImport(
  draft: ImportedFoodDraft,
  importacao: AlimentoImportacaoDoc
): FonteAlimentoGlobal {
  return {
    nome: importacao.fonteNome,
    documento: importacao.arquivoNome,
    versao: importacao.fonteVersao ?? null,
    ano: importacao.fonteAno ?? null,
    codigoOriginal: draft.codigoOriginal ?? null,
    pagina: draft.sourcePage ?? null,
    tabela: draft.sourceTable ?? null,
    licenca: importacao.licenca ?? null,
    usoPermitido: null,
    importId: importacao.id,
    itemImportId: draft.id,
    modeloGemini: importacao.geminiModel ?? null,
    promptVersion: importacao.promptVersion ?? null,
    valoresOriginais: draft.valoresOriginais || null,
    registradoEm: new Date().toISOString(),
  };
}

/**
 * ImportedFoodDraft → payload de criação AlimentoGlobal.
 * Não grava Firestore — só mapeia.
 */
export function mapImportedDraftToGlobalFood(
  draft: ImportedFoodDraft,
  opts: MapDraftOptions
): AlimentoGlobalCreateInput {
  const segmento = draft.segmento || draft.segmentoSugerido;
  if (!segmento || !isSegmentoAlimento(segmento)) {
    throw new Error('Segmento obrigatório para publicar.');
  }
  if (!draft.nome?.trim() || draft.nome === 'Sem nome') {
    throw new Error('Nome obrigatório para publicar.');
  }

  const fonte = buildFonteFromImport(draft, opts.importacao);
  const status: StatusAlimentoGlobal =
    opts.status ??
    (draft.reviewStatus === 'OK' && opts.publishedByConfirm !== false ? 'published' : 'review');

  return {
    nome: draft.nome.trim(),
    descricao: draft.descricao ?? null,
    nomeCientifico: draft.nomeCientifico ?? null,
    marca: draft.marca ?? null,
    segmento,
    estado: draft.estado ?? null,
    processamento: draft.processamento ?? null,
    preparo: draft.preparo ?? null,
    baseQuantidade: draft.baseQuantidade ?? ALIMENTO_GLOBAL_BASE_QUANTIDADE_DEFAULT,
    baseUnidade: ALIMENTO_GLOBAL_BASE_UNIDADE,
    energiaKcal: draft.energiaKcal ?? null,
    energiaKj: draft.energiaKj ?? null,
    proteinasG: draft.proteinasG ?? null,
    carboidratosG: draft.carboidratosG ?? null,
    gordurasTotaisG: draft.gordurasTotaisG ?? null,
    fibrasG: draft.fibrasG ?? null,
    glicoseG: draft.glicoseG ?? null,
    frutoseG: draft.frutoseG ?? null,
    lactoseG: draft.lactoseG ?? null,
    sacaroseG: draft.sacaroseG ?? null,
    acucaresTotaisG: draft.acucaresTotaisG ?? null,
    amidoTotalG: draft.amidoTotalG ?? null,
    amidoDisponivelG: draft.amidoDisponivelG ?? null,
    amidoResistenteG: draft.amidoResistenteG ?? null,
    gordurasSaturadasG: draft.gordurasSaturadasG ?? null,
    gordurasMonoinsaturadasG: draft.gordurasMonoinsaturadasG ?? null,
    gordurasPoliinsaturadasG: draft.gordurasPoliinsaturadasG ?? null,
    gordurasTransG: draft.gordurasTransG ?? null,
    calcioMg: draft.calcioMg ?? null,
    ferroMg: draft.ferroMg ?? null,
    magnesioMg: draft.magnesioMg ?? null,
    fosforoMg: draft.fosforoMg ?? null,
    potassioMg: draft.potassioMg ?? null,
    sodioMg: draft.sodioMg ?? null,
    zincoMg: draft.zincoMg ?? null,
    vitaminaAMcg: draft.vitaminaAMcg ?? null,
    vitaminaCMg: draft.vitaminaCMg ?? null,
    vitaminaDMcg: draft.vitaminaDMcg ?? null,
    vitaminaEMg: draft.vitaminaEMg ?? null,
    vitaminaB1Mg: draft.vitaminaB1Mg ?? null,
    vitaminaB2Mg: draft.vitaminaB2Mg ?? null,
    vitaminaB3Mg: draft.vitaminaB3Mg ?? null,
    vitaminaB6Mg: draft.vitaminaB6Mg ?? null,
    vitaminaB12Mcg: draft.vitaminaB12Mcg ?? null,
    folatoMcg: draft.folatoMcg ?? null,
    porcoes: [],
    nutrientesExtras: draft.nutrientesExtras || [],
    fonte,
    fontes: [fonte],
    origemCadastro: 'pdf_import',
    observacoes: null,
    status,
  };
}

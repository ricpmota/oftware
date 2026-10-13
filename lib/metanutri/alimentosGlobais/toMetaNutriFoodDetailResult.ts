import type { AlimentoGlobal, FonteAlimentoGlobal } from '@/lib/metaadmingeral/alimentosGlobais/types';
import type { MetaNutriFoodDetailResult, MetaNutriFoodFontePublica } from './detailTypes';
import { toMetaNutriFoodSearchResult } from './toMetaNutriFoodSearchResult';

function fontePublica(f: FonteAlimentoGlobal): MetaNutriFoodFontePublica | null {
  const out: MetaNutriFoodFontePublica = {
    nome: f.nome ?? null,
    documento: f.documento ?? null,
    versao: f.versao ?? null,
    ano: f.ano ?? null,
  };
  if (!out.nome && !out.documento && !out.versao && out.ano == null) return null;
  return out;
}

export function toMetaNutriFoodDetailResult(food: AlimentoGlobal): MetaNutriFoodDetailResult {
  const base = toMetaNutriFoodSearchResult(food);
  const fontesRaw = food.fontes?.length
    ? food.fontes
    : food.fonte
      ? [food.fonte]
      : [];
  const fontesPublicas = fontesRaw
    .map(fontePublica)
    .filter((f): f is MetaNutriFoodFontePublica => Boolean(f));

  return {
    ...base,
    descricao: food.descricao ?? null,
    nomeCientifico: food.nomeCientifico ?? null,
    estado: food.estado ?? null,
    processamento: food.processamento ?? null,
    preparo: food.preparo ?? null,
    energiaKj: food.energiaKj ?? null,
    glicoseG: food.glicoseG ?? null,
    frutoseG: food.frutoseG ?? null,
    lactoseG: food.lactoseG ?? null,
    sacaroseG: food.sacaroseG ?? null,
    acucaresTotaisG: food.acucaresTotaisG ?? null,
    amidoTotalG: food.amidoTotalG ?? null,
    amidoDisponivelG: food.amidoDisponivelG ?? null,
    amidoResistenteG: food.amidoResistenteG ?? null,
    gordurasSaturadasG: food.gordurasSaturadasG ?? null,
    gordurasMonoinsaturadasG: food.gordurasMonoinsaturadasG ?? null,
    gordurasPoliinsaturadasG: food.gordurasPoliinsaturadasG ?? null,
    gordurasTransG: food.gordurasTransG ?? null,
    calcioMg: food.calcioMg ?? null,
    ferroMg: food.ferroMg ?? null,
    magnesioMg: food.magnesioMg ?? null,
    fosforoMg: food.fosforoMg ?? null,
    potassioMg: food.potassioMg ?? null,
    sodioMg: food.sodioMg ?? null,
    zincoMg: food.zincoMg ?? null,
    vitaminaAMcg: food.vitaminaAMcg ?? null,
    vitaminaCMg: food.vitaminaCMg ?? null,
    vitaminaDMcg: food.vitaminaDMcg ?? null,
    vitaminaEMg: food.vitaminaEMg ?? null,
    vitaminaB1Mg: food.vitaminaB1Mg ?? null,
    vitaminaB2Mg: food.vitaminaB2Mg ?? null,
    vitaminaB3Mg: food.vitaminaB3Mg ?? null,
    vitaminaB6Mg: food.vitaminaB6Mg ?? null,
    vitaminaB12Mcg: food.vitaminaB12Mcg ?? null,
    folatoMcg: food.folatoMcg ?? null,
    nutrientesExtras: (food.nutrientesExtras || []).map((n) => ({
      nome: n.nome,
      valor: n.valor ?? null,
      unidade: n.unidade,
    })),
    fontesPublicas,
    totalFontes: fontesPublicas.length,
  };
}

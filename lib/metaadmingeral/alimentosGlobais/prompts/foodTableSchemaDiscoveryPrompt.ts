/**
 * Prompt Schema Discovery multimodal v2.
 */

export const FOOD_TABLE_SCHEMA_DISCOVERY_PROMPT_VERSION = 'schema-discovery-v2';

export function buildFoodTableSchemaDiscoveryPromptV2(opts: {
  pageNumber: number;
  fonteNome?: string;
  textQuality?: string;
}): string {
  return `Você está vendo uma página de uma tabela nutricional.

VERSÃO: ${FOOD_TABLE_SCHEMA_DISCOVERY_PROMPT_VERSION}
PÁGINA: ${opts.pageNumber}
${opts.fonteNome ? `FONTE: ${opts.fonteNome}` : ''}
${opts.textQuality ? `QUALIDADE DO TEXTO EXTRAÍDO: ${opts.textQuality}` : ''}

Analise VISUALMENTE a relação entre cabeçalhos, colunas e linhas.
O texto extraído fornecido é apenas auxiliar e pode estar fora de ordem / com cabeçalhos quebrados.
A IMAGEM da página é a fonte principal para determinar:
- colunas
- linhas
- nomes
- códigos
- unidades
- base nutricional
- estimatedDataRows (quantas linhas de alimento há aproximadamente)

Regras:
1) Não invente colunas ausentes na imagem.
2) Código NÃO é obrigatório. Preparação NÃO é obrigatória.
3) Nutrientes desconhecidos: semanticType "nutrient", targetField null, nutrientName = cabeçalho.
4) Identifique rowPattern (como uma linha de alimento se define).
5) Se a página for só narrativa/bibliografia sem tabela de alimentos: isFoodCompositionTable=false.
6) Se for continuação sem cabeçalho completo: isContinuation=true e descreva o que herdar.

Retorne APENAS JSON:
{
  "isFoodCompositionTable": true,
  "isContinuation": false,
  "tableTitle": "string|null",
  "tableNumber": "string|null",
  "tableType": "MACRONUTRIENTS|CARBOHYDRATES|FATS|MINERALS|VITAMINS|AMINO_ACIDS|PORTIONS|GLYCEMIC_RESPONSE|REFERENCES|MIXED|UNKNOWN",
  "confidence": 0.0,
  "estimatedDataRows": 0,
  "base": { "quantity": 100, "unit": "g", "description": "string|null" },
  "rowPattern": {
    "rowType": "food",
    "foodIdentityColumns": ["nome"],
    "preparationColumns": [],
    "nutrientColumns": ["glicose", "frutose"]
  },
  "rowIdentity": ["food_name"],
  "continuationPattern": "string|null",
  "detectedLanguage": "pt|en|null",
  "columns": [
    {
      "sourceHeader": "Energia (kcal)",
      "semanticType": "nutrient|food_name|food_code|scientific_name|brand|preparation_code|preparation|portion|reference|other",
      "targetField": "energiaKcal|null",
      "nutrientName": "Energia",
      "unit": "kcal|g|mg|µg|null"
    }
  ]
}`;
}

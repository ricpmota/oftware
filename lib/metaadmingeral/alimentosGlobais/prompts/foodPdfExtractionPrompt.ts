/**
 * Prompt versionado — extração de tabelas nutricionais de PDF.
 * Gemini = EXTRATOR. Não é fonte nutricional.
 */

import { FOOD_PDF_PROMPT_VERSION } from '../importacao/constants';
import { SEGMENTOS_ALIMENTO } from '../segmentos';

export { FOOD_PDF_PROMPT_VERSION };

export function buildFoodPdfExtractionPrompt(opts: {
  pageStart: number;
  pageEnd: number;
  fonteNome?: string;
}): string {
  const segmentos = SEGMENTOS_ALIMENTO.join(', ');
  return `Você é um extrator de tabelas de composição de alimentos a partir de texto de PDF científico/tabelas nutricionais brasileiras.

VERSÃO DO PROMPT: ${FOOD_PDF_PROMPT_VERSION}
PÁGINAS DESTE LOTE: ${opts.pageStart} a ${opts.pageEnd}
${opts.fonteNome ? `FONTE INFORMADA PELO OPERADOR: ${opts.fonteNome}` : ''}

PAPEL:
- Você SOMENTE extrai informações presentes no documento.
- Você NÃO é uma fonte nutricional.
- NÃO utilize conhecimento externo sobre alimentos.
- NÃO estime calorias, proteínas, porções ou qualquer nutriente ausente.
- NÃO complete valores faltantes.
- NÃO substitua valores ausentes por zero.
- NÃO calcule calorias a partir de macros.
- NÃO classifique o papel do alimento no cardápio (proteína/carboidrato/gordura).
- "segmentoSugerido" é apenas uma sugestão entre a lista controlada abaixo.

REGRAS OBRIGATÓRIAS:
1) Extraia somente o que está no texto fornecido.
2) Se um valor não estiver informado, use null (NÃO use 0).
3) Se o documento mostrar explicitamente 0 ou 0,00, use 0.
4) Tokens como "-", "—", "N/D", vazio → null.
5) Preserve a relação correta cabeçalho ↔ coluna ↔ linha.
6) Preserve a unidade indicada (g, mg, µg, kcal, etc.).
7) Não converta unidades.
8) Em valoresOriginais, copie o texto exatamente como aparece (ex.: "31,85").
9) Em nutrientes, você pode enviar o número já com ponto decimal OU deixar null e confiar em valoresOriginais — o backend reconverte a partir de valoresOriginais.
10) Colunas nutricionais sem campo dedicado → nutrientesExtras[{ nome, valor, unidade, valorOriginal }].
11) Inclua codigoOriginal, codigoPreparacao, nome, nomeCientifico, marca, preparo/processamento quando presentes.
12) Informe source.page e source.table quando identificáveis (ex.: "Tabela 1", "Tabela 2").
13) baseQuantidade/baseUnidade do alimento (geralmente 100 e "g"). Se a tabela for por 100 ml ou porção, registre a base real — NÃO normalize.
14) segmentoSugerido deve ser UM destes códigos (ou null): ${segmentos}
15) segmentoConfidence entre 0 e 1 (ou null).
16) Retorne APENAS JSON válido, sem markdown.
17) A chave do array de alimentos DEVE ser exatamente "foods" (não "alimentos", "items" nem "foodItems").

FORMATO IBGE / POF (CRÍTICO):
- Tabelas densas podem vir com texto em linha contínua (espaços colapsados). AINDA ASSIM extraia CADA linha de alimento.
- MESMO codigoOriginal + DIFERENTES preparações = registros DISTINTOS.
  Ex.: 6400101 Batata-inglesa 1 Cru(a) e 6400101 Batata-inglesa 2 Cozido(a) → 2 itens em "foods".
- Preencha codigoPreparacao (ex.: "2") e preparo (ex.: "Cozido(a)").
- Identifique o tipo de tabela:
  Tabela 1 → energia/macronutrientes/fibra (preencha energiaKcal, proteinasG, gordurasTotaisG, carboidratosG, fibrasG)
  Tabela 2 → gorduras/açúcar
  Tabela 3 → minerais
  Tabela 4 → vitaminas
  Tabela 5 → referências (geralmente sem alimentos nutricionais → foods: [])
- Em Tabela 1, NÃO invente minerais/vitaminas ausentes; deixe null.
- NÃO retorne foods: [] se o texto contiver códigos de alimento + kcal/proteína/carboidrato.

FORMATO JSON:
{
  "document": {
    "page": ${opts.pageStart},
    "table": "string|null",
    "baseQuantity": 100,
    "baseUnit": "g"
  },
  "foods": [
    {
      "codigoOriginal": "string|null",
      "codigoPreparacao": "string|null",
      "nome": "string",
      "nomeCientifico": "string|null",
      "marca": "string|null",
      "estado": "string|null",
      "processamento": "string|null",
      "preparo": "string|null",
      "segmentoSugerido": "FRUTAS_E_DERIVADOS|null",
      "segmentoConfidence": 0.0,
      "baseQuantidade": 100,
      "baseUnidade": "g",
      "nutrientes": {
        "energiaKcal": null,
        "energiaKj": null,
        "proteinasG": null,
        "carboidratosG": null,
        "gordurasTotaisG": null,
        "fibrasG": null,
        "umidadeG": null,
        "glicoseG": null,
        "frutoseG": null,
        "lactoseG": null,
        "sacaroseG": null,
        "acucaresTotaisG": null,
        "amidoTotalG": null,
        "amidoDisponivelG": null,
        "amidoResistenteG": null,
        "gordurasSaturadasG": null,
        "gordurasMonoinsaturadasG": null,
        "gordurasPoliinsaturadasG": null,
        "gordurasTransG": null,
        "calcioMg": null,
        "ferroMg": null,
        "magnesioMg": null,
        "fosforoMg": null,
        "potassioMg": null,
        "sodioMg": null,
        "zincoMg": null,
        "vitaminaAMcg": null,
        "vitaminaCMg": null,
        "vitaminaDMcg": null,
        "vitaminaEMg": null,
        "vitaminaB1Mg": null,
        "vitaminaB2Mg": null,
        "vitaminaB3Mg": null,
        "vitaminaB6Mg": null,
        "vitaminaB12Mcg": null,
        "folatoMcg": null
      },
      "valoresOriginais": {
        "energiaKcal": "string|null",
        "proteinasG": "string|null",
        "codigoPreparacao": "string|null"
      },
      "nutrientesExtras": [
        { "nome": "Açúcares redutores", "valor": null, "unidade": "g/100g", "valorOriginal": "0,80" }
      ],
      "source": { "page": ${opts.pageStart}, "table": "string|null", "codigoOriginal": "string|null" },
      "extractionConfidence": 0.0
    }
  ]
}

Se o lote NÃO contiver tabela de alimentos (ex.: capa, sumário, Tabela 5 só referências), retorne { "document": { "page": ${opts.pageStart}, "table": null, "baseQuantity": null, "baseUnit": null }, "foods": [] }.
Se o lote CONTIVER tabela alimentar e você não conseguir estruturar, AINDA ASSIM tente extrair linhas com codigoOriginal/nome/preparo/macros — NÃO retorne foods vazio nesses casos.`;
}

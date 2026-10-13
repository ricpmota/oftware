# Comparativo de cobertura do catálogo — V1 vs V2

**V1:** catálogo pré-lote 01 (ETAPA 10) · **V2:** lote prioritário 01 (ETAPA 11)  
Matriz idêntica: **8.920** cenários · motor `montarPratoPadraoRefeicaoV2`.

## Tabela principal

| Segmento | V1 | V2 | Variação |
| -------- | ----: | --: | -------: |
| Geral | 47,5% | 50,3% | **+2,8 pp** |
| Café | 82,2% | 91,1% | **+8,9 pp** |
| Lanche1 | 16,8% | 28,4% | **+11,6 pp** |
| Almoço | 51,0% | 42,6% | **−8,4 pp** |
| Lanche2 | 18,1% | 27,1% | **+9,0 pp** |
| Jantar | 61,4% | 56,8% | **−4,6 pp** |
| Vegano | 12,7% | 23,9% | **+11,2 pp** |
| Lactose | 53,6% | 59,0% | **+5,4 pp** |
| Sem restrição | 65,8% | 66,9% | **+1,1 pp** |

Classificação geral: **insuficiente → limitada**.

## Metas críticas

| Meta | V1 | V2 | Variação |
|------|---:|---:|---------:|
| Proteína 10 g | 0% | 0% | 0 |
| Proteína 15 g | 28,2% | ~28% | ~0 |
| Calorias 100 | 0% | 29,1% | **+29 pp** |
| Calorias 150 | 5,6% | 15,0% | **+9,4 pp** |

## Alertas

| Alerta | V1 | V2 |
|--------|---:|---:|
| META_CALORICA_NAO_ATINGIDA | 25,1% | 29,9%* |
| META_PROTEICA_NAO_ATINGIDA | 24,6% | 32,8%* |
| SEM_COMBINACAO_VALIDA | 8,1% | **~0%** (saiu do top) |
| CATALOGO_LIMITADO | 8,1% | 8,1% |
| META_CALORICA_EXCEDIDA_PARA_PROTEINA | 3,6% | 2,8% |

\*Percentuais relativos ao total de cenários; a composição de falhas mudou com mais candidatos de baixa densidade proteica (leguminosas/tofu).

## Combinações questionáveis

| Motivo | V1 | V2 |
|--------|----|----|
| multiplos_complementos_proteicos | presente | presente |
| peru_ultraprocessado_como_principal | presente | **ausente** |
| peixe+whey / azeite+castanhas | bloqueados | bloqueados |

## Peito de peru

| | V1 | V2 |
|--|---:|---:|
| Seleções | 174 (2,0%) | **0 (0%)** |

Prioridade reduzida + família `peru` no fim da ordenação eliminou o uso automático.

## Uso de suplementos (V2, frequência)

- `prot_whey_isolado_sl`: 144
- `prot_proteina_vegetal`: (ver `frequenciaItens` no JSON V2)
- Whey comum permanece disponível; isolado SL atende intolerância à lactose.

## Uso por item do lote (frequência V2)

| Item | Seleções |
|------|--------:|
| prot_tofu_200g | 1760 |
| prot_proteina_vegetal | 1637 |
| prot_lentilha_1concha | 819 |
| prot_iogurte_sem_lactose | 477 |
| prot_feijao_1concha | 377 |
| prot_ovos_1un | 332 |
| carb_arroz_branco_4col | 326 |
| prot_claras_2un | 277 |
| prot_peixe_150g | 183 |
| prot_frango_120g | 156 |
| prot_whey_isolado_sl | 144 |
| carb_arroz_integral_4col | 370 |
| carb_arroz_integral_2col | 129 |
| carb_arroz_branco_2col | 125 |
| prot_grao_bico_1concha | 122 |
| carb_batata_doce_meia | 97 |
| prot_tofu_150g | 92 |

Nenhum item do lote ficou em 0 seleções. Menor impacto relativo: tofu 150 g e batata-doce meia (ainda úteis estruturalmente).

## Interpretação

**Ganhos claros:** café, lanches, veganismo, lactose, metas calóricas baixas (100–150), eliminação do peru automático, fim de `SEM_COMBINACAO_VALIDA` no top.

**Regressões:** almoço (−8,4 pp), jantar (−4,6 pp), vegetariano (−4,8 pp), lactose+vegetariano (−4,8 pp), estilo plant_based (−6,8 pp). Hipótese: leguminosas/tofu de baixa densidade proteica entram no pool e falham em metas altas (±10%) com mais frequência, sem empilhar whey em refeição principal.

**Próximo gargalo:** densidade proteica em almoço/jantar plant-based; lanches ainda &lt;35%; proteína 10 g; calorias ≥700.

## Critérios desejáveis (não atingidos)

| Meta | Alvo | V2 |
|------|------|-----|
| Geral | &gt;60% | 50,3% |
| Lanches | &gt;35% | ~28% |
| Vegano | &gt;35% | 23,9% |
| Sem restrição | &gt;75% | 66,9% |

Arquivos: `artifacts/nutri/auditoria-catalogo-v1.json`, `auditoria-catalogo-v2.json`, docs `AUDITORIA_COBERTURA_CATALOGO_V1.md` / `_V2.md`.

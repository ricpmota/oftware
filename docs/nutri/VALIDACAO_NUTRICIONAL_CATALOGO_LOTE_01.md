# Validação nutricional — Catálogo Opção 01 · Lote 01

**Data da consulta:** 2026-07-31  
**Fonte primária:** TACO / NEPA-UNICAMP (JSON espelho usado por `/api/taco-buscar`: `marcelosanto/tabela_taco`)  
**Fontes secundárias:** rótulo nutricional genérico (suplementos); fator de rendimento culinário quando TACO só traz cru.

Valores do catálogo legado (ex.: tofu 100 g, frango 100 g) **não são alterados** nesta etapa. Novas porções usam densidade TACO ou proporção explícita ao item legado, documentada abaixo.

## Tabela do lote

| ID | Nome | Porção | Peso | Proteína | Carboidrato | Gordura | kcal | Fonte |
| -- | ---- | -----: | ---: | -------: | ----------: | ------: | ---: | ----- |
| prot_tofu_150g | Tofu (150g) | 150 g | 150 | 9,8 | 3,2 | 5,9 | 97 | TACO *Soja, queijo (tofu)* ×1,5 |
| prot_tofu_200g | Tofu (200g) | 200 g | 200 | 13,1 | 4,3 | 7,9 | 129 | TACO *Soja, queijo (tofu)* ×2 |
| prot_proteina_vegetal | Proteína vegetal em pó (1 dose) | 1 dose | 30 | 20 | 3 | 2 | 110 | Rótulo genérico BR (média de mercado) |
| prot_feijao_1concha | Feijão carioca cozido (1 concha) | 1 concha | 100 | 4,8 | 13,6 | 0,5 | 76 | TACO *Feijão, carioca, cozido* /100 g |
| prot_lentilha_1concha | Lentilha cozida (1 concha) | 1 concha | 100 | 6,3 | 16,3 | 0,5 | 93 | TACO *Lentilha, cozida* /100 g |
| prot_grao_bico_1concha | Grão-de-bico cozido (1 concha) | 1 concha | 100 | 8,5 | 23,2 | 2,2 | 142 | TACO *Grão-de-bico, cru* ÷ rendimento 2,5 (cozido); TACO não lista cozido |
| prot_iogurte_sem_lactose | Iogurte proteico sem lactose (170g) | 170 g | 170 | 20 | 6 | 2 | 150 | Rótulo genérico alinhado ao iogurte proteico legado |
| prot_whey_isolado_sl | Whey isolado (baixo lactose) 1 dose | 1 dose | 30 | 25 | 2 | 1 | 110 | Rótulo genérico; **não afirmar zero lactose absoluto** |
| prot_frango_120g | Peito de frango grelhado (120g) | 120 g | 120 | 38 | 0 | 3 | 191 | TACO *Frango, peito, sem pele, grelhado* ×1,2 |
| prot_peixe_150g | Peixe grelhado (150g) | 150 g | 150 | 38 | 0 | 5 | 225 | Proporção do item legado `prot_peixe_100g` (25 g / 150 kcal) |
| prot_ovos_1un | 1 ovo inteiro | 1 un | 50 | 6 | 0 | 5 | 70 | Proporção do legado `prot_ovos_2un`; TACO ovo cozido ~13,3 g / 146 kcal /100 g |
| prot_claras_2un | 2 claras de ovo | 2 un | 60 | 7 | 0 | 0 | 34 | Proporção do legado `prot_claras_4un`; TACO clara cozida 13,4 g / 59 kcal /100 g |
| carb_arroz_branco_2col | Arroz branco (2 colheres) | 2 col | ~40 | 1 | 19 | 0 | 93 | ⅔ do legado `carb_arroz_branco_3col` |
| carb_arroz_branco_4col | Arroz branco (4 colheres) | 4 col | ~80 | 3 | 37 | 0 | 187 | 4/3 do legado `carb_arroz_branco_3col` |
| carb_arroz_integral_2col | Arroz integral (2 colheres) | 2 col | ~40 | 2 | 17 | 1 | 100 | ⅔ do legado `carb_arroz_integral_3col` |
| carb_arroz_integral_4col | Arroz integral (4 colheres) | 4 col | ~80 | 4 | 34 | 1 | 200 | 4/3 do legado `carb_arroz_integral_3col` |
| carb_batata_doce_meia | Batata-doce (meia unidade) | ½ un | ~65 | 1 | 18 | 0 | 90 | ½ do legado `carb_batata_doce_1un`; TACO batata doce cozida 0,6 g / 77 kcal /100 g |

> **Arroz:** em vez de IDs genéricos `carb_arroz_2col` / `carb_arroz_4col`, foram criadas variantes **branco** e **integral** (4 IDs) para preservar escolha digestiva vs mediterrânea/low-carb. Total do lote: **17 itens** (15 planejados + 2 por diferenciação do arroz).

## Itens do lote original — status

| ID planejado | Status |
|--------------|--------|
| prot_tofu_150g / 200g | Incluído (TACO) |
| prot_proteina_vegetal | Incluído (rótulo) |
| prot_feijao / lentilha / grao_bico | Incluído (TACO; grão-de-bico via rendimento) |
| prot_iogurte_sem_lactose | Incluído (rótulo) |
| prot_whey_isolado_sl | Incluído (rótulo; nome “baixo lactose”) |
| prot_frango_120g / peixe_150g / ovos_1un / claras_2un | Incluído |
| carb_arroz_* / batata_doce_meia | Incluído (arroz diferenciado) |

## Pendentes / adiados (fora do lote)

Carne 150 g, azeite colher de chá, cuscuz, tapioca, pão sem glúten, ricota, atum, aveia, sopa digestiva, castanhas meia porção — conforme escopo da ETAPA 11.

## Observações de arredondamento

- Proteína e gordura: 1 casa decimal quando &lt; 10 g; inteiros quando ≥ 10 g (exceto densidades baixas de leguminosas mantidas com 1 casa).
- Calorias: inteiros.
- Catálogo operacional (`ItemCatalogoMontagem`) persiste `proteina_g` e `calorias_kcal`; carboidrato/gordura ficam neste documento para rastreio.

## Referências TACO (IDs no JSON)

| Alimento | ID TACO | description |
|----------|--------:|-------------|
| Tofu | 584 | Soja, queijo (tofu) |
| Feijão carioca cozido | 561 | Feijão, carioca, cozido |
| Lentilha cozida | 577 | Lentilha, cozida |
| Grão-de-bico cru | 575 | Grão-de-bico, cru |
| Frango peito grelhado | 410 | Frango, peito, sem pele, grelhado |
| Ovo inteiro cozido | 488 | Ovo, de galinha, inteiro, cozido/10minutos |
| Clara cozida | 486 | Ovo, de galinha, clara, cozida/10minutos |
| Batata-doce cozida | 88 | Batata, doce, cozida |
| Arroz branco cozido | 3 | Arroz, tipo 1, cozido |
| Arroz integral cozido | 1 | Arroz, integral, cozido |

# Auditoria de cobertura do catálogo — V1

## 1. Resumo executivo

Modo **completo**: 8920 cenários · atendimento **47.5%** · classificação **insuficiente**.
Atendidos: 4234 (com alertas/naturalidade: 533) · Não atendidos: 4686.

## 2–3. Totais e cobertura geral

| Métrica | Valor |
|--------:|------:|
| Total | 8920 |
| Atendidos | 4234 |
| % | 47.5% |
| Classe | insuficiente |

## 4. Cobertura por refeição

| Refeição | Total | Atendidos | % | Classe |
|----------|------:|----------:|--:|--------|
| cafe | 1880 | 1546 | 82.2% | boa |
| lanche1 | 1400 | 235 | 16.8% | insuficiente |
| almoco | 1880 | 959 | 51.0% | limitada |
| lanche2 | 1880 | 340 | 18.1% | insuficiente |
| jantar | 1880 | 1154 | 61.4% | limitada |

## 5. Cobertura por estilo

| Estilo | Total | Atendidos | % | Classe |
|--------|------:|----------:|--:|--------|
| digestiva | 1784 | 842 | 47.2% | insuficiente |
| low_carb_moderada | 1784 | 853 | 47.8% | insuficiente |
| mediterranea | 1784 | 823 | 46.1% | insuficiente |
| plant_based | 1784 | 858 | 48.1% | insuficiente |
| rico_proteina | 1784 | 858 | 48.1% | insuficiente |

## 6. Cobertura por restrição

| Restrição | Total | Atendidos | % | Classe |
|-----------|------:|----------:|--:|--------|
| vegano | 990 | 126 | 12.7% | insuficiente |
| sem glúten+vegano | 990 | 126 | 12.7% | insuficiente |
| intolerância lactose+vegetariano | 990 | 508 | 51.3% | limitada |
| intolerância lactose | 990 | 531 | 53.6% | limitada |
| intolerância lactose+sem glúten | 990 | 531 | 53.6% | limitada |
| vegetariano | 990 | 546 | 55.2% | limitada |
| sem glúten | 990 | 556 | 56.2% | limitada |
| sem_restricao | 1990 | 1310 | 65.8% | limitada |

## 7. Metas proteicas problemáticas

| Meta proteica | Cenários | Atendidos | Cobertura |
| ------------: | -------: | --------: | --------: |
| 10 g | 520 | 0 | 0.0% |
| 15 g | 900 | 254 | 28.2% |
| 20 g | 1190 | 665 | 55.9% |
| 25 g | 1430 | 612 | 42.8% |
| 30 g | 1480 | 694 | 46.9% |
| 35 g | 1190 | 692 | 58.2% |
| 40 g | 860 | 568 | 66.0% |
| 45 g | 580 | 382 | 65.9% |
| 50 g | 530 | 271 | 51.1% |
| 60 g | 240 | 96 | 40.0% |

Mais problemáticas: 10, 15, 60, 25, 30, 50, 20, 35 g.

## 8. Metas calóricas problemáticas

| Meta calórica | Cenários | Atendidos | Cobertura |
| ------------: | -------: | --------: | --------: |
| 100 | 440 | 0 | 0.0% |
| 150 | 540 | 30 | 5.6% |
| 200 | 780 | 379 | 48.6% |
| 250 | 1060 | 523 | 49.3% |
| 300 | 1110 | 595 | 53.6% |
| 350 | 1060 | 591 | 55.8% |
| 400 | 860 | 531 | 61.7% |
| 450 | 620 | 522 | 84.2% |
| 500 | 570 | 446 | 78.2% |
| 550 | 330 | 225 | 68.2% |
| 600 | 330 | 190 | 57.6% |
| 650 | 330 | 156 | 47.3% |
| 700 | 330 | 42 | 12.7% |
| 750 | 280 | 4 | 1.4% |
| 800 | 280 | 0 | 0.0% |

Mais problemáticas: 100, 800, 750, 150, 700, 650, 200, 250 kcal.

## 9. Alertas mais frequentes

- `META_CALORICA_NAO_ATINGIDA_PELO_CATALOGO`: 2241 (25.1%)
- `META_PROTEICA_NAO_ATINGIDA_PELO_CATALOGO`: 2195 (24.6%)
- `SEM_COMBINACAO_VALIDA`: 720 (8.1%)
- `CATALOGO_LIMITADO_PARA_O_PERFIL`: 720 (8.1%)
- `META_CALORICA_EXCEDIDA_PARA_ATINGIR_PROTEINA`: 325 (3.6%)

## 10. Combinações questionáveis

- multiplos_complementos_proteicos
- peru_ultraprocessado_como_principal

## 11. Lacunas de porção

- **prot_frango_100g**: Salto 100g→150g sem intermediário (~120g) → sugerido `prot_frango_120g` (~698 cenários)
- **prot_ovos_2un**: Sem porção de 1 ovo para metas baixas de café/lanche → sugerido `prot_ovos_1un` (~231 cenários)
- **gord_azeite_1col**: Única porção 120 kcal estoura metas pequenas → sugerido `gord_azeite_1col_cha` (~0 cenários)
- **carb_arroz_integral_3col**: Apenas 3 colheres — falta 2 e 4 colheres → sugerido `carb_arroz_2col` (~2762 cenários)
- **prot_tofu_100g**: Tofu só 100g (8g prot) — insuficiente para plant-based → sugerido `prot_tofu_200g` (~2308 cenários)
- **prot_peixe_100g**: Sem peixe 150g para metas proteicas altas no jantar → sugerido `prot_peixe_150g` (~675 cenários)
- **prot_claras_4un**: Sem 2 claras para complemento leve → sugerido `prot_claras_2un` (~329 cenários)

## 12. Limitações plant-based

- Estilo plant_based / restrição vegano: ver tabela por estilo/restrição.
- Dependência de tofu 100g (8g prot); sem feijão/lentilha/grão-de-bico; lanches veganos sem proteína prática.

## 13. Limitações digestivas

- Há `leg_legumes_cozidos`, arroz branco e mandioca; azeite 120 kcal ainda pesa; poucas opções de jantar muito leve.

## 14. Análise dos itens atuais

- Peito de peru: selecionado 174× (2.0%); ultraprocessado — candidato a rebaixamento futuro.
- Azeite: 3424×; excesso calórico com azeite: 0.
- Fruta pequena: 2537× (genérica, 60 kcal).

## 15. Sugestões priorizadas

### Prioridade alta

- `prot_tofu_200g` — Tofu (200g) (~2770 cenários): Única proteína vegetal atual é fraca (8g/100g).
- `prot_proteina_vegetal` — Proteína vegetal em pó (1 dose) (~1412 cenários): Lanches veganos hoje ficam sem whey/iogurte/ovos.
- `prot_iogurte_sem_lactose` — Iogurte proteico sem lactose (~1400 cenários): Restitui iogurte quando lactose é restrita.
- `prot_feijao_1concha` — Feijão cozido (1 concha) (~1269 cenários): Lacuna estrutural: não há leguminosas no catálogo.
- `carb_arroz_2col` — Arroz (2 colheres) (~1105 cenários): Permite jantares menores sem cortar carbo.
- `carb_batata_doce_meia` — Batata-doce (meia unidade) (~931 cenários): Meia porção vs unidade média de 180 kcal.
- `prot_tofu_150g` — Tofu (150g) (~808 cenários): Porção intermediária de tofu.
- `prot_frango_120g` — Peito de frango grelhado (120g) (~698 cenários): Fecha o salto 100↔150g nas metas ~35–40g.
- `prot_peixe_150g` — Peixe grelhado (150g) (~675 cenários): Amplia peixe para metas ≥35g sem forçar carne.
- `prot_lentilha_1concha` — Lentilha cozida (1 concha) (~577 cenários): Variedade além de tofu.
- `carb_arroz_4col` — Arroz (4 colheres) (~568 cenários): Completa metas calóricas altas no almoço.
- `prot_whey_isolado_sl` — Whey isolado sem lactose (1 dose) (~560 cenários): Whey atual não é marcado sem lactose no filtro.
- `prot_grao_bico_1concha` — Grão-de-bico (1 concha) (~462 cenários): Complemento mediterrâneo/plant-based.
- `carb_aveia_3col` — Aveia (3 colheres) (~334 cenários): Carbo de café além de pão.
- `prot_claras_2un` — 2 claras de ovo (~329 cenários): Complemento menor que 4 claras.
- `prot_atum_agua_1lata` — Atum em água (1 lata escorrida) (~256 cenários): Proteína prática magra; útil em jantar leve.
- `prot_ovos_1un` — 1 ovo inteiro (~231 cenários): Permite café/lanche com meta calórica baixa.
- `gord_castanhas_meia` — Castanhas (meia porção) (~216 cenários): Meia porção para caber em lanches ~150–200 kcal.
- `carb_tapioca_1un` — Tapioca (1 unidade média) (~154 cenários): Carbo sem glúten para café.
- `carb_pao_sem_gluten` — Pão sem glúten (1 fatia) (~154 cenários): Substitui pão integral filtrado por sem glúten.
- `prot_ricota_100g` — Ricota (100g) (~94 cenários): Alternativa a cottage; impacto moderado.

### Prioridade media

- `carb_cuscuz_1prato` — Cuscuz (1 prato pequeno) (~47 cenários): Benefício cultural; impacto limitado na cobertura.
- `extra_sopa_digestiva` — Sopa leve de legumes (1 prato) (~28 cenários): Jantar GI leve; catálogo não tem preparo líquido.

### Prioridade baixa

- `prot_carne_magra_150g` — Carne magra/patinho (150g) (~5 cenários): Porção maior de carne para recomposição.

## 16. Itens avaliados e rejeitados / baixo impacto

- `gord_azeite_1col_cha`: Impacto estimado baixo (0 cenários)

## 17. Próximos passos

- ETAPA 11: expandir catálogo com itens de prioridade alta (valores validados).
- Não cadastrar sugestões sem validação nutricional.
- Reavaliar prioridade do peito de peru no motor.

## Notas de custo

- Modo=completo; cenários=8920.
- Batch A (completo): metas×estilos×restrições×sem preferência.
- Batch B (completo): preferências×metas representativas×estilos×sem restrição.
- Modo amostra/teste reduz a matriz para CI/dev rápido.
- Nenhuma chamada externa, IA ou Firestore.

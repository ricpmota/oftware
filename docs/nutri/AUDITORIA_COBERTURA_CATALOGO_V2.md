# Auditoria de cobertura do catálogo — V2

## 1. Resumo executivo

Modo **completo**: 8920 cenários · atendimento **50.3%** · classificação **limitada**.
Atendidos: 4487 (com alertas/naturalidade: 512) · Não atendidos: 4433.

## 2–3. Totais e cobertura geral

| Métrica | Valor |
|--------:|------:|
| Total | 8920 |
| Atendidos | 4487 |
| % | 50.3% |
| Classe | limitada |

## 4. Cobertura por refeição

| Refeição | Total | Atendidos | % | Classe |
|----------|------:|----------:|--:|--------|
| cafe | 1880 | 1712 | 91.1% | excelente |
| lanche1 | 1400 | 397 | 28.4% | insuficiente |
| almoco | 1880 | 801 | 42.6% | insuficiente |
| lanche2 | 1880 | 509 | 27.1% | insuficiente |
| jantar | 1880 | 1068 | 56.8% | limitada |

## 5. Cobertura por estilo

| Estilo | Total | Atendidos | % | Classe |
|--------|------:|----------:|--:|--------|
| digestiva | 1784 | 1010 | 56.6% | limitada |
| low_carb_moderada | 1784 | 910 | 51.0% | limitada |
| mediterranea | 1784 | 906 | 50.8% | limitada |
| plant_based | 1784 | 736 | 41.3% | insuficiente |
| rico_proteina | 1784 | 925 | 51.8% | limitada |

## 6. Cobertura por restrição

| Restrição | Total | Atendidos | % | Classe |
|-----------|------:|----------:|--:|--------|
| vegano | 990 | 237 | 23.9% | insuficiente |
| sem glúten+vegano | 990 | 237 | 23.9% | insuficiente |
| intolerância lactose+vegetariano | 990 | 460 | 46.5% | insuficiente |
| vegetariano | 990 | 499 | 50.4% | limitada |
| sem glúten | 990 | 554 | 56.0% | limitada |
| intolerância lactose | 990 | 584 | 59.0% | limitada |
| intolerância lactose+sem glúten | 990 | 584 | 59.0% | limitada |
| sem_restricao | 1990 | 1332 | 66.9% | limitada |

## 7. Metas proteicas problemáticas

| Meta proteica | Cenários | Atendidos | Cobertura |
| ------------: | -------: | --------: | --------: |
| 10 g | 520 | 0 | 0.0% |
| 15 g | 900 | 249 | 27.7% |
| 20 g | 1190 | 774 | 65.0% |
| 25 g | 1430 | 765 | 53.5% |
| 30 g | 1480 | 875 | 59.1% |
| 35 g | 1190 | 772 | 64.9% |
| 40 g | 860 | 514 | 59.8% |
| 45 g | 580 | 261 | 45.0% |
| 50 g | 530 | 197 | 37.2% |
| 60 g | 240 | 80 | 33.3% |

Mais problemáticas: 10, 15, 60, 50, 45, 25, 30, 40 g.

## 8. Metas calóricas problemáticas

| Meta calórica | Cenários | Atendidos | Cobertura |
| ------------: | -------: | --------: | --------: |
| 100 | 440 | 128 | 29.1% |
| 150 | 540 | 81 | 15.0% |
| 200 | 780 | 411 | 52.7% |
| 250 | 1060 | 541 | 51.0% |
| 300 | 1110 | 579 | 52.2% |
| 350 | 1060 | 619 | 58.4% |
| 400 | 860 | 518 | 60.2% |
| 450 | 620 | 544 | 87.7% |
| 500 | 570 | 441 | 77.4% |
| 550 | 330 | 245 | 74.2% |
| 600 | 330 | 171 | 51.8% |
| 650 | 330 | 146 | 44.2% |
| 700 | 330 | 58 | 17.6% |
| 750 | 280 | 5 | 1.8% |
| 800 | 280 | 0 | 0.0% |

Mais problemáticas: 800, 750, 150, 700, 100, 650, 250, 600 kcal.

## 9. Alertas mais frequentes

- `META_PROTEICA_NAO_ATINGIDA_PELO_CATALOGO`: 2831 (31.7%)
- `META_CALORICA_NAO_ATINGIDA_PELO_CATALOGO`: 2671 (29.9%)
- `CATALOGO_LIMITADO_PARA_O_PERFIL`: 720 (8.1%)
- `META_CALORICA_EXCEDIDA_PARA_ATINGIR_PROTEINA`: 242 (2.7%)

## 10. Combinações questionáveis

- multiplos_complementos_proteicos

## 11. Lacunas de porção

- **gord_azeite_1col**: Única porção 120 kcal estoura metas pequenas → sugerido `gord_azeite_1col_cha` (~0 cenários)

## 12. Limitações plant-based

- Estilo plant_based / restrição vegano: ver tabela por estilo/restrição.
- Lote 01 presente (tofu ≥150g / leguminosas / proteína vegetal); gargalo restante: densidade proteica em almoço/jantar e metas altas.

## 13. Limitações digestivas

- Há `leg_legumes_cozidos`, arroz branco e mandioca; azeite 120 kcal ainda pesa; poucas opções de jantar muito leve.

## 14. Análise dos itens atuais

- Peito de peru: selecionado 0× (0.0%); ultraprocessado — candidato a rebaixamento futuro.
- Azeite: 3237×; excesso calórico com azeite: 0.
- Fruta pequena: 2921× (genérica, 60 kcal).

## 15. Sugestões priorizadas

### Prioridade alta

- `prot_atum_agua_1lata` — Atum em água (1 lata escorrida) (~308 cenários): Proteína prática magra; útil em jantar leve.
- `gord_castanhas_meia` — Castanhas (meia porção) (~190 cenários): Meia porção para caber em lanches ~150–200 kcal.
- `carb_aveia_3col` — Aveia (3 colheres) (~168 cenários): Carbo de café além de pão.
- `prot_ricota_100g` — Ricota (100g) (~89 cenários): Alternativa a cottage; impacto moderado.

### Prioridade media

- `carb_tapioca_1un` — Tapioca (1 unidade média) (~67 cenários): Carbo sem glúten para café.
- `carb_pao_sem_gluten` — Pão sem glúten (1 fatia) (~67 cenários): Substitui pão integral filtrado por sem glúten.
- `carb_cuscuz_1prato` — Cuscuz (1 prato pequeno) (~39 cenários): Benefício cultural; impacto limitado na cobertura.
- `extra_sopa_digestiva` — Sopa leve de legumes (1 prato) (~33 cenários): Jantar GI leve; catálogo não tem preparo líquido.

### Prioridade baixa

- `prot_carne_magra_150g` — Carne magra/patinho (150g) (~4 cenários): Porção maior de carne para recomposição.

## 16. Itens avaliados e rejeitados / baixo impacto

- `prot_frango_120g`: ID já existe no catálogo atual
- `prot_peixe_150g`: ID já existe no catálogo atual
- `prot_tofu_150g`: ID já existe no catálogo atual
- `prot_tofu_200g`: ID já existe no catálogo atual
- `prot_ovos_1un`: ID já existe no catálogo atual
- `prot_claras_2un`: ID já existe no catálogo atual
- `gord_azeite_1col_cha`: Impacto estimado baixo (0 cenários)
- `carb_arroz_2col`: ID já existe no catálogo atual
- `carb_arroz_4col`: ID já existe no catálogo atual
- `carb_batata_doce_meia`: ID já existe no catálogo atual
- `prot_feijao_1concha`: ID já existe no catálogo atual
- `prot_lentilha_1concha`: ID já existe no catálogo atual
- `prot_grao_bico_1concha`: ID já existe no catálogo atual
- `prot_iogurte_sem_lactose`: ID já existe no catálogo atual
- `prot_whey_isolado_sl`: ID já existe no catálogo atual
- `prot_proteina_vegetal`: ID já existe no catálogo atual

## 17. Próximos passos

- Avaliar lote 02 (atum, aveia, pão sem glúten, castanhas meia, azeite colher de chá) após impacto medido do lote 01.
- Não cadastrar sugestões sem validação nutricional.
- Atacar densidade proteica almoço/jantar plant-based sem manipular score/tolerância.

## Notas de custo

- Modo=completo; versaoCatalogo=2; cenários=8920.
- Batch A (completo): metas×estilos×restrições×sem preferência.
- Batch B (completo): preferências×metas representativas×estilos×sem restrição.
- Modo amostra/teste reduz a matriz para CI/dev rápido.
- Nenhuma chamada externa, IA ou Firestore.

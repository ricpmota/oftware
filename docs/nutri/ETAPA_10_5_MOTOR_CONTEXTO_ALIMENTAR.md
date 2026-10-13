# ETAPA 10.5 — Motor de contexto alimentar e naturalidade

## 1. Problema encontrado

A Opção 01 automática priorizava macros (±10%) sem compreender o contexto cultural da refeição.

## 2. Exemplo real

```text
Café da manhã → Ovo cozido + arroz branco
```

Macros próximos, combinação pouco natural no Brasil.

## 3. Filosofia

```text
restrição → contexto → naturalidade → afinidade → macros → preferência
```

Preferência **não** libera adequação 0 nem afinidade proibida.

## 4. Mapa de adequação

`lib/nutri/contextoAlimentar.ts` · `CONTEXTO_ALIMENTAR_CATALOGO_V1`  
Níveis 0–5; automática exige ≥ 3. Item sem contexto → adequação 0 + alerta `ITEM_SEM_CONTEXTO_ALIMENTAR`.

## 5. Templates

`lib/nutri/templatesRefeicao.ts` — café, lanches, almoço, jantar (incl. `jantar_digestivo`, `almoco_plant_based`, café reduzido).

## 6. Afinidade

`lib/nutri/afinidadeAlimentos.ts` — matriz configurável (`preferida` … `proibida`).

## 7. Proibições

Ovo+arroz no café; arroz em lanches; peixe/carne/frango+whey; iogurte+arroz/feijão; azeite+castanhas; whey+salada; etc.

## 8. Score contextual

```text
scoreFinal = scoreNutricional*0.45 + (1 - scoreContextual)*0.55
```

(menor = melhor; rico em proteína eleva peso nutricional para 0.5)

## 9. Prioridade das regras

Eliminatórias antes do score: adequação &lt;3, afinidade proibida, arroz em café/lanches, feijão em café/lanches, lixo, categoria fora do template.

## 10. Perfis especiais

Digestiva → `jantar_digestivo` + sem salada grande. Plant-based → template próprio. Café reduzido → whey/iogurte+fruta.

## 11. Fallback seguro

Sem combinação natural → `status: indisponivel` + `SEM_COMBINACAO_NATURAL_VALIDA` (sem prato absurdo).

## 12. Painel

Somente `modoNutricionista`: template, naturalidade %, aproximação prot/kcal e alertas. Paciente não vê scores.

## 13. Preservação

Manual/TACO/Opções 02–05 intactos; reload não regenera; motor novo em planos novos / Refazer.

## 14. Auditoria

`docs/nutri/AUDITORIA_NATURALIDADE_OPCAO01_V1.md` · artefato JSON em `artifacts/nutri/`. Cobertura V1/V2 preservada.

## 15. Testes

Specs de contexto, templates, afinidade, montagem (incl. regressão ovo+arroz) + etapas 1–10.

## 16. Limitações

- Sem expansão de catálogo nesta etapa.
- Cobertura nutricional pode cair (trade-off intencional).
- Itens do lote 01 já existentes receberam contexto; nenhum ID novo.

## 17. Arquivos

Criados: `contextoAlimentar.ts(.spec)`, `templatesRefeicao.ts(.spec)`, `afinidadeAlimentos.ts(.spec)`, `scripts/auditar-naturalidade-opcao01.ts`, docs.  
Alterados: `montagemPratoPadrao.ts(.spec)`, `auditoriaCoberturaCatalogo.ts(.spec)`, `NutriContent.tsx`.

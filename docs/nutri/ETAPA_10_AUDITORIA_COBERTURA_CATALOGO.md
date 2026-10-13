# ETAPA 10 — Auditoria de cobertura do catálogo nutricional

## 1. Objetivo

Medir objetivamente a capacidade do catálogo atual de montar a Opção 01 automática (motor V2) em matrizes de metas, estilos, restrições e preferências — **sem alterar** catálogo, motor, cardápio ou Firestore.

## 2. Módulo

| Arquivo | Papel |
|---------|--------|
| `lib/nutri/auditoriaCoberturaCatalogo.ts` | Matriz, avaliação via V2, consolidação, sugestões |
| `lib/nutri/catalogoOpcao01Snapshot.ts` | Snapshot congelado dos IDs/macros de produção |
| `lib/nutri/auditoriaCoberturaCatalogo.spec.ts` | Testes |
| `scripts/auditar-catalogo-nutri.ts` | Gera JSON + Markdown |
| `artifacts/nutri/auditoria-catalogo-v1.json` | Saída JSON |
| `docs/nutri/AUDITORIA_COBERTURA_CATALOGO_V1.md` | Relatório |

## 3. Motor

Toda montagem usa `montarPratoPadraoRefeicaoV2`. Sem simulador paralelo.

## 4. Custo / batches

| Modo | Conteúdo |
|------|----------|
| `completo` | Metas×estilos×restrições + preferências×metas representativas → **8920** cenários |
| `amostra` | Matriz reduzida para CI |
| `teste` | Cobertura mínima de eixos |

Não há geração aleatória, IA ou rede.

## 5. Critério de atendimento

Proteína ±10% **e** calorias ±10% **e** sem `SEM_COMBINACAO_VALIDA`.

Classificação (`LIMITES_CLASSIFICACAO_COBERTURA_V1`): excelente ≥90% · boa 75–89% · limitada 50–74% · insuficiente &lt;50%.

## 6. Resultado V1 (completo)

Ver `AUDITORIA_COBERTURA_CATALOGO_V1.md`.

- Cobertura geral: **47,5%** → **insuficiente**
- Lanches e vegano são os maiores buracos
- Café é o segmento mais forte (~82%)

## 7. O que não foi feito

- Nenhum alimento cadastrado
- Motor V2 / Opção 01 / NutriContent de montagem não alterados (exceto uso read-only do snapshot)
- Sem persistência Firestore
- Sem painel em produção

## 8. Como reexecutar

```bash
npx vite-node --config vitest.config.ts scripts/auditar-catalogo-nutri.ts
# ou amostra:
npx vite-node --config vitest.config.ts scripts/auditar-catalogo-nutri.ts --amostra
```

## 9. Próximo passo

ETAPA 11 — expansão priorizada do catálogo com validação nutricional dos itens de prioridade alta.

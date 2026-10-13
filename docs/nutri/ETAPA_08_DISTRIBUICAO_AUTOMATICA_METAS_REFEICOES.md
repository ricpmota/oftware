# ETAPA 8 — Distribuição automática das metas entre refeições

## 1. Autonomia e Opção 01

A Oftware gera autonomamente a **Opção 01** (padrão). Não há aprovação profissional obrigatória.

| Slot | Papel |
|------|--------|
| **Opção 01** | Padrão automático |
| **Opções 02–05** | Alternativas personalizadas |

Nesta etapa a distribuição é calculada **em paralelo** — ainda **não** altera alimentos da Opção 01.

## 2. Entrada

`calcularDistribuicaoMetasRefeicoes(ContextoDistribuicaoRefeicoes)`:

- `estrategiaEnergetica` (meta aplicada da ETAPA 7)
- `proteinaDiariaG` (atual do plano / wizard)
- campos de anamnese (refeições, horário, fomes, GI, atividade, objetivo…)

## 3–4. Distribuições padrão V1

Calórica e proteica (padrão): café 20% · lanche1 10% · almoço 30% · lanche2 15% · jantar 25%.

## 5. Regras comportamentais / clínicas (uma tabela principal)

Prioridade:

```text
GI grave → compulsão noturna → muita fome no jantar → pula café → fome matinal ≥7 → padrão
```

| Condição | Tabela (resumo) |
|----------|-----------------|
| GI grave | 18/15/27/18/22 |
| Compulsão | 20/10/30/20/20 |
| Fome jantar | 18/10/32/18/22 |
| Pula café | 12/18/30/15/25 |
| Fome matinal | 25/10/30/12/23 |

Sinais clínicos adicionais são registrados; só uma tabela define os %.

## 6. Outros ajustes

- GI moderado: alerta de preparações digestivas (sem mudar %)
- Trabalho noturno/turnos: `DISTRIBUICAO_DEVE_SEGUIR_HORARIO_ACORDADO` (sem inverter refeições)
- `2-3` / `>5` refeições: alertas; plano permanece com **5** refeições
- Recomposição ou `5-7x`: distribuição proteica 20/12/28/15/25

## 7. Arredondamento

- Calorias → múltiplos de 5; residual no **almoço**
- Proteína → `Math.round(proteinaDiariaG)` diária, depois inteiros por refeição; residual no **almoço**
- Somas finais = metas diárias

## 8. Validações

Indisponível se estratégia indisponível, meta inválida ou proteína inválida. Sem fallback 400/250/550…

Alertas se refeição &lt;100 ou &gt;800 kcal. `requer_revisao` da estratégia **não** bloqueia.

## 9. Painel

Tabela admin (% kcal, kcal, % prot, g) + ajustes. Texto: distribuição ainda não alterou Opção 01.

## 10. Persistência

Não grava no Firestore.

## 11. Não alterados

`caloriasSugerida_kcal`, `distribuicaoProteina` legada, `montarPratoPadraoRefeicao`, meal builder, check-in.

## 12. Arquivos

| Arquivo | Ação |
|---------|------|
| `lib/nutri/distribuicaoMetasRefeicoes.ts` | criado |
| `lib/nutri/distribuicaoMetasRefeicoes.spec.ts` | criado |
| `components/NutriContent.tsx` | paralelo + painel |
| `docs/nutri/ETAPA_08_DISTRIBUICAO_AUTOMATICA_METAS_REFEICOES.md` | este doc |

# ETAPA 6 — Estimativa do Gasto Energético Total

## 1. Objetivo

Calcular o **GET estimado**:

```text
TMB estimada × fator de atividade estimado = GET estimado
```

Separado da meta alimentar. Sem déficit, intensidade aplicada ou calorias por refeição.

## 2. TMB × GET

| Conceito | Papel |
|----------|--------|
| **TMB estimada** | Energia em repouso (ETAPA 5) |
| **GET estimado** | Estimativa de manutenção com atividade declarada (esta etapa) |
| Meta alimentar | Não implementada |

## 3. Entradas

```ts
calcularEstimativaGet(
  tmb: EstimativaTaxaMetabolicaBasal,
  atividade: ContextoAtividadeEnergetica
)
```

`ContextoAtividadeEnergetica`: `atividadeFisicaDeclarada`, `horasSentado` (ou `null`).

Não recebe paciente bruto, medicação, intensidade desejada ou cardápio.

## 4. Classificação

| Frequência | Nível base |
|------------|------------|
| `nunca` | sedentário |
| `1-2x` | levemente ativo |
| `3-4x` | moderadamente ativo |
| `5-7x` | muito ativo (se horas ≠ `>8h`) |
| `null` | **indisponível** (não presume sedentarismo) |

## 5. Fatores (`FATORES_ATIVIDADE_GET_V1`)

| Nível | Fator |
|-------|-------|
| sedentario | 1,2 |
| levemente_ativo | 1,35 |
| moderadamente_ativo | 1,5 |
| muito_ativo | 1,7 |

**Fatores iniciais de estimativa** — aproximações operacionais. Sem fator 1,9 nesta versão.

> Os fatores são aproximações operacionais iniciais devido à ausência de duração, intensidade, MET, passos e dados objetivos de execução.

## 6. Ajustes por horas sentado

- **A** `nunca` → sempre sedentário  
- **B** `1-2x` + `>8h` → permanece levemente ativo, confiança baixa  
- **C** `3-4x` + `>8h` → rebaixa para levemente ativo  
- **D** `5-7x` + `>8h` → rebaixa para moderadamente ativo  
- **E** `<4h` não eleva nível  
- **F** horas ausentes → mantém frequência, confiança baixa + alerta  

## 7. Confiança

Só `baixa` ou `moderada` — **nunca alta**.

- Moderada: atividade + horas preenchidas, sem rebaixamento, e não é `5-7x`  
- Baixa: horas ausentes, rebaixamento, `5-7x`, ou incerteza relevante  

## 8. Alertas

`ATIVIDADE_FISICA_INDISPONIVEL` · `HORAS_SENTADO_INDISPONIVEL` · `DURACAO_EXERCICIO_NAO_INFORMADA` · `INTENSIDADE_EXERCICIO_NAO_INFORMADA` · `NIVEL_REBAIXADO_POR_SEDENTARISMO_OCUPACIONAL` · `ATIVIDADE_ALTA_SEM_CONFIRMAR_EXECUCAO`

## 9. Motivos de indisponibilidade

`TMB_INDISPONIVEL` · `ATIVIDADE_FISICA_INDISPONIVEL` · `FATOR_ATIVIDADE_INDISPONIVEL` · `RESULTADO_INVALIDO`

## 10. Fórmula

```ts
getEstimadoKcalDia = Math.round(tmbEstimativaKcalDia * fatorAtividade)
```

Sem TEA extra; sem recalcular TMB.

## 11. Exemplos confirmados pelos testes

| Caso | GET estimado |
|------|----------------|
| 1500 × 1,2 (nunca) | **1800** |
| 1500 × 1,35 (1-2x) | **2025** |
| 1600 × 1,5 (3-4x) | **2400** |
| 1600 × 1,35 (3-4x + >8h) | **2160** |
| 1800 × 1,7 (5-7x) | **3060** |

## 12. Snapshots V1/V2

`atividadeFisica` e `horasSentado` existem em V1 e V2. Sem snapshot V3. Intensidade desejada não interfere. Plano sem snapshot → GET indisponível.

## 13. Painel administrativo

Somente `modoNutricionista`: GET estimado, nível, fator, confiança; motivos se indisponível. Texto: *O GET é uma estimativa de manutenção baseada na atividade declarada. Ainda não é a meta alimentar do paciente.*

## 14. Persistência

Não grava GET no Firestore. Runtime a partir de TMB + anamnese.

## 15. Itens não alterados

Proteína, água, kcal fixas do plano, Opção 01, `montarPratoPadraoRefeicao`, check-in, intensidade, TMB (mesma equação), cardápio.

## 16. Testes

`lib/nutri/estimativaGastoEnergetico.spec.ts` + regressão ETAPAS 1–5.

## 17. Limitações

Sem duração/intensidade/wearable/MET; `5-7x` não é atleta; confiança nunca alta; sem ajuste por GLP-1.

## 18. Arquivos

| Arquivo | Ação |
|---------|------|
| `lib/nutri/estimativaGastoEnergetico.ts` | criado |
| `lib/nutri/estimativaGastoEnergetico.spec.ts` | criado |
| `components/NutriContent.tsx` | integração + painel |
| `docs/nutri/ETAPA_06_ESTIMATIVA_GASTO_ENERGETICO_TOTAL.md` | este doc |

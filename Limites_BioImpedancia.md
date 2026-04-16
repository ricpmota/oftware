# Limites de Referência - Bio Impedância

> **Nota:** Este arquivo documenta os limites usados pelo sistema. Os valores efetivos estão em `data/limites_bioimpedancia.json`.
> Atualize o JSON conforme os parâmetros do seu equipamento InBody ou tabela de referência.

## Composição Corporal

| Campo | Label | Unidade | Min | Max | Observação |
|-------|-------|---------|-----|-----|------------|
| aguaTotalLitros | Água Total | L | 0 | 80 | ~50-65% do peso |
| proteinasKg | Proteínas | kg | 0 | 50 | ~12-18% do peso |
| mineraisKg | Minerais | kg | 0 | 15 | ~3-5% do peso |
| massaGorduraKg | Massa de Gordura | kg | 0 | 150 | - |

## Análise Músculo-Gordura

| Campo | Label | Unidade | Min | Max |
|-------|-------|---------|-----|-----|
| massaMuscularKg | Massa Muscular | kg | 0 | 120 |
| massaGorduraKg | Massa de Gordura | kg | 0 | 150 |

## Análise de Obesidade - PGC (%)

| Sexo | Min | Max | Ideal |
|------|-----|-----|-------|
| M | 10 | 20 | 10-20% |
| F | 20 | 30 | 20-30% |

## Massa Magra Segmentar

> Faixas de referência usadas para colorir os valores no body map: **preto** = dentro do intervalo, **vermelho** = acima, **azul** = abaixo.

| Segmento | Label | Unidade | Min (ideal) | Max (ideal) |
|----------|-------|---------|-------------|-------------|
| arm_r | Braço Direito | kg | 1.5 | 6 |
| arm_l | Braço Esquerdo | kg | 1.5 | 6 |
| trunk | Tronco | kg | 18 | 38 |
| leg_r | Perna Direita | kg | 6 | 16 |
| leg_l | Perna Esquerda | kg | 6 | 16 |

## Gordura Segmentar

| Segmento | Label | Unidade | Min (ideal) | Max (ideal) |
|----------|-------|---------|-------------|-------------|
| gordura_arm_r | Braço Direito | kg | 0.5 | 4 |
| gordura_arm_l | Braço Esquerdo | kg | 0.5 | 4 |
| gordura_trunk | Tronco | kg | 6 | 25 |
| gordura_leg_r | Perna Direita | kg | 2 | 10 |
| gordura_leg_l | Perna Esquerda | kg | 2 | 10 |

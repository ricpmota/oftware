# Limites de Referência - Bio Impedância (Atualizado)

> **Nota:** Este arquivo documenta os limites usados pelo sistema. Os valores efetivos estão em `data/limites_bioimpedancia.json`.
> As barras de referência exibem **3 zonas**: Abaixo (azul), Normal (verde), Acima (vermelho).

## Composição Corporal

Fórmulas baseadas em **percentual do peso** (usam peso do paciente):

| Campo | Label | Unidade | Fórmula (Normal) | Escala Barra |
|-------|-------|---------|------------------|--------------|
| aguaTotalLitros | Água Total | L | 45–65% do peso | 0–80 L |
| proteinasKg | Proteínas | kg | 12–18% do peso | 0–50 kg |
| mineraisKg | Minerais | kg | 3–5% do peso | 0–15 kg |
| massaGorduraKg | Massa de Gordura | kg | min/max direto | 0–150 kg |

## Análise Músculo-Gordura

| Campo | Label | Unidade | Fórmula (Normal) | Escala Barra |
|-------|-------|---------|------------------|--------------|
| massaMuscularKg | Massa Muscular | kg | 35–45% do peso | 0–120 kg |
| massaGorduraKg | Massa de Gordura | kg | M: 10–20% do peso, F: 20–30% do peso | 0–150 kg |

## Análise de Obesidade - PGC (%)

| Sexo | Abaixo | Normal | Acima | Escala Barra |
|------|--------|--------|-------|--------------|
| M | &lt; 10% | 10–20% | &gt; 20% | 0–50% |
| F | &lt; 20% | 20–30% | &gt; 30% | 0–50% |

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

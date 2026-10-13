# ETAPA 5 — Estimativa da Taxa Metabólica Basal

## 1. Objetivo

Estimar a **TMB estimada** (energia em repouso) a partir de `DadosEnergeticosPaciente` (ETAPA 4), usando Mifflin–St Jeor.

Não calcula GET, fator de atividade, déficit nem meta alimentar.

## 2. Equação

Única equação: `mifflin_st_jeor`.

## 3. Entradas

Somente de `DadosEnergeticosPaciente`:

| Entrada | Uso |
|---------|-----|
| `peso.pesoKg` | peso atual validado |
| `alturaCm` | cm |
| `idadeAnos` | anos completos (truncados se necessário) |
| `sexoBiologico` | `masculino` \| `feminino` |
| `aptoParaEstimativaEnergetica` | gate obrigatório |

**Não entram:** IMC, atividade, intensidade desejada, dose de Tirzepatida, peso ideal/ajustado, massa magra, cardápio.

## 4. Fórmulas

### Masculino

```text
10 × pesoKg + 6,25 × alturaCm − 5 × idadeAnos + 5
```

### Feminino

```text
10 × pesoKg + 6,25 × alturaCm − 5 × idadeAnos − 161
```

## 5. Validações

Além de `aptoParaEstimativaEnergetica === true`:

- peso finito 20–400 kg  
- altura finita 120–230 cm  
- idade 18–100  
- sexo `masculino` ou `feminino`  

Resultado: finito e **> 0**. Sem piso/teto clínico arbitrário.

## 6. Arredondamento

Cálculo interno com decimais das entradas; `tmbEstimativaKcalDia = Math.round(resultado)`. Entradas **não** são arredondadas antes.

## 7. Bloqueios

Se inapto (gestação, lactação, sexo Outro, dados ausentes, etc.), `status: 'indisponivel'`, `tmbEstimativaKcalDia: null`, motivos incluindo `DADOS_ENERGETICOS_INAPTOS` e motivos específicos quando aplicáveis. Sem cálculo parcial; sem `ignorarBloqueios`.

## 8. TMB × GET × meta

| Conceito | Esta etapa |
|----------|------------|
| **TMB estimada** | energia em repouso (estimada) |
| GET | não implementado |
| Meta alimentar | não implementada |

A TMB **não** é a meta de ingestão.

## 9. Painel administrativo

Em Plano Nutri, somente `modoNutricionista`:

- `TMB estimada: X kcal/dia` + `Equação: Mifflin–St Jeor` quando calculada  
- `TMB estimada: indisponível` + bloqueios ETAPA 4 quando inapto  
- Texto: *Estimativa em repouso. Ainda não corresponde ao gasto energético total nem à meta alimentar.*

Paciente sem `modoNutricionista` não vê o painel.

## 10. Persistência

**Não** grava TMB no Firestore. Recalcula em runtime. Persistência versionada fica para bloco futuro de estratégia energética.

## 11. Itens não alterados

Proteína, água, estilo, cardápio, Opção 01, macros, check-in, anamnese, intensidade, `obterPesoAtual` legado.

## 12. Testes

`lib/nutri/estimativaMetabolica.spec.ts` — fórmula, entradas inválidas, bloqueios, separação de responsabilidades, imutabilidade.

Regressão: `dadosEnergeticosPaciente.spec.ts`, `anamneseNutricional.spec.ts`.

## 13. Exemplos confirmados pelos testes

| Perfil | Entradas | Bruto | Exposto |
|--------|----------|-------|---------|
| Masculino | 100 kg, 180 cm, 40 a | 1930 | **1930** |
| Feminino | 70 kg, 165 cm, 35 a | 1395,25 | **1395** |

## 14. Limitações

- Estimativa populacional; não substitui calorimetria.  
- Não ajusta por composição corporal, GLP-1 ou atividade.  
- Sexo `Outro` permanece indisponível (equação binária).  
- Pediátrico / gestante / lactante fora do motor padrão.

## 15. Arquivos

| Arquivo | Ação |
|---------|------|
| `lib/nutri/estimativaMetabolica.ts` | criado |
| `lib/nutri/estimativaMetabolica.spec.ts` | criado |
| `components/NutriContent.tsx` | painel + chamada runtime |
| `docs/nutri/ETAPA_05_ESTIMATIVA_TAXA_METABOLICA_BASAL.md` | este doc |

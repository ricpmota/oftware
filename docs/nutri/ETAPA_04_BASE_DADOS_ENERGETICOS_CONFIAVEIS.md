# ETAPA 4 — Base confiável de dados energéticos

## 1. Problema resolvido

A ETAPA 3 mostrou que peso, altura, sexo, idade e riscos já existem no paciente, mas o Nutri usava `obterPesoAtual()` (último índice da evolução + fallback silencioso **70 kg**) e o IMC das medidas iniciais (potencialmente desatualizado). Antes de TMB/GET/déficit, era necessário uma camada **pura, determinística e auditável** que extrai e valida os dados reais — sem inventar valores.

## 2. Fontes de cada dado

| Dado | Fonte | Notas |
|------|--------|--------|
| Peso | `evolucaoSeguimento[].peso` → fallback `dadosClinicos.medidasIniciais.peso` | Nunca 70 kg |
| Data do peso | `SeguimentoSemanal.dataRegistro` | Único campo de data tipado na evolução |
| Altura | `dadosClinicos.medidasIniciais.altura` | 120–230 cm |
| Idade | `dadosIdentificacao.dataNascimento` | Via `parseDataNascimentoDiaMesLocal` |
| Sexo | `dadosIdentificacao.sexoBiologico` | Só `M`/`F` → masculino/feminino |
| Atividade | argumento `opcoes.atividadeFisicaDeclarada` (ex.: anamnese Nutri) | Sem fallback para `estiloVida` |
| Gestação / lactação | `dadosClinicos.riscos.gestacao` / `.lactacao` | Bloqueio só se `'sim'` |
| IMC atual | recalculado peso÷altura² | **Não** usa `medidasIniciais.imc` |

Módulo: `lib/nutri/dadosEnergeticosPaciente.ts` (não lê Firestore).

## 3. Algoritmo de seleção do peso

1. Percorrer todos os itens de `evolucaoSeguimento`.
2. Aceitar peso finito, > 0 e na faixa técnica **20–400 kg**.
3. Parsear `dataRegistro` (Date, Timestamp Firestore, `YYYY-MM-DD` local, ISO).
4. Se houver ao menos um peso **com data válida**: ordenar por data desc; empate → maior índice original; marcar `confiavel: true`, `origem: 'evolucao'`.
5. Se houver pesos válidos **sem nenhuma data**: usar o de maior índice; `confiavel: false`; alertas `PESO_SEM_DATA` + `PESO_EVOLUCAO_SEM_ORDEM_CONFIRMADA`.
6. Senão, medida inicial válida → `origem: 'medida_inicial'`, `confiavel: true`, alerta `PESO_SEM_DATA`.
7. Senão → `origem: 'indisponivel'`, `pesoKg: null` (**proibido** retornar 70).

## 4. Interpretação das datas

Campo real tipado: **`dataRegistro`** apenas (não há `data`, `createdAt` ou `timestamp` em `SeguimentoSemanal`).

- `YYYY-MM-DD` → dia civil local.
- Instantes meia-noite UTC (ex. `new Date('2025-06-01')`) → dia civil UTC, para não deslocar para o dia anterior em fusos UTC−.
- Firestore `toDate()` / `{ seconds }` tratados de forma equivalente.

`dataPeso` exportada como `YYYY-MM-DD` (calendário local do `Date` normalizado).

## 5. Limites técnicos

| Grandeza | Faixa |
|----------|--------|
| Peso | 20–400 kg |
| Altura | 120–230 cm |
| Idade apta | 18–100 anos (inclusive) |
| Divergência IMC legado | \|imcAtual − imcLegado\| ≥ **1** ponto → alerta |

## 6. Normalização de sexo

```text
M → masculino
F → feminino
Outro / ausente / inesperado → null
```

- Não inferir por nome.
- Não usar gênero.
- `Outro` → bloqueio `SEXO_NAO_BINARIO_PARA_EQUACAO` (a fórmula futura exige variável binária; **não** é erro do paciente).
- Ausente → `SEXO_INDISPONIVEL`.

## 7. Cálculo de idade

1. `parseDataNascimentoDiaMesLocal` (`utils/dataNascimentoLocal.ts`).
2. Anos completos com dia/mês (mesma regra de `calcularIdade` em `labRangesFromJson`, com `dataReferencia` injetável nos testes).
3. `null` se ausente/inválida/negativa.
4. Idade fora de 18–100 → bloqueio `IDADE_FORA_ESCOPO_ADULTO` (sem alterar cadastro).

## 8. IMC atual versus IMC legado

- Atual: `calcularImcFromPesoAlturaCm` (`lib/meta/medidasIniciaisImc.ts`) com peso energético + altura.
- Legado: `medidasIniciais.imc` só para comparação.
- Diferença ≥ 1 → `IMC_LEGADO_DIVERGENTE`.
- **Não** persiste nem sobrescreve o IMC clínico nesta etapa.

## 9. Bloqueios

`PESO_INDISPONIVEL` · `ALTURA_INDISPONIVEL` · `IDADE_INDISPONIVEL` · `IDADE_FORA_ESCOPO_ADULTO` · `SEXO_INDISPONIVEL` · `SEXO_NAO_BINARIO_PARA_EQUACAO` · `GESTACAO` · `LACTACAO` · `DADOS_INSUFICIENTES` (sempre que houver qualquer outro bloqueio).

Gestação/lactação: bloqueio **somente** se valor estruturado === `'sim'`.

## 10. Alertas

`PESO_SEM_DATA` · `PESO_EVOLUCAO_SEM_ORDEM_CONFIRMADA` · `NASCIMENTO_FORMATO_INVALIDO` · `GESTACAO_DESCONHECIDA` · `LACTACAO_DESCONHECIDA` · `ATIVIDADE_FISICA_NAO_INFORMADA` · `IMC_LEGADO_DIVERGENTE`.

Alertas não impedem aptidão por si sós.

## 11. Regra de aptidão

```ts
aptoParaEstimativaEnergetica = bloqueios.length === 0
```

Exige: peso real válido, altura válida, idade 18–100, sexo M/F normalizado, sem gestação/lactação confirmadas.

Atividade ausente → alerta apenas (necessária para GET futuro, não para TMB).

## 12. Integração realizada

Em `NutriContent.tsx`:

- Import do módulo.
- Em `gerarPlanoNutricional`: `montarDadosEnergeticosPaciente(paciente, { atividadeFisicaDeclarada: wizardData.atividadeFisica })` em variável local tipada — **não** alimenta proteína/kcal/cardápio; sem `console.log` clínico.
- Bloco admin “Dados para cálculo energético futuro” na aba Plano Nutri, **somente** se `modoNutricionista` (pacientes sem a prop não veem).

`obterPesoAtual()` legado **inalterado**.

## 13. Itens não alterados

TMB, GET, déficit, calorias, proteína, água, estilo, cardápio, Opção 01, anamnese, intensidade, bioimpedância, MetaPersonal, persistência energética.

## 14. Testes

`lib/nutri/dadosEnergeticosPaciente.spec.ts` — casos 1–30 (+ regressão de imutabilidade e Outro).

Também: `lib/nutri/anamneseNutricional.spec.ts` (regressão).

## 15. Arquivos

| Arquivo | Ação |
|---------|------|
| `lib/nutri/dadosEnergeticosPaciente.ts` | criado |
| `lib/nutri/dadosEnergeticosPaciente.spec.ts` | criado |
| `components/NutriContent.tsx` | integração mínima + bloco admin |
| `docs/nutri/ETAPA_04_BASE_DADOS_ENERGETICOS_CONFIAVEIS.md` | este doc |

## 16. Limitações

- Não substitui `obterPesoAtual` no fluxo legado (proteína/água ainda podem usar 70 kg).
- Atividade não é lida do Firestore pelo módulo — o caller passa o valor.
- `lactacao` tipado só como `sim` \| `nao` (sem `desconheco`); ausência gera alerta.
- Escopo adulto 18–100; pediátrico/gestante/lactante ficam fora do motor padrão.
- IMC recalculado não é gravado no paciente nesta etapa.

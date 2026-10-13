# ETAPA 2 — Intensidade desejada na anamnese nutricional

## Objetivo da pergunta

Coletar a **preferência de adesão / disponibilidade** do paciente para a intensidade de mudança alimentar que ele acredita conseguir manter.

Não define calorias, déficit, proteína, cardápio, estilo ou Opção 01 nesta etapa.

## Textos exibidos (Passo 1 do wizard)

Pergunta:

```text
Qual intensidade de mudança você acredita conseguir manter neste momento?
```

| Valor | Título | Descrição | Extra |
|-------|--------|-----------|--------|
| `leve` | Leve | Mudanças graduais, maior flexibilidade e adaptação progressiva à nova rotina. | — |
| `moderada` | Moderada | Mudanças mais consistentes, com equilíbrio entre resultado, flexibilidade e adesão. | badge “Mais comum” |
| `intensiva` | Intensiva | Mudanças mais rigorosas, que exigem maior organização, acompanhamento e capacidade de adesão. | — |

Observação abaixo das opções:

```text
A intensidade final poderá ser ajustada pela equipe conforme seu perfil clínico.
```

Default do wizard: `moderada` (`INTENSIDADE_DESEJADA_PADRAO`).

## Tipo

```ts
export type AnamneseIntensidadeDesejada = 'leve' | 'moderada' | 'intensiva';
```

Presente em `WizardData`, `AnamneseWizardInput` e `AnamneseNutricionalSnapshotV2`.

## Localização no wizard

Passo 1, imediatamente após o bloco de objetivo principal. Continua sendo 9 passos (não há passo 10).

## Persistência

`criarSnapshotAnamneseNutricional()` grava:

```ts
versao: 2
intensidadeDesejada: wizard.intensidadeDesejada
```

Path Firestore inalterado: `pacientes_completos/{id}/nutricao/plano.anamneseNutricional`.

## Versionamento

| Versão | Conteúdo |
|--------|----------|
| `1` | Snapshot ETAPA 1 — **sem** `intensidadeDesejada` |
| `2` | Snapshot atual — **com** `intensidadeDesejada` obrigatório |

União tipada:

```ts
AnamneseNutricionalSnapshot = V1 | V2
```

Helpers:

- `isAnamneseSnapshotV2`
- `obterIntensidadeDesejadaDoSnapshot` — retorna `undefined` para v1 / ausente (**não** força `moderada`)

Sem migração automática de v1 → v2.

## Onde aparece na UI

- Wizard Passo 1 (seleção)
- Aba **Plano Nutri** → pasta Hipótese / card Estilo Alimentar: linha `Intensidade desejada: …` **somente** se snapshot v2

Não exibe déficit, meta calórica ou intensidade prescrita.

## Confirmação: não influencia cálculos

`intensidadeDesejada` **não** é lida por:

- `gerarPlanoNutricional` (exceto inclusão no snapshot)
- `calcularValoresSugeridos`
- `converterDistribuicaoProteina`
- `montarPratoPadraoRefeicao`
- `gerarOpcoesRefeicoes`
- `gerarConfiguracaoBuilderPorRefeicao`

## Comportamento ao refazer plano

`iniciarRefazerPlanoNutri` reinicia o wizard com defaults e pré-preenche apenas:

- `restricoesPaciente` / `preferenciasProteinaPaciente`
- `intensidadeDesejada` a partir do snapshot **v2**, se existir; senão `moderada` (default do wizard, não inventado a partir de v1)

Não há recuperação completa dos demais campos do snapshot nesta etapa.

## Testes executados

```bash
npx vitest run lib/nutri/anamneseNutricional.spec.ts
```

Cobertura: persistência leve/moderada/intensiva, versao 2, v1 sem fallback, plano sem snapshot, default `moderada`, regressão restrições/preferências iguais entre intensidades.

## Arquivos alterados

| Arquivo | Ação |
|---------|------|
| `lib/nutri/anamneseNutricional.ts` | V1/V2, intensidade, helpers |
| `lib/nutri/anamneseNutricional.spec.ts` | testes ETAPA 2 |
| `components/NutriContent.tsx` | wizard + exibição + refazer |
| `docs/nutri/ETAPA_02_INTENSIDADE_DESEJADA_ANAMNESE.md` | este doc |
| `docs/nutri/ETAPA_01_PERSISTENCIA_ANAMNESE_NUTRICIONAL.md` | nota de versão 2 |

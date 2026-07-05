# Etapa 2 OI — Primeira Base Estatística

**Objetivo:** gerar a **primeira base estatística real** da OI (Oftware Intelligence) a partir dos dados já existentes no Firestore, **sem expor PII** e **sem alterar produção**.

> Script **administrativo/offline**. Não há rota pública, não altera UI nem Firestore, não consome IA.

**Documentos relacionados:**

- [03_MAPEAMENTO_FIRESTORE_OI.md](./03_MAPEAMENTO_FIRESTORE_OI.md) — mapeamento das fontes
- [00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md](./00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md) — visão da OI
- [base_dados_perda_peso.md](../precificacao/base_dados_perda_peso.md) — spec dos campos anonimizados
- [02_ORCAMENTO_TERAPEUTICO_METAADMIN.md](./02_ORCAMENTO_TERAPEUTICO_METAADMIN.md) — consumidor futuro dos benchmarks

---

## O que o script faz

1. Lê **`pacientes_completos`** (coleção principal).
2. Lê **`pacientes_abandono`** e inclui pacientes **ausentes** em `pacientes_completos` (deduplica por ID; prioriza `pacientes_completos`).
3. Normaliza cada documento com a mesma lógica de `normalizePacienteFirestoreData` (`lib/oi/normalizePacienteFirestore.ts`).
4. Gera **`pacienteAnonId`** irreversível (HMAC-SHA256 + salt).
5. Calcula métricas clínicas anonimizadas por paciente.
6. Agrupa **benchmarks** por faixa de **meta cadastrada** (`metaPercentual`).
7. Grava JSON em `tmp/oi/` — **somente leitura** no Firestore.

A **tabela V2 fixa** do Orçamento Terapêutico **não** é fonte de verdade. Os benchmarks desta etapa vêm de **médias reais** da base exportada.

---

## Como executar

### Pré-requisitos

- Node.js 20+
- Credenciais **Firebase Admin** (mesmas variáveis usadas pelas rotas server)
- **`OI_ANON_SALT`** — string secreta (mín. 16 caracteres) para pseudonimização; **não commitar**

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `FIREBASE_CLIENT_EMAIL` ou `FIREBASE_ADMIN_CLIENT_EMAIL` | Sim | Service account |
| `FIREBASE_PRIVATE_KEY` ou `FIREBASE_ADMIN_PRIVATE_KEY` | Sim | Chave privada (com `\n` escapado se necessário) |
| `FIREBASE_PROJECT_ID` ou `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Não | Default: `oftware-9201e` |
| `OI_ANON_SALT` | Sim | Salt para `pacienteAnonId` |

### Comando

Na raiz do repositório:

```bash
# Carregar env (ex.: .env.local) conforme seu ambiente
export OI_ANON_SALT="seu-salt-secreto-min-16-chars"

npx tsx scripts/oi/exportWeightLossStats.ts
```

No PowerShell (Windows):

```powershell
$env:OI_ANON_SALT = "seu-salt-secreto-min-16-chars"
npx tsx scripts/oi/exportWeightLossStats.ts
```

> **Segurança:** executar apenas em ambiente autorizado. Não commitar `tmp/oi/` nem compartilhar os JSON gerados publicamente.

---

## Arquivos gerados

| Arquivo | Conteúdo |
|---------|----------|
| `tmp/oi/pacientes_tratamento_consolidado.json` | Um registro anonimizado por paciente elegível + metadados da exportação |
| `tmp/oi/weight_loss_benchmarks.json` | Benchmarks agregados por faixa de meta |

### Estrutura do consolidado

```json
{
  "meta": {
    "geradoEm": "2026-06-29T...",
    "versao": "1.0.0",
    "totalRegistros": 123,
    "criteriosElegibilidade": ["..."],
    "regraBaselinePeso": "...",
    "regraPesoAtual": "..."
  },
  "pacientes": [ { "pacienteAnonId": "oi_...", ... } ]
}
```

### Estrutura dos benchmarks

```json
{
  "meta": { "minSampleSize": 30, "agrupamento": "faixa de meta cadastrada (metaPercentual)" },
  "faixas": {
    "ate_5": { "n": 12, "dadosInsuficientes": true, "perdaKgMedia": 3.2, ... },
    "5_a_10": { ... },
    "10_a_15": { ... },
    "15_a_20": { ... },
    "acima_20": { ... }
  }
}
```

---

## Regras de anonimização

### Nunca exportado

- Nome, CPF, e-mail, telefone, endereço
- UID Firebase, ID real do documento, tokens, links
- Texto livre de observações clínicas
- Data de nascimento exata (apenas **idade** ou **faixa etária**)

### `pacienteAnonId`

- Formato: `oi_` + 32 hex chars
- Algoritmo: `HMAC-SHA256(OI_ANON_SALT, docId)`
- **Irreversível** sem o salt (que não deve ser armazenado junto aos JSON)

### Logs do script

Apenas contagens agregadas — **sem nomes, e-mails ou IDs reais**.

---

## Critérios de elegibilidade

Um paciente entra no consolidado se **todas** as condições forem verdadeiras:

| Critério | Motivo de exclusão |
|----------|-------------------|
| `evolucaoSeguimento.length >= 1` | Ignorado — sem evolução |
| `pesoInicialKg > 0` | Ignorado — sem peso |
| `quantidadeTotalMgUtilizada > 0` **ou** `numeroAplicacoes > 0` | Ignorado — sem dose/mg |

Pacientes lidos mas excluídos entram nas estatísticas de log (`ignoradoSemPeso`, etc.).

---

## Campos calculados (por paciente)

| Campo | Regra |
|-------|--------|
| `pesoInicialKg` | Semana 1 → medidas iniciais → marco zero |
| `pesoAtualKg` | Último peso em `evolucaoSeguimento` (por `dataRegistro`) |
| `metaKg` / `metaPercentual` | `planoTerapeutico.metas` (mesma lógica do orçamento, sem tabela V2) |
| `medicamento` | Inferido como `tirzepatida` se houver dose registrada |
| `quantidadeTotalMgUtilizada` | Soma de `doseAplicada.quantidade` (aplicações não perdidas) |
| `numeroAplicacoes` | Registros com adesão válida |
| `tempoTratamentoSemanas` | Dias entre primeira e última data em evolução / plano, ÷ 7 |
| `motivoEncerramento` | Categorias agregadas (`em_andamento`, `conclusao`, `efeito_adverso`, …) |
| `atingiu5` … `atingiu20` | Flags sobre `percentualPesoPerdido` |
| `faixaMeta` | Bucket da meta cadastrada: `ate_5`, `5_a_10`, `10_a_15`, `15_a_20`, `acima_20` |

---

## Benchmarks por faixa

Agrupamento pela **meta percentual cadastrada** (`metaPercentual`), alinhado às faixas do Orçamento V2 — mas os **valores numéricos** vêm da base real, não da tabela fixa.

Por faixa:

| Métrica | Descrição |
|---------|-----------|
| `n` | Pacientes na faixa |
| `dadosInsuficientes` | `true` se `n < 30` |
| `perdaKgMedia`, `perdaPercentualMedia` | Médias de desfecho |
| `mgMedio`, `semanasMedia`, `aplicacoesMedia` | Consumo e duração médios |
| `taxaAtingiuMeta` | Proporção que atingiu a meta cadastrada |
| `p25Mg` … `p90Mg` | Percentis de mg total |
| `p25Semanas` … `p75Semanas` | Percentis de semanas |

**Regra de confiança:** faixas com `dadosInsuficientes: true` **não** devem alimentar estimativas confiáveis até `n >= 30`.

---

## Limites da primeira versão (v1.0.0)

| Limitação | Impacto |
|-----------|---------|
| Medicamento inferido como tirzepatida | Sem segmentação por fármaco real |
| Sem `historico_semanal.json` separado | Apenas consolidado por paciente |
| Sem bioimpedância / exames lab no export | Fase futura de segmentação avançada |
| Sem join financeiro | Motor comercial OI fase posterior |
| Meta ausente → `faixaMeta: null` | Paciente no consolidado, fora dos buckets de benchmark |
| Baseline único documentado | Pode divergir de casos legados atípicos |
| Exportação full-scan | Executar offline, com moderação de frequência |

---

## Como alimentar o Orçamento Terapêutico (futuro)

1. **Rotina administrativa** (cron ou job manual) executa `exportWeightLossStats.ts` periodicamente.
2. **`weight_loss_benchmarks.json`** é versionado internamente (ex.: `data/oi/benchmarks/v2026-06.json`).
3. **`calcularEstimativaPlanoInicialV2`** passa a ler benchmarks OI quando `dadosInsuficientes === false` na faixa da meta do paciente.
4. UI do Orçamento exibe **n**, percentis e disclaimer de confiança (princípios OI).
5. Enquanto `n < 30`, manter **fallback** determinístico atual (tabela V2 provisória).

Fluxo alvo:

```
Firestore (leitura) → script OI → benchmarks JSON → Orçamento Terapêutico (estimativa + explicabilidade)
```

---

## Código relacionado

| Artefato | Caminho |
|----------|---------|
| Script principal | `scripts/oi/exportWeightLossStats.ts` |
| Normalização Firestore | `lib/oi/normalizePacienteFirestore.ts` |
| Cálculos e benchmarks | `lib/oi/weightLossExport.ts` |
| Referência peso/meta (app) | `lib/metaadmin/orcamentoTerapeuticoUtils.ts` |

---

## Critérios de aceite desta etapa

- [x] Script compila e executa com credenciais válidas
- [x] Somente leitura Firestore — sem writes
- [x] Consolidado anonimizado em `tmp/oi/pacientes_tratamento_consolidado.json`
- [x] Benchmarks por faixa em `tmp/oi/weight_loss_benchmarks.json`
- [x] `dadosInsuficientes: true` quando `n < 30`
- [x] Sem PII nos arquivos e logs seguros
- [x] Documentação desta etapa

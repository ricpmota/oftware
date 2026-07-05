# Etapa 3 OI — OI Core (OIService)

**Objetivo:** criar o **primeiro serviço central** da OI — o cérebro estatístico que recebe `PacienteCompleto` e devolve `OIAnalysis`, **sem alterar telas, APIs, Firestore ou Orçamento Terapêutico**.

> Nesta etapa nenhuma interface consome o serviço. Apenas a camada de domínio OI.

**Documentos relacionados:**

- [04_PRIMEIRA_BASE_ESTATISTICA_OI.md](./04_PRIMEIRA_BASE_ESTATISTICA_OI.md) — exportação offline
- [00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md](./00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md) — arquitetura OI

---

## Arquitetura

```
PacienteCompleto
       │
       ▼
┌──────────────────┐
│   OIService      │  ← único ponto de entrada para telas/APIs futuras
│ analisarPaciente │
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
OIHelpers   OIBenchmarkRepository
(puro)      (JSON offline — interno)
    │         │
    └────┬────┘
         ▼
    OIAnalysis
```

| Camada | Arquivo | Responsabilidade |
|--------|---------|------------------|
| **Tipos** | `types/oi.ts` | `OIAnalysis`, enums de faixa, confiabilidade |
| **Versão** | `lib/oi/OIVersion.ts` | `OI_MODEL_VERSION` |
| **Helpers** | `lib/oi/OIHelpers.ts` | Funções puras: faixas, intervalos, perfil |
| **Benchmarks** | `lib/oi/OIBenchmarkRepository.ts` | Leitura JSON — **somente OIService importa** |
| **Serviço** | `lib/oi/OIService.ts` | Orquestração → `OIAnalysis` |

---

## Responsabilidades

### OIService

- Receber `PacienteCompleto`
- Extrair perfil clínico (peso, IMC, idade, sexo, meta)
- Determinar faixas de segmentação
- Consultar benchmark da faixa de meta
- Calcular intervalos (nunca valor único isolado)
- Retornar `OIAnalysis` com versão do modelo e observações

### OIHelpers

Funções puras, testáveis, **sem I/O**:

| Função | Papel |
|--------|--------|
| `extrairPerfilPaciente()` | PacienteCompleto → `OIPerfilPaciente` |
| `determinarFaixaIMC()` | Segmentação IMC |
| `determinarFaixaPeso()` | Segmentação peso inicial |
| `determinarFaixaMeta()` | Segmentação meta % |
| `determinarFaixaEtaria()` | Segmentação idade |
| `calcularConfiabilidade()` | n → baixa / média / alta / muito alta |
| `estimarIntervalo()` | Percentis → estimado + min + max |
| `estimarIntervaloAplicacoes()` | Aplicações a partir de semanas |

### OIBenchmarkRepository (interno)

- Carrega `weight_loss_benchmarks.json`
- Ordem de busca:
  1. `OI_BENCHMARKS_PATH` (env)
  2. `tmp/oi/weight_loss_benchmarks.json` (exportação Etapa 2)
  3. `data/oi/weight_loss_benchmarks.fallback.json` (placeholder vazio)

**Regra:** componentes React e rotas **não** importam este módulo.

---

## Fluxo `analisarPaciente()`

```
1. extrairPerfilPaciente(paciente)
2. faixaMeta → chave benchmark (ex.: 5_a_10)
3. carregarBenchmarks() — somente leitura de arquivo
4. obterBenchmarkPorFaixa(chave)
5. calcularConfiabilidade(benchmark.n, benchmark.dadosInsuficientes)
6. estimarIntervalo(mg), estimarIntervalo(semanas), estimarIntervalo(aplicações)
7. montar OIAnalysis + observacoes
```

---

## Interface `OIAnalysis`

Campos principais (ver `types/oi.ts`):

| Campo | Descrição |
|-------|-----------|
| `versaoModelo` | Ex.: `0.1.0` — auditabilidade |
| `pacientesSemelhantes` | n do benchmark da faixa |
| `confiabilidade` | `baixa` \| `media` \| `alta` \| `muito_alta` |
| `faixaMeta`, `faixaIMC`, `faixaPeso`, `faixaEtaria` | Segmentação aplicada |
| `mgEstimado`, `mgMinimo`, `mgMaximo` | Intervalo de mg total |
| `tempoEstimadoSemanas`, `tempoMinimoSemanas`, `tempoMaximoSemanas` | Duração |
| `aplicacoesEstimadas`, `aplicacoesMinimas`, `aplicacoesMaximas` | Aplicações |
| `perdaMediaKg`, `perdaMediaPercentual` | Desfecho médio do grupo |
| `probabilidadeAtingirMeta` | `taxaAtingiuMeta` do benchmark |
| `benchmarkUtilizado` | Rastreio da fonte estatística |
| `observacoes` | Disclaimers e limitações |

---

## Confiabilidade (v0.1.0)

Regra isolada em `OIHelpers` (`OI_CONFIABILIDADE_LIMITES`):

| n | Confiabilidade |
|---|----------------|
| &lt; 30 ou `dadosInsuficientes` | **baixa** |
| 30 – 99 | **média** |
| 100 – 500 | **alta** |
| &gt; 500 | **muito alta** |

Substituível no futuro sem alterar consumidores.

---

## Versionamento

- **`OI_MODEL_VERSION`** em `lib/oi/OIVersion.ts` — incrementar quando:
  - Regras de faixa mudarem
  - Formato de benchmark mudar
  - Algoritmo de intervalo mudar

- Toda `OIAnalysis` inclui `versaoModelo` para auditoria.

---

## Uso programático (futuro)

```typescript
import { analisarPaciente } from '@/lib/oi/OIService';
import type { OIAnalysis } from '@/types/oi';

// Apenas server-side ou jobs — benchmarks usam fs
const analysis: OIAnalysis = analisarPaciente(paciente);
```

> **Nota:** `OIBenchmarkRepository` usa `fs` — adequado para API routes, scripts e SSR. Não importar em Client Components.

---

## O que esta etapa NÃO faz

- Não altera Orçamento Terapêutico, Controle Financeiro, Chat
- Não conecta ao botão "Orçamento"
- Não escreve no Firestore
- Não consome IA / ML / APIs externas
- Não segmenta benchmarks por IMC/peso/idade (v0.1.0 usa apenas **faixa de meta**; demais faixas são contexto na resposta)

---

## Próxima etapa (futura)

1. Conectar `OIService` ao Orçamento Terapêutico quando `confiabilidade !== baixa`
2. Segmentação multidimensional (IMC + meta + sexo)
3. Rotina de refresh de benchmarks
4. Explicabilidade em linguagem natural (camada opcional, não cálculo)

---

## Critérios de aceite

- [x] `OIService` + `analisarPaciente()`
- [x] `OIHelpers` separado (funções puras)
- [x] `types/oi.ts`
- [x] `OIVersion.ts`
- [x] Benchmarks isolados em repositório interno
- [x] Nenhuma tela/API alterada
- [x] Sem IA
- [x] Testes unitários (`OIService.spec.ts`, `weightLossExport.spec.ts`, helpers via spec)

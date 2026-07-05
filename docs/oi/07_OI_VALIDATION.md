# 07 — OI Validation (MetaAdminGeral)

Página administrativa da Oftware para monitoramento e evolução da **OI (Oftware Intelligence)**.

> **Escopo desta etapa:** apenas estrutura de UI e leitura read-only de metadados locais.  
> **Não altera:** OI Core, Firestore, APIs existentes, Orçamento Terapêutico, Chat, Bioimpedância nem consumo de IA.

---

## Objetivo

A **OI Validation** é o centro de acompanhamento da qualidade do modelo estatístico da OI ao longo do tempo. Ela permite que a equipe Oftware:

- Visualizar a versão atual do modelo (`OI_MODEL_VERSION`)
- Inspecionar origem e estado dos benchmarks
- Planejar indicadores de precisão e confiabilidade
- Documentar o ciclo de melhoria contínua

**Não é uma tela para médicos.** É exclusivamente administrativa, acessível via MetaAdminGeral → Patrimônio Global.

---

## Localização na plataforma

| Camada | Caminho |
|--------|---------|
| Hub de cards | MetaAdminGeral → Plataforma → **Patrimônio Global** |
| Página dedicada | `/metaadmingeral/oi-validation` |
| Sidebar | Patrimônio Global → **OI Validation** |

### Arquivos principais

| Arquivo | Função |
|---------|--------|
| `components/metaadmingeral/PlatformPatrimonioHubPanel.tsx` | Grid de cards do Patrimônio Global |
| `components/metaadmingeral/OiValidationPanel.tsx` | Conteúdo das 7 seções |
| `components/metaadmingeral/MetaAdminGeralOiValidationPage.tsx` | Auth + shell da página |
| `app/metaadmingeral/oi-validation/page.tsx` | Rota (Server Component → snapshot) |
| `lib/oi/oiValidationSnapshot.ts` | Leitura read-only de metadados (fs) |

---

## Arquitetura

### Fluxo operacional da OI (ciclo de melhoria)

```
Paciente
   ↓
OI
   ↓
Benchmark
   ↓
Inferência
   ↓
Plano
   ↓
Orçamento
   ↓
Resultado
   ↓
Validação        ← esta página (futuro)
   ↓
Novo Benchmark
```

A lógica de inferência permanece centralizada em `lib/oi/` (`OIService`, `OIBenchmarkRepository`). A página OI Validation **não importa** `OIService` nem altera cache de benchmarks em runtime de produção.

### Leitura de metadados (Etapa 1)

`getOiValidationSnapshot()` lê apenas arquivos locais:

1. `tmp/oi/weight_loss_benchmarks.json` (exportação offline — preferencial)
2. `data/oi/weight_loss_benchmarks.fallback.json` (fallback)
3. `OI_BENCHMARKS_PATH` (override de ambiente)
4. `tmp/oi/pacientes_tratamento_consolidado.json` (contagem de pacientes, se existir)

Sem chamadas a Firestore, APIs ou IA.

---

## Seções da página

### 1. Resumo Geral

| Card | Fonte (Etapa 1) |
|------|-----------------|
| Versão da OI | `OI_MODEL_VERSION` em `lib/oi/OIVersion.ts` |
| Última atualização dos benchmarks | `meta.geradoEm` do JSON de benchmarks |
| Pacientes utilizados | `meta.totalRegistros` do consolidado offline |
| Confiabilidade média | Placeholder |
| Precisão média | Placeholder |

### 2. Qualidade das Previsões

Cards vazios — **Em construção**:

- Precisão da estimativa de mg
- Precisão da estimativa de semanas
- Precisão da estimativa de aplicações
- Precisão da perda prevista

### 3. Benchmarks

- Quantidade de faixas
- Origem (exportação offline / fallback / customizado)
- Caminho do arquivo ou mensagem de fallback

### 4. Histórico

Tabela vazia (Versão, Data, Pacientes, Observações) — preenchida em etapas futuras.

### 5. Roadmap

- ☐ Validação automática
- ☐ Comparação previsto × realizado
- ☐ Precisão por faixa / IMC / medicamento / idade / sexo / protocolo
- ☐ Dashboard estatístico
- ☐ Knowledge Engine

### 6. Arquitetura

Fluxograma visual do ciclo Paciente → … → Novo Benchmark.

### 7. Próximas Etapas

Texto explicativo sobre evolução contínua da OI.

---

## Indicadores (planejados)

| Indicador | Descrição | Status |
|-----------|-----------|--------|
| Precisão mg | Erro médio entre mg previsto e realizado | Etapa futura |
| Precisão semanas | Erro na duração estimada | Etapa futura |
| Precisão aplicações | Erro no número de aplicações | Etapa futura |
| Precisão perda | Erro na perda de peso prevista | Etapa futura |
| Confiabilidade média | Agregado de `confiabilidade` da OI | Etapa futura |
| Precisão por segmento | Faixa, IMC, medicamento, etc. | Roadmap |

---

## Como esta página ajudará a evolução da OI

1. **Visibilidade** — versão do modelo e benchmarks sempre visíveis para a equipe técnica.
2. **Baseline de qualidade** — quando indicadores forem implementados, permitirá comparar versões (`0.1.0` → `0.2.0`, etc.).
3. **Fechamento do ciclo** — resultados reais (Orçamento → tratamento → conclusão) alimentarão validação e novos benchmarks.
4. **Governança** — separação clara entre inferência (`lib/oi/`) e monitoramento (MetaAdminGeral).
5. **Roadmap transparente** — priorização visível de métricas por segmento clínico.

---

## Critérios de aceite (Etapa 1)

- [x] Card **OI Validation** no Patrimônio Global (hub + sidebar)
- [x] Página `/metaadmingeral/oi-validation` com 7 seções
- [x] Documentação `docs/oi/07_OI_VALIDATION.md`
- [x] Nenhuma alteração na OI Core, Orçamento, Firestore, APIs ou IA

---

## Referências

- [05 — OI Core](./05_OI_CORE.md)
- [04 — Primeira base estatística](./04_PRIMEIRA_BASE_ESTATISTICA_OI.md)
- [02 — Orçamento Terapêutico + OI](./02_ORCAMENTO_TERAPEUTICO_METAADMIN.md)

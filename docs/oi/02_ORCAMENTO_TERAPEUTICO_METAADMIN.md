# Orçamento Terapêutico no Metaadmin

Documentação do **Orçamento Terapêutico** dentro do Controle Financeiro do `/metaadmin`, incluindo **configuração comercial por médico**.

> **Escopo atual:** interface determinística, sem IA, sem base estatística OI. Configuração padrão do médico persiste no Firestore; orçamento individual ainda não persiste.

**Documentos relacionados:**

- [00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md](./00_VISAO_GERAL_OFTWARE_INTELLIGENCE.md) — camada OI
- [Motor de Plano Terapêutico](../precificacao/base_inteligente_precificacao.md) — evolução futura deste fluxo

---

## Onde o botão aparece

| Item | Detalhe |
|------|---------|
| **Rota** | `/metaadmin` |
| **Contexto** | Modal **Controle Financeiro** do paciente |
| **Posição** | Rodapé do modal, **ao lado** do botão **Recibo** |
| **Label** | **Orçamento** |
| **Ícone** | `Calculator` (lucide-react), estilo indigo compatível com o modal |
| **ID do médico** | `medicoPerfil.id` (estado já usado em todo o `/metaadmin`) |

O botão **Recibo** e todo o fluxo financeiro existente permanecem inalterados.

---

## Fluxo completo

1. Médico abre **Controle Financeiro** do paciente.
2. Clica em **Orçamento**.
3. Sistema carrega configuração em `medicos/{medicoId}/configuracoes/orcamentoTerapeutico`.
4. **Sem configuração:** abre **Configurar Valores do Orçamento** (`z-index` 80).
5. **Com configuração:** abre direto o **Orçamento Terapêutico** (`z-index` 75), já calculado.
6. Após **Salvar e continuar** na configuração, abre o orçamento calculado.
7. No orçamento, **Editar valores padrão** reabre a configuração; ao salvar, recalcula o orçamento atual.
8. Fechar orçamento mantém o Controle Financeiro aberto.

---

## Configuração Comercial por Médico

Cada médico define **valores padrão** usados no cálculo automático de todos os orçamentos.

### Persistência Firestore

```
medicos/{medicoId}/configuracoes/orcamentoTerapeutico
```

Padrão alinhado a subcoleções existentes (`medicos/{medicoId}/crmTags`, etc.).

### Campos

| Campo | Descrição |
|-------|-----------|
| `valorPorMg` | R$ por mg de medicação |
| `valorPorKitAplicacao` | R$ por kit/aplicação |
| `valorPorConsulta` | R$ por consulta/acompanhamento |
| `valorPorBioimpedancia` | R$ por bioimpedância |
| `valorPorExame` | R$ por exame |
| `outrosCustosPadrao` | R$ fixo incluído em todo orçamento |
| `margemPadraoPercentual` | % sobre subtotal de custos |
| `descontoMaximo` | Limite de desconto no orçamento individual |
| `tipoDescontoMaximo` | `"percentual"` ou `"valor"` (implementado: percentual = % sobre subtotal+margem; valor = R$ fixo) |
| `createdAt` / `updatedAt` | Auditoria |

### Quando é solicitada

- **Primeiro orçamento** do médico → modal de configuração obrigatório antes do orçamento.
- **Orçamentos seguintes** → config já salva; orçamento abre direto.
- **Atalho no orçamento** → “Editar valores padrão” a qualquer momento.

### Cálculo automático (determinístico)

A partir da estimativa do plano (**V2 por faixa de meta**) + config do médico:

```
custoMedicacao      = quantidadeMedicacaoMg × valorPorMg
custoKits           = numeroAplicacoes × valorPorKitAplicacao
consultas           = consultasIncluidas × valorPorConsulta
bioimpedancia       = bioimpedanciasIncluidas × valorPorBioimpedancia
exames              = examesIncluidos × valorPorExame
outrosCustos        = outrosCustosPadrao
subtotal            = soma dos custos acima
margem              = subtotal × margemPadraoPercentual / 100
valorTotal          = subtotal + margem − desconto
```

- **Sem IA**, **sem OI** nesta etapa.
- Orçamento individual permanece **editável** (cada linha e o desconto).
- Se `desconto > descontoMaximo` (conforme tipo), alerta visual amarelo.
- Alterar a **quantidade de mg** recalcula a composição a partir dos valores padrão.

---

## Modal de Orçamento Terapêutico

### Cabeçalho

- **Título:** Orçamento Terapêutico
- **Subtítulo:** Proposta personalizada com base nos dados do paciente.
- **Atalho:** Editar valores padrão

### Seções

| Seção | Conteúdo |
|-------|----------|
| **Dados do paciente** | Nome, pesos, meta, kg e % desejados, medicamento, IMC, status, adesão |
| **Resumo da meta** | Meta cadastrada e percentual estimado |
| **Estimativa inicial do plano** | Duração, aplicações, mg (editável), consultas, bio, exames — **V2 por faixa de meta**; *OI no futuro* |
| **Composição do orçamento** | Medicação, kits, consultas, exames, bio, outros, **margem**, desconto |
| **Valor total** | Recalculado no front-end |
| **Observação legal** | Estimativa; decisão final é médica |

### Botões

| Botão | Comportamento |
|-------|----------------|
| **Fechar** | Fecha fluxo de orçamento |
| **Salvar Orçamento** | Payload local; **não persiste** orçamento do paciente (TODO) |
| **Copiar Resumo** | Clipboard |
| **Gerar PDF (em breve)** | Desabilitado |

---

## Estimativa V2 por faixa de meta

A **V1** usava valores fixos para todos os pacientes (6 meses, 24 aplicações, 88 mg).

A **V2** escolhe duração, aplicações, mg, consultas, bio e exames com base no **`percentualDesejado`** calculado a partir da meta cadastrada.

| Característica | V2 |
|----------------|-----|
| IA | Não |
| OI / base estatística real | Não |
| Natureza | Regra determinística inicial |
| Futuro | Substituída por dados agregados da OI |

### Tabela de faixas

| Percentual de perda desejado | Duração | Aplicações | Medicação (mg) | Consultas | Bio | Exames |
|------------------------------|---------|------------|----------------|-----------|-----|--------|
| Até 5% | 3 meses | 12 | 36 | 3 | 2 | 1 |
| >5% até 10% | 4 meses | 16 | 56 | 4 | 2 | 1 |
| >10% até 15% | 6 meses | 24 | 88 | 6 | 3 | 2 |
| >15% até 20% | 8 meses | 32 | 128 | 8 | 4 | 2 |
| Acima de 20% | 10 meses | 40 | 180 | 10 | 5 | 3 |

**Fallback:** se `percentualDesejado` estiver ausente → faixa intermediária (6 meses / 88 mg), regra `fallback_sem_percentual`.

**Nome do plano:** `Plano {kg} kg / {meses} meses` quando kg disponível; senão `Plano terapêutico / {meses} meses`.

Função: `calcularEstimativaPlanoInicialV2()` em `lib/metaadmin/orcamentoTerapeuticoUtils.ts`.

A V1 (`calcularEstimativaPlanoInicialV1`) permanece no código por compatibilidade, mas o modal usa V2.

---

## Sem IA / sem OI (nesta etapa)

Esta versão **não**:

- Consome API de IA
- Consulta base analítica da OI
- Calcula probabilidade com pacientes semelhantes
- Altera regras do Recibo ou parcelas do Controle Financeiro

Esta versão **sim**:

- Persiste **configuração padrão do médico** no Firestore
- Calcula orçamento de forma **determinística** no front-end
- Permite edição manual de cada orçamento

---

## Arquivos implementados

| Arquivo | Responsabilidade |
|---------|------------------|
| `components/metaadmin/OrcamentoTerapeuticoFlow.tsx` | Orquestra config + orçamento |
| `components/metaadmin/ConfigurarValoresOrcamentoModal.tsx` | Modal de configuração comercial |
| `components/metaadmin/OrcamentoTerapeuticoModal.tsx` | Modal do orçamento |
| `lib/metaadmin/orcamentoTerapeuticoUtils.ts` | Dados do paciente, estimativa, cálculo |
| `services/orcamentoTerapeuticoConfigService.ts` | Leitura/gravação Firestore |
| `types/orcamentoTerapeuticoConfig.ts` | Tipos da configuração |
| `app/metaadmin/page.tsx` | Botão Orçamento + `medicoPerfil.id` |

---

## Dados lidos do paciente

Origem: `PacienteCompleto` no modal financeiro (mesma tabela da v1 anterior).

---

## Evolução futura (OI)

Estimativa do plano (duração, mg, probabilidade) virá da OI. A **configuração comercial por médico** continuará sendo a base de preços; a OI refinirá quantidades e prazos.

---

## Segurança e reversibilidade

- Controle Financeiro e Recibo intactos
- Apenas subcoleção `configuracoes/orcamentoTerapeutico` por médico
- Orçamento do paciente ainda não persistido
- Remover `OrcamentoTerapeuticoFlow` reverte a feature sem afetar pagamentos

---

## Próximos passos

1. Persistir orçamento por paciente (schema dedicado)
2. ~~Integrar estimativas da OI na seção “Estimativa do plano”~~ — **Etapa 5 concluída** (ver abaixo)
3. PDF do orçamento
4. Regras Firestore Security para `configuracoes/orcamentoTerapeutico`

---

## Integração com OI — Etapa 5

O modal de Orçamento Terapêutico consulta a **OI via API server-side** (`POST /api/oi/analisar-paciente`) ao abrir, **sem importar `OIService` no Client Component**.

### Comportamento

| Etapa | O que acontece |
|-------|----------------|
| Abertura | Estimativa **V2** (faixa de meta) aparece imediatamente como fallback |
| Background | Front chama `/api/oi/analisar-paciente` com `{ pacienteId }` e Bearer Firebase |
| OI confiável | Substitui mg, semanas, aplicações; recalcula composição comercial; selo **Estimativa OI** |
| OI baixa / incompleta | Mantém V2; aviso: *"Usando estimativa provisória por faixa de meta."* |
| API indisponível | Mantém V2; aviso: *"OI indisponível no momento. Usando estimativa provisória."* |

### Critérios para usar OI (não substituir V2)

- `confiabilidade !== "baixa"`
- `mgEstimado > 0`
- `tempoEstimadoSemanas > 0`
- `aplicacoesEstimadas > 0`

### O que a OI altera na estimativa

- `quantidadeMedicacaoMg` ← `analysis.mgEstimado`
- `duracaoSemanas` ← `analysis.tempoEstimadoSemanas`
- `duracaoMeses` ← `semanas / 4` (arredondado)
- `numeroAplicacoes` ← `analysis.aplicacoesEstimadas`
- Consultas / bio / exames ← regra simples derivada da duração
- Composição comercial ← recalculada com config do médico (`valorPorMg`, `valorPorKitAplicacao`, etc.)

### UI quando origem = OI

Cards com: pacientes semelhantes (n), confiabilidade, mg com faixa min–max, semanas com faixa, probabilidade de meta, versão do modelo. **Sem** expor paths internos de benchmark — apenas *"Benchmark por faixa de meta"*.

### O que não mudou

- Controle Financeiro e Recibo intactos
- Sem persistência de orçamento
- Sem consumo de IA
- Orçamento continua **editável** pelo médico (mg, composição, desconto)
- Tabela V2 permanece como fallback determinístico

### Arquivos

| Arquivo | Papel |
|---------|--------|
| `components/metaadmin/OrcamentoTerapeuticoModal.tsx` | Fetch OI + UI |
| `lib/metaadmin/fetchOiAnalisePaciente.ts` | Cliente HTTP (sem OIService) |
| `lib/metaadmin/orcamentoTerapeuticoUtils.ts` | `aplicarAnaliseOiNaEstimativa`, tipos |
| `app/api/oi/analisar-paciente/route.ts` | API interna |
| `docs/oi/06_API_INTERNA_OI_ANALISAR_PACIENTE.md` | Contrato da API |


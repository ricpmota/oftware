# Fases do Tratamento — Arquitetura do Treatment Designer

Documento de produto e arquitetura conceitual  
Versão: 1.0 (definição — sem implementação)  
Status: preparação para evolução do motor e da UI

**Relacionado:** [09_TREATMENT_DESIGNER.md](./09_TREATMENT_DESIGNER.md) · [11_PLANO_TERAPEUTICO_V2_UI.md](./11_PLANO_TERAPEUTICO_V2_UI.md)

---

## Por que este documento existe

O **Treatment Designer** e o motor atual (`plano-terapeutico-v1`) modelam o tratamento como um arco que **termina quando a meta de perda de peso é atingida**.

Isso está **incompleto**.

Na prática clínica, o tratamento da obesidade com farmacoterapia é uma **terapia de longo prazo**. Atingir a meta é um **marco**, não o fim do plano. Depois da meta existem fases de consolidação, manutenção ou — quando o médico assim decidir — redução gradual da intensidade terapêutica.

Este documento define a arquitetura para que o Treatment Designer passe a calcular **todo o ciclo terapêutico**, não apenas a fase de emagrecimento.

**Nesta etapa: apenas documentação. Nenhuma alteração em código, motor, OI, Firestore ou APIs.**

---

## Limitação do modelo atual

### O que o motor faz hoje

```
Meta definida
    ↓
Cálculo de semanas, mg, aplicações, consultas, bio, exames
    ↓
Curva de peso até o peso alvo
    ↓
Fim (implícito)
```

Arquivos de referência (estado atual):

| Componente | Comportamento |
|------------|---------------|
| `planoTerapeuticoInterativoEngine.ts` | Cenários progressivo / equilibrado / intensivo até a meta |
| `gerarCurvaPesoPrevista` | Interpola peso atual → peso alvo; para na meta |
| UI v2 (`resolverPlanoContinuo`) | Interpola cenários + escala meta/prazo; gráfico termina na meta |
| Investimento | Soma custos da fase de perda apenas |

### O que falta

- Fase de **adaptação** (escalonamento, tolerabilidade)
- Fase de **consolidação** pós-meta
- **Estratégia após a meta** (manutenção, continuidade ou redução gradual — decisão médica)
- Cronograma e investimento **multi-fase**
- Gráfico que represente o **ciclo completo**

---

## Visão: ciclo terapêutico completo

O Treatment Designer deixa de responder apenas *"quanto tempo e quanto custa perder X kg?"*.

Passa a responder *"como será o tratamento completo, do início à estratégia após a meta?"*.

### Modelo em fases

```
FASE 1 — Adaptação
    ↓
FASE 2 — Perda de peso
    ↓
FASE 3 — Consolidação
    ↓
FASE 4 — Estratégia após a meta
    ↓
Fim do plano (ou continuidade em acompanhamento)
```

Cada fase possui, no desenho futuro do motor:

| Dimensão | Descrição |
|----------|-----------|
| Duração | Semanas (ou meses) configuráveis / calculadas |
| Dose prevista | Curva semanal por fase — não fixa no sistema |
| Aplicações | Quantidade e ritmo |
| Consultas | Frequência e total |
| Bioimpedâncias | Programação |
| Exames | Quando incluídos |
| Peso (quando aplicável) | Curva ou platô esperado |
| Investimento | Parcela do custo total atribuível à fase |

---

## Fase 1 — Adaptação

### Objetivo

Reduzir efeitos adversos e **adaptar o paciente ao medicamento**.

### Características clínicas (referência para o motor)

- Escalonamento **progressivo** da dose
- Perda de peso geralmente **discreta** neste período
- Consultas **mais próximas** no início
- Foco em tolerabilidade e adesão, não em ritmo de emagrecimento

### No Treatment Designer

- Duração: configurável pelo médico ou derivada de protocolo da organização
- Dose: sequência de escalonamento **configurável** (não valores fixos na plataforma)
- Gráfico: faixa visual distinta; peso com variação leve; barras de dose em rampa
- Investimento: consultas, aplicações e medicação da fase incluídas no total

### Configuração médico (futuro)

- Duração típica da adaptação (ex.: 4–8 semanas)
- Modelo de escalonamento (template editável)
- Densidade de consultas na adaptação

---

## Fase 2 — Perda de peso

### Objetivo

Atingir a **meta definida** entre médico e paciente.

### O que o motor já calcula (base a evoluir)

Esta fase corresponde ao núcleo do motor v1. Nela o sistema calcula:

- Evolução prevista de peso
- Semanas até a meta
- Dose semanal
- Aplicações
- Consultas
- Bioimpedâncias
- Exames

### Evolução arquitetural

A Fase 2 deixa de ser *o* tratamento inteiro e passa a ser **um segmento** do `TreatmentPlanningEngine`, com:

- Entrada: meta (kg), prazo desejado, perfil do paciente, OI
- Saída: `FasePerdaPeso` com curva, doses, recursos e custos
- Fronteira clara: início após adaptação; fim ao atingir peso alvo (semana calculada)

---

## Fase 3 — Consolidação

### Objetivo

**Manter o peso atingido** por um período antes de qualquer mudança na estratégia terapêutica (redução, manutenção ou continuidade).

### Princípio

A consolidação não é "desmame". É um **período de estabilização** após a meta, alinhado à prática de que mudanças precipitadas podem aumentar risco de reganho.

### Configuração pelo médico

| Opção | Exemplo |
|-------|---------|
| Habilitada | 4, 8 ou 12 semanas |
| Desabilitada | Ir direto à Fase 4 após atingir meta |

Valores sugeridos na UI — **não impostos** pelo sistema.

### Durante a consolidação

Normalmente permanecem (conforme decisão médica):

- Acompanhamento
- Consultas (frequência pode ser menor que na perda)
- Aplicações na dose de manutenção atingida ao final da Fase 2
- Bioimpedâncias programadas

### No gráfico

- Platô de peso em torno do alvo
- Dose estável (manutenção da dose final da fase de perda, salvo ajuste médico)
- Marcadores de consulta e reavaliação

---

## Fase 4 — Estratégia após a meta

### Princípio inegociável

O sistema **NÃO** assume que todo paciente fará desmame.

O sistema **NÃO** impõe protocolo de desmame.

O médico escolhe a estratégia. A plataforma **suporta e visualiza** a escolha.

### Três possibilidades futuras

#### Opção A — Manutenção

O paciente permanece em **tratamento de manutenção**.

- Dose e frequência estáveis (ou conforme template médico)
- Acompanhamento contínuo
- Investimento recorrente previsível
- Gráfico: peso em platô + dose constante por período indefinido no horizonte do plano

#### Opção B — Redução gradual da intensidade terapêutica

Quando o médico optar por reduzir — **sequência totalmente configurável**.

Exemplo de **estrutura** (não de valores fixos):

```
Semanas 1–4    → Dose manutenção (rótulo + valor definido pelo médico)
      ↓
Semanas 5–8    → Primeira redução
      ↓
Semanas 9–12   → Segunda redução
      ↓
Suspensão, se indicada
```

Regras de produto:

- Cada degrau: `{ semanasInicio, semanasFim, rotulo, doseMgSemanal? }` — configurável
- A plataforma renderiza a sequência; **não prescreve doses**
- Pode ser desabilitada; não é padrão obrigatório

#### Opção C — Continuidade do tratamento

O paciente **continua** o tratamento sem redução naquele momento.

- Sem mudança de intensidade no horizonte planejado
- Útil quando a meta foi atingida mas o médico mantém conduta atual
- Diferente de "manutenção" apenas no naming clínico — arquiteturalmente similar a dose estável pós-consolidação

### Seleção na consulta

Na UI do Treatment Designer (futuro):

1. Médico define duração da consolidação (ou desativa)
2. Médico escolhe estratégia pós-meta: A, B ou C
3. Se B: edita sequência de redução (templates reutilizáveis por organização)
4. Paciente vê cronograma completo — sem editar dose

---

## Motor: de meta→fim para multi-fase

### Modelo atual

```
Meta → Fim
```

### Novo modelo (Treatment Planning Engine v2 — conceitual)

```
Adaptação
    ↓
Perda de peso
    ↓
Consolidação
    ↓
Estratégia após a meta
    ↓
Fim do plano
```

### Contrato conceitual do motor (futuro)

```typescript
/** Tipos conceituais — não implementados */

type FaseTratamentoId =
  | 'adaptacao'
  | 'perda_peso'
  | 'consolidacao'
  | 'pos_meta';

type EstrategiaPosMeta = 'manutencao' | 'reducao_gradual' | 'continuidade';

type DegrauReducaoConfig = {
  semanasInicio: number;
  semanasFim: number;
  rotulo: string;           // ex. "Dose manutenção", "Primeira redução"
  doseMgSemanal?: number;   // definido pelo médico no template — não fixo no sistema
};

type ConfiguracaoFasesMedico = {
  adaptacao: {
    habilitada: boolean;
    semanas?: number;
    escalonamentoTemplateId?: string;
  };
  consolidacao: {
    habilitada: boolean;
    semanas?: 4 | 8 | 12 | number;
  };
  posMeta: {
    estrategia: EstrategiaPosMeta;
    reducaoGradual?: DegrauReducaoConfig[];
    horizonteSemanas?: number;  // quanto do pós-meta incluir no plano visual
  };
};

type TreatmentPlanningInputV2 = {
  pesoAtualKg: number;
  metaPerdaKg: number;
  mesesPrazoPerda: number;
  configuracaoComercial: …;
  configuracaoFases: ConfiguracaoFasesMedico;
  oiContext?: …;
};

type FaseTratamentoOutput = {
  id: FaseTratamentoId;
  semanaInicio: number;
  semanaFim: number;
  duracaoSemanas: number;
  curvaPeso: PontoCurvaPeso[];
  dosesSemanais: number[];
  aplicacoes: number;
  consultas: number;
  bioimpedancias: number;
  exames: number;
  composicaoParcial: ComposicaoPlanoComercial;
};

type TreatmentPlanningOutputV2 = {
  fases: FaseTratamentoOutput[];
  semanaTotal: number;
  curvaPesoCompleta: PontoCurvaPeso[];
  dosesSemanaisCompletas: number[];
  marcadores: MarcadorTimelineUi[];
  valorTotal: number;
  composicaoTotal: ComposicaoPlanoComercial;
  versaoMotor: 'plano-terapeutico-v2-fases';
};
```

### Onde plugar no código (quando implementar)

| Hoje | Futuro |
|------|--------|
| `gerarCenariosPlanoTerapeutico` | `TreatmentPlanningEngine.computeFases()` |
| `resolverPlanoContinuo` (UI) | Consome `TreatmentPlanningOutputV2` |
| `montarDadosGraficoPlano` | `montarGraficoMultiFase(fases)` com faixas visuais por fase |
| `calcularComposicaoPlanoInterativo` | Soma composições parciais por fase |
| Persistência `cenarios` (3 snapshots) | `fases[]` + `configuracaoFasesUsada` |

---

## Cronograma e gráfico

### Visão futura do gráfico

O gráfico deixa de terminar na meta. Representa **todas as fases**:

```
[Adaptação] → [Perda] → [Consolidação] → [Pós-meta] → [Fim]
```

### Elementos por fase

| Elemento | Adaptação | Perda | Consolidação | Pós-meta |
|----------|-----------|-------|--------------|----------|
| Faixa de cor/fundo | Sim | Sim | Sim | Sim |
| Linha de peso | Leve queda | Queda até meta | Platô | Platô / leve variação |
| Barras de dose | Rampa | Evolução OI/motor | Estável | Estável / degraus (B) |
| Marcadores | Consultas densas | Consultas, bio, exames | Reavaliações | Conforme estratégia |
| Label de fase | "Adaptação" | "Perda de peso" | "Consolidação" | "Manutenção" / "Redução" / etc. |

### Eixo temporal

- Semana 0 = início do tratamento (não início da perda)
- Marco visual quando a meta de peso é atingida (linha vertical discreta)
- Marco de fim de consolidação
- Início da Fase 4 claramente identificado

A UI v2 já possui marcadores e gráfico combinado — evoluir para **segmentação por fase** sem reescrever do zero.

---

## Investimento

### Princípio

O investimento deve considerar **todas as fases**, não apenas a perda de peso.

### Modelo futuro

```
valorTotal =
  custoFaseAdaptacao
+ custoFasePerda
+ custoFaseConsolidacao
+ custoFasePosMeta
```

Por fase, mesma lógica comercial atual (mg, kits, consultas, bio, exames, margem, descontos) aplicada aos recursos **daquela fase**.

### Na UI

- Total do plano completo no final (como hoje)
- Composição expansível pode agrupar por fase: *"Adaptação"*, *"Perda de peso"*, *"Consolidação"*, *"Após a meta"*
- Evitar linguagem de "pacote" ou "promoção"

### Fase pós-meta indefinida

Se manutenção for de horizonte longo, o plano pode:

- Mostrar custo dos primeiros N meses de manutenção no Designer
- Ou indicar "acompanhamento contínuo — valores após o período planejado conforme evolução clínica"

Decisão de produto a refinar na implementação.

---

## Configuração do médico (resumo)

O médico configura; o sistema calcula e apresenta.

| Parâmetro | Quem decide | Sistema |
|-----------|-------------|---------|
| Duração da adaptação | Médico | Calcula recursos e custos |
| Meta e prazo de perda | Médico + paciente | Motor Fase 2 + OI |
| Consolidação (sim/não, semanas) | Médico | Motor Fase 3 |
| Estratégia pós-meta (A/B/C) | Médico | Motor Fase 4 |
| Sequência de redução (Opção B) | Médico (template) | Renderiza; não impõe doses |
| Valores de dose em cada degrau | Médico | Armazenados no template — não hardcoded |

### Templates reutilizáveis (futuro)

- `ProtocoloAdaptacao`
- `ProtocoloConsolidacao`
- `ProtocoloReducaoGradual`
- `ProtocoloManutencao`

Alinhado ao conceito de **Protocolos** em [09_TREATMENT_DESIGNER.md](./09_TREATMENT_DESIGNER.md) (Essencial, Completo, Premium → evolução para templates clínicos por fase).

---

## Base científica e comunicação

Texto de referência para UI e documentação ao paciente (linguagem neutra, sem promessa):

1. **O tratamento da obesidade é considerado uma terapia de longo prazo** — não um ciclo curto que encerra na balança.

2. **A interrupção abrupta** do tratamento farmacológico está associada, em muitos pacientes, ao **reganho ponderal** observado em estudos clínicos.

3. Por isso, a plataforma contempla **fases após o atingimento da meta** — em especial consolidação e estratégia de continuidade ou redução gradual.

4. A **estratégia específica** (manutenção, continuidade ou redução gradual) permanece sob **decisão clínica do médico**, considerando resposta individual, tolerabilidade, comorbidades e objetivos do paciente.

5. O Treatment Designer **organiza e estima** o plano; **não substitui** o julgamento clínico.

---

## O que NÃO fazer

| Restrição | Motivo |
|-----------|--------|
| Impor desmame automático | Decisão médica |
| Fixar doses de redução no código | Configuração por template |
| Prometer manutenção de peso | Comunicação neutra |
| Tratar meta como fim do plano | Incompleto clinicamente |
| Implementar nesta etapa | Apenas arquitetura |

---

## Roadmap sugerido (implementação futura)

| Etapa | Entrega | Depende de |
|-------|---------|------------|
| **12.1** | Tipos `FaseTratamento*` + `ConfiguracaoFasesMedico` | Este documento |
| **12.2** | Motor Fase 2 extraído do v1 (perda isolada) | — |
| **12.3** | Motor Fase 1 (adaptação) + templates escalonamento | Config organização |
| **12.4** | Motor Fase 3 (consolidação) configurável | — |
| **12.5** | Motor Fase 4 (A/B/C) + redução gradual configurável | Templates médico |
| **12.6** | Gráfico multi-fase + investimento por fase | UI v2 |
| **12.7** | OI: curvas por fase (dose semanal real) | Benchmarks / cohort |
| **12.8** | Persistência `fases[]` no plano | Firestore (ADR separado) |

---

## Decisão arquitetural

**O Treatment Designer deixa de modelar o tratamento como "meta → fim".**

O ciclo terapêutico completo passa a ser a unidade de planejamento:

```
Adaptação → Perda de peso → Consolidação → Estratégia após a meta → Fim do plano
```

O motor v1 e a UI v2 permanecem válidos como **implementação parcial da Fase 2**. A evolução é **aditiva**, não destrutiva.

Próximo passo recomendado após aprovação deste documento: ADR técnico `TreatmentPlanningEngine v2` com tipos TypeScript em `lib/treatment-designer/` e migração incremental a partir de `planoTerapeuticoInterativoEngine.ts`.

---

*Documento criado em preparação à evolução do Treatment Designer. Sem implementação nesta etapa.*

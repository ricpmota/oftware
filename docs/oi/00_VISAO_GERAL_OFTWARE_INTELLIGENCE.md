# OI — Oftware Intelligence

**O cérebro inteligente da plataforma Oftware.**

> **Documento mestre** da arquitetura de inteligência da Oftware.  
> **Escopo desta etapa:** apenas documentação estratégica. Nenhum código, componente, rota, página, coleção, API, tela ou Firestore deve ser alterado ou criado.

---

## Objetivo

Este documento é o **documento mais importante** de toda a arquitetura de inteligência da plataforma Oftware.

Ele define que a **OI não é uma funcionalidade** — não é um botão, uma tela ou um módulo isolado. A OI é uma **camada de inteligência** que utilizará toda a experiência acumulada da plataforma para auxiliar médicos na tomada de decisão clínica, terapêutica e comercial.

**Regra central:** toda nova funcionalidade inteligente da plataforma deverá utilizar a OI. Nenhum motor paralelo, lógica duplicada ou "inteligência avulsa" deve ser criado fora desta arquitetura.

**Documentos relacionados:**

- [Motor de Plano Terapêutico](../precificacao/base_inteligente_precificacao.md) — primeira especialização planejada da OI
- [Base de Dados para Análise de Perda de Peso](../precificacao/base_dados_perda_peso.md) — especificação da base histórica anonimizada

---

## O que é a OI

A **OI (Oftware Intelligence)** é um **motor interno de inteligência** baseado em dados reais da plataforma — pacientes em tratamento, aplicações, evolução de peso, exames, bioimpedância, desfechos e protocolos acumulados ao longo do tempo.

| Característica | Descrição |
|----------------|-----------|
| **Base de aprendizado** | Dados clínicos anonimizados e agregados gerados pela operação diária da Oftware |
| **Evolução contínua** | Aprende conforme novos pacientes evoluem, concluem ou abandonam tratamentos |
| **Papel do médico** | **Não substitui** o médico — **apoia** a decisão médica com evidência estatística |
| **Método principal** | Estatística, modelos internos pré-computados e conhecimento acumulado da base |
| **IA generativa** | Poderá existir **apenas para explicar** resultados em linguagem natural — **nunca** para gerar o cálculo principal |

A OI transforma a pergunta *"o que fazer com este paciente?"* em *"o que pacientes semelhantes experimentaram, em média, e com qual grau de confiança?"* — sempre sob responsabilidade do profissional que prescreve e acompanha.

---

## Missão

**Transformar milhões de dados clínicos em conhecimento prático** para que cada paciente seja tratado utilizando a **experiência acumulada de milhares de pacientes semelhantes**.

A OI existe para que um médico recém-integrado à plataforma tenha acesso, desde o primeiro dia, ao aprendizado coletivo de toda a rede — sem expor dados individuais, sem prometer resultados e sem substituir o julgamento clínico.

---

## Visão

No futuro, a OI deverá se tornar o **principal diferencial competitivo** da Oftware.

A Oftware deixará de ser percebida apenas como um software de gestão clínica. Será uma **plataforma que aprende continuamente** — onde cada novo paciente, cada aplicação registrada e cada tratamento concluído fortalece a capacidade de apoiar o próximo caso semelhante.

Quem utiliza a Oftware não compra apenas telas e fluxos. Compra acesso a um **cérebro coletivo** construído sobre a maior base de experiência em emagrecimento e tratamento metabólico gerida pela plataforma.

---

## Princípios

Todos os módulos, especializações e funcionalidades que nascerem dentro da OI devem respeitar estes princípios:

1. **A decisão final sempre é do médico.**
2. **Nenhuma recomendação é uma ordem** — são sugestões fundamentadas, editáveis e dispensáveis.
3. **Toda recomendação deve possuir explicabilidade** — o médico deve entender *por que* aquela estimativa foi apresentada.
4. **Toda previsão deve informar o grau de confiança** — amostra (n), faixas percentis, probabilidade.
5. **Nunca prometer resultados** — apenas estimativas, probabilidades e faixas esperadas.
6. **Sempre utilizar estatística da base** — nunca opinião subjetiva ou inferência opaca como fonte primária.
7. **Nunca utilizar pacientes individuais** — apenas grupos agregados e anonimizados.
8. **Sempre preservar LGPD** — anonimização, agregação, acesso restrito, auditoria.
9. **Toda recomendação deve ser auditável** — versão do modelo, inputs utilizados, timestamp, edições do médico.

---

## Arquitetura Conceitual

A OI organiza-se em cinco camadas, da base de dados até a interface utilizada pelo médico:

```
┌─────────────────────────────────────────────────────────┐
│  DADOS                                                  │
│  Base histórica anonimizada da plataforma                │
│  (pacientes, aplicações, peso, exames, desfechos…)      │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  MODELOS                                                │
│  Estatísticas, benchmarks, segmentos, probabilidades    │
│  (pré-computados, versionados, atualizados por rotina)  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  MOTOR DE INTELIGÊNCIA (OI Core)                         │
│  Orquestração: perfil → segmento → lookup → resposta    │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  ESPECIALIZAÇÕES                                        │
│  Módulos inteligentes independentes                     │
│  (Plano Terapêutico, Curva Esperada, Risco de Abandono…)│
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│  SISTEMA                                                │
│  Telas, botões e fluxos utilizados pelo médico          │
│  (/metaadmin, modal do paciente, alertas, relatórios…)  │
└─────────────────────────────────────────────────────────┘
```

| Camada | Papel |
|--------|-------|
| **Dados** | Base histórica — fonte de verdade anonimizada |
| **Modelos** | Estatísticas agregadas por segmento, meta, medicamento |
| **Motor** | Cérebro — identifica perfil, busca semelhantes, retorna estimativas |
| **Especializações** | Módulos inteligentes com objetivo clínico ou operacional específico |
| **Sistema** | O que o médico vê e interage na plataforma |

---

## Especializações da OI

A OI poderá possuir diversos **módulos independentes** (especializações), cada um consumindo o Motor de Inteligência e os Modelos compartilhados. Nenhuma especialização deve manter lógica estatística própria duplicada.

| Módulo | Objetivo | Status |
|--------|----------|--------|
| **Plano Terapêutico** | Gerar proposta terapêutica e comercial personalizada por paciente | Planejado |
| **Curva Esperada** | Comparar evolução real do paciente com curva esperada para o perfil | Planejado |
| **Risco de Abandono** | Prever probabilidade de abandono do tratamento | Planejado |
| **Escalonamento** | Sugerir melhor escalonamento de dose | Planejado |
| **Dose Ideal** | Estimar dose mais adequada para o perfil e meta | Planejado |
| **Resposta Clínica** | Prever resposta clínica esperada (peso, cintura, composição) | Planejado |
| **Predição de Meta** | Calcular chance de atingir meta cadastrada (kg ou %) | Planejado |
| **Motor Comercial** | Gerar proposta financeira com breakdown de custos e margens | Planejado |
| **Motor Financeiro** | Previsão de faturamento e receita por clínica ou médico | Planejado |
| **Motor Nutricional** | Apoio nutricional baseado em perfil e evolução | Planejado |
| **Motor de Bioimpedância** | Análise de composição corporal e tendências | Planejado |
| **Motor Laboratorial** | Interpretar exames no contexto do perfil e tratamento | Planejado |
| **Motor Oftalmológico** | Relacionar alterações metabólicas com doenças oculares | Planejado |
| **Motor de Alertas** | Alertas inteligentes (desvio de curva, exame alterado, adesão baixa) | Planejado |
| **Motor de Renovação** | Identificar momento ideal para renovar ou estender tratamento | Planejado |

Novas especializações só entram na OI se respeitarem os [Princípios](#princípios) e consumirem o Motor compartilhado.

---

## Como a OI Aprende

A OI aprende **continuamente** conforme a plataforma acumula experiência clínica real. Cada evento abaixo alimenta a base histórica e, periodicamente, recalibra os modelos:

| Fonte de aprendizado | O que enriquece |
|----------------------|-----------------|
| **Novos pacientes** | Amplitude de perfis e segmentos |
| **Novos exames** | Correlação metabólica, comorbidades, laboratorial |
| **Novas aplicações** | Consumo de mg, adesão, escalonamento |
| **Novos pesos** | Curvas de evolução, ritmo de perda |
| **Novas bioimpedâncias** | Composição corporal vs. peso |
| **Tratamentos concluídos** | Desfechos positivos, tempo até meta |
| **Novos abandonos** | Taxas de desistência, fatores de risco |
| **Novos protocolos** | Eficácia de abordagens e combinações |

**Quanto maior a base, melhor ficam os modelos** — em precisão, confiança estatística e granularidade de segmentação.

A atualização dos modelos será feita por **rotina administrativa protegida** (não em tempo real a cada registro), preservando performance, custo e auditabilidade.

---

## Fluxo da OI

Fluxo padrão para qualquer especialização que consulte a OI:

```
Paciente (dados na ficha)
         │
         ▼
Leitura automática dos dados
         │
         ▼
Identificação do perfil
(sexo, idade, IMC, meta, medicamento, exames…)
         │
         ▼
Busca por pacientes semelhantes
(segmentação na base histórica anonimizada)
         │
         ▼
Motor estatístico (OI Core)
(médias, medianas, percentis, probabilidades)
         │
         ▼
Especialização correspondente
(Plano Terapêutico, Curva Esperada, etc.)
         │
         ▼
Resposta estruturada
(números, faixas, confiança, plano sugerido)
         │
         ▼
Explicabilidade
(por que, com base em n pacientes, versão do modelo)
         │
         ▼
Médico toma decisão
(aceita, edita ou descarta a recomendação)
```

A camada de **Explicabilidade** pode, no futuro, usar IA generativa para redigir o resumo — mas os **números** vêm exclusivamente do motor estatístico.

---

## OI Não É IA

É fundamental distinguir a **OI** das tecnologias que ela pode **utilizar**:

| Conceito | O que é | Papel na OI |
|----------|---------|-------------|
| **Inteligência estatística** | Médias, medianas, percentis, probabilidades sobre grupos agregados | **Núcleo** — fonte primária de toda recomendação |
| **Modelos internos** | Benchmarks, segmentos, curvas pré-computados e versionados | **Núcleo** — armazenamento e consulta das estatísticas |
| **Machine Learning (futuro)** | Modelos preditivos treinados sobre base anonimizada | **Possível evolução** — ainda subordinado a explicabilidade e auditoria |
| **IA generativa** | LLMs, texto em linguagem natural | **Camada opcional** — apenas explicação e formatação |

```
┌────────────────────────────────────────┐
│  OI = Oftware Intelligence             │
│  (camada completa de inteligência)     │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  Estatística + Modelos internos  │  │  ← cálculo principal
│  │  (+ ML futuro, se aplicável)     │  │
│  └──────────────────────────────────┘  │
│                                        │
│  ┌──────────────────────────────────┐  │
│  │  IA generativa (opcional)         │  │  ← explicação apenas
│  └──────────────────────────────────┘  │
└────────────────────────────────────────┘
```

**A OI poderá utilizar IA. Mas a IA não é a OI.**

Confundir os dois levaria a custos imprevisíveis, respostas não auditáveis e promessas clínicas indevidas. A OI existe para ser **confiável, reproduzível e médico-centric**.

---

## Filosofia

> **"O maior patrimônio da Oftware não será o software. Será o conhecimento adquirido através da evolução de milhares de pacientes."**

Outras frases que orientam a OI:

> **"Cada paciente que evolui na plataforma torna o próximo tratamento mais informado."**

> **"Inteligência não é adivinhar o futuro — é aprender com o passado coletivo, com humildade estatística."**

> **"O médico decide. A OI ilumina."**

> **"Não vendemos promessas de emagrecimento. Vendemos acesso ao que milhares de casos semelhantes já demonstraram."**

> **"Uma plataforma que aprende é uma plataforma que não envelhece."**

---

## Roadmap

Implementação incremental da OI — cada fase validada antes da seguinte:

| Fase | Foco | Entregáveis conceituais |
|------|------|-------------------------|
| **Fase 1 — Base estatística** | Documentação, mapeamento Firestore, exportação anonimizada, primeiros modelos | Base histórica, segmentos, benchmarks |
| **Fase 2 — Plano Terapêutico** | Primeira especialização visível: botão "Gerar Plano Terapêutico" / "Analisar Paciente" | Proposta clínica + comercial por paciente |
| **Fase 3 — Predições** | Predição de meta, curva esperada, risco de abandono | Estimativas probabilísticas no fluxo clínico |
| **Fase 4 — Motores especializados** | Nutricional, laboratorial, bioimpedância, alertas, renovação | Módulos independentes sobre OI Core |
| **Fase 5 — Aprendizado contínuo** | Rotina de atualização de modelos, versionamento, métricas de qualidade | Modelos que melhoram com o tempo |
| **Fase 6 — Expansão** | Outras especialidades médicas além do eixo emagrecimento/metabólico | OI como plataforma de inteligência clínica ampla |

> **Nenhuma fase deste roadmap implica alteração de código nesta etapa.** Apenas documentação e planejamento.

---

## Decisão Arquitetural

Fica registrado como **decisão estratégica e arquitetural** da Oftware:

**Toda inteligência futura da plataforma deverá nascer dentro da OI.**

Isso garante:

| Benefício | Descrição |
|-----------|-----------|
| **Evitar duplicação de lógica** | Uma única forma de segmentar, comparar e estimar |
| **Evitar múltiplos motores** | Sem "mini-IAs" espalhadas em cada tela |
| **Centralizar conhecimento** | Toda experiência clínica converge para a mesma base |
| **Auditoria unificada** | Versionamento, LGPD e princípios aplicados uma vez |
| **Evolução coordenada** | Novos dados beneficiam todas as especializações |

Funcionalidades existentes que hoje usam lógica estatística local (ex.: curvas esperadas) deverão, no futuro, **migrar para consumir a OI** — não criar paralelos.

---

## Conclusão

A **OI — Oftware Intelligence** deverá se tornar o **cérebro da plataforma Oftware**.

O botão **"Analisar Paciente"** (ou **"Gerar Plano Terapêutico"**) será apenas a **primeira funcionalidade visível** ao usuário — a ponta do iceberg da Fase 2.

No futuro, praticamente **toda decisão inteligente** da plataforma utilizará a OI: desde sugerir dose e prever abandono até interpretar exames, gerar alertas e apoiar a renovação do tratamento.

A Oftware continuará sendo um software de gestão clínica excelente. Com a OI, torna-se também uma **plataforma que transforma experiência coletiva em vantagem individual para cada paciente** — sempre com o médico no centro.

**Nesta etapa:** apenas este documento mestre. Nenhuma implementação.

---

## Referências internas

- [Motor de Plano Terapêutico Oftware](../precificacao/base_inteligente_precificacao.md)
- [Base de Dados para Análise de Perda de Peso](../precificacao/base_dados_perda_peso.md)
- [Mapa Mestre do Conhecimento](../00_mapa_mestre_oftware.md)
- `docs/arquitetura/` — documentação de arquitetura da plataforma
- `utils/expectedCurve.ts` — curvas esperadas (candidata a migrar para especialização Curva Esperada da OI)

# Treatment Designer

**Designer de Tratamento**

Documento de produto — visão e arquitetura conceitual  
Versão: 1.0 (definição estratégica)  
Status: referência para todas as próximas implementações

---

## Por que este documento existe

O **Treatment Designer** substitui o conceito de *Orçamento Terapêutico* como centro da experiência Oftware.

Até aqui, o fluxo começava pelo valor. A partir de agora, o fluxo começa pela **decisão terapêutica**. O orçamento deixa de ser o produto — passa a ser uma **consequência** do plano que médico e paciente construíram juntos.

Este documento não descreve implementação. Define a visão que todas as próximas entregas devem seguir.

---

## Capítulo 1 — Filosofia

### O paciente não compra medicação

O paciente **constrói um plano terapêutico**.

Ele participa da definição da meta, do prazo e da estratégia de acompanhamento. Ele entende o caminho, não apenas o preço final. A medicação faz parte do plano — não é o plano.

### O médico não vende um tratamento

O médico **orienta e desenha** um tratamento junto ao paciente.

Sua função é conduzir clinicamente: interpretar dados, ajustar conduta, validar limites de segurança e registrar a decisão. A plataforma não substitui esse papel — ela o amplifica com clareza, estrutura e memória.

### A plataforma existe para apoiar a decisão

A Oftware não é um catálogo de serviços nem um funil de vendas.

É um espaço onde:

- a meta fica explícita;
- o prazo ganha sentido clínico;
- o acompanhamento é previsível;
- a jornada inteira pode ser revisitada ao longo do tempo.

**Decisão primeiro. Valor depois. Tratamento como consequência.**

---

## Capítulo 2 — Fluxo completo

O Treatment Designer organiza a jornada do início ao fim:

```
Consulta
    ↓
Definição da meta
    ↓
Escolha do prazo
    ↓
Motor de Planejamento
    ↓
Plano sugerido
    ↓
Ajustes
    ↓
Aceite
    ↓
Contrato
    ↓
Tratamento
    ↓
Acompanhamento
    ↓
Conclusão
```

### Consulta

Momento clínico em que médico e paciente alinham contexto, expectativas e viabilidade de um tratamento estruturado.

### Definição da meta

Meta de perda de peso (ou outro objetivo terapêutico acordado), expressa de forma compreensível para o paciente e clinicamente válida para o médico.

### Escolha do prazo

O paciente participa do horizonte temporal desejado. O sistema traduz essa escolha em cenários comparáveis — sem expor decisões que são exclusivamente médicas (dose, medicamento, escalonamento).

### Motor de Planejamento

O **Treatment Planning Engine** recebe os insumos clínicos e de configuração e devolve um plano terapêutico completo: ritmo, monitoramento, recursos previstos e investimento estimado.

### Plano sugerido

Proposta estruturada em cenários (por exemplo: progressivo, equilibrado, intensivo), sempre com linguagem de plano — nunca de oferta comercial.

### Ajustes

O médico pode refinar qualquer aspecto clínico. O paciente pode alternar entre cenários permitidos (meta, prazo, estratégia de acompanhamento).

### Aceite

Registro explícito de que médico e paciente concordaram com o plano desenhado. Não é “fechamento de venda” — é **consentimento informado sobre a estratégia terapêutica**.

### Contrato

Formalização jurídica e comercial do que foi aceito. O contrato documenta o plano; não o antecede.

### Tratamento

Execução clínica: prescrição, aplicações, consultas e demais condutas conforme o plano e a evolução real.

### Acompanhamento

Monitoramento contínuo na jornada: peso, bioimpedância, exames, adesão, fotos, consultas.

### Conclusão

Encerramento estruturado do ciclo, com registro de resultados, aprendizados e, quando aplicável, definição de próximos passos.

---

## Capítulo 3 — Papéis

### Paciente

**Pode decidir:**

| Decisão | Descrição |
|---------|-----------|
| Meta | Objetivo terapêutico acordado com o médico |
| Prazo | Horizonte temporal preferido entre cenários válidos |
| Escolha do cenário | Progressivo, equilibrado, intensivo (ou equivalentes futuros) |
| Aceitar plano | Consentimento com a estratégia proposta |

**Não pode decidir:**

| Restrição | Motivo |
|-----------|--------|
| Dose | Decisão médica — derivada pelo motor, não editável pelo paciente |
| Medicamento | Conduta prescritiva exclusiva do médico |
| Escalonamento | Esquema terapêutico clínico |
| Prescrição | Documento e ato médico regulados |

O paciente **participa** da decisão; não **prescreve**.

### Médico

O médico pode alterar **qualquer informação clínica**.

Ele conduz a consulta, valida limites de segurança, ajusta o plano sugerido pelo motor e registra a conduta final. A plataforma apresenta opções; o médico decide.

---

## Capítulo 4 — Treatment Planning Engine

O **Treatment Planning Engine** será o cérebro do Treatment Designer.

É o componente responsável por transformar intenção clínica e parâmetros de configuração em um **plano terapêutico completo** — estruturado, comparável e auditável.

### Entrada

| Insumo | Função |
|--------|--------|
| Peso | Ponto de partida e contexto fisiológico |
| Meta | Objetivo terapêutico acordado |
| Prazo | Horizonte temporal escolhido ou inferido |
| Literatura | Limites clínicos plausíveis e guardrails de segurança |
| OI (Oftware Intelligence) | Aproximação da proposta à experiência observada na plataforma |
| Configuração do médico | Valores, protocolos, margens e preferências de acompanhamento |

### Saída

Um **plano terapêutico completo**, incluindo:

- cenários comparáveis (prazo, ritmo, monitoramento);
- estimativa de medicação e aplicações (derivadas — não editáveis pelo paciente);
- timeline de acompanhamento;
- investimento estimado (consequência do plano, não seu centro);
- metadados de origem (qual versão do motor, quais fontes foram usadas).

O motor **organiza e propõe**. O médico **valida e conduz**.

---

## Capítulo 5 — Literatura

A literatura médica será utilizada para estabelecer **limites clínicos plausíveis**.

Ela define o que é coerente e seguro — faixas de ritmo de perda, frequência de monitoramento, critérios de escalonamento em nível conceitual, alertas de prudência clínica.

### O que a literatura faz

- Ancora o plano em evidência reconhecida.
- Impõe guardrails quando cenários ultrapassam faixas prudentes.
- Dá linguagem neutra e responsável à comunicação com o paciente.

### O que a literatura não faz

- **Nunca** promete resultados individuais.
- **Nunca** substitui o julgamento do médico responsável.
- **Nunca** é apresentada ao paciente como garantia de desfecho.

A literatura é **referência de segurança e coerência** — não motor de marketing.

---

## Capítulo 6 — OI (Oftware Intelligence)

A OI tem como objetivo **aproximar a proposta da experiência observada na plataforma**.

Ela traduz o histórico agregado e anonimizado de pacientes com perfis semelhantes em estimativas de prazo, medicação, aplicações e probabilidade de atingir meta — sempre com indicação de confiabilidade.

### Evolução planejada

| Fase | Papel da OI |
|------|-------------|
| Hoje / próximo | Totais e benchmarks por faixa de meta |
| Futuro próximo | **Curvas terapêuticas** — evolução semana a semana baseada em cohorts reais |
| Futuro distante | Refinamento contínuo com aprendizado supervisionado |

### Princípio inegociável

A OI **nunca substitui a decisão médica**.

Ela informa, calibra e sugere. O médico interpreta, ajusta e registra a conduta final.

---

## Capítulo 7 — Configuração do médico

Cada médico define os parâmetros que alimentam o Treatment Planning Engine.

Esses parâmetros moldam **como o plano é montado e quanto custa** — não **o que é clinicamente permitido** (isso vem da literatura e do médico).

### Parâmetros configuráveis

| Parâmetro | Uso no plano |
|-----------|--------------|
| Valor da consulta | Investimento de acompanhamento |
| Quantidade de consultas | Densidade de monitoramento |
| Bioimpedâncias | Frequência de avaliação corporal |
| Exames | Rastreio e segurança metabólica |
| Valor da mg | Componente de medicação no investimento |
| Margem | Estrutura comercial do consultório |
| Protocolos | Pacotes de serviços de acompanhamento (ver Capítulo 8) |

A configuração é **do médico**, aplicada **ao plano gerado** — transparente para o paciente na forma de itens incluídos, nunca como “tabela de preços solta”.

---

## Capítulo 8 — Protocolos

### Conceito

**Protocolos** são modelos de acompanhamento que o médico associa a um plano.

Eles definem *o que está incluído na jornada* — não apenas quanto custa cada item isolado.

### Exemplos iniciais

| Protocolo | Perfil |
|-----------|--------|
| **Protocolo Essencial** | Acompanhamento enxuto: consultas periódicas, monitoramento básico |
| **Protocolo Completo** | Consultas regulares, bioimpedância programada, exames de rotina |
| **Protocolo Premium** | Acompanhamento intensivo: telemedicina, suporte ampliado, bio e exames mais frequentes |

### O que um protocolo define

- quantidade e tipo de consultas;
- bioimpedâncias previstas;
- telemedicina (quando disponível);
- suporte e canais de acompanhamento;
- exames incluídos ou sugeridos;
- outros serviços do consultório.

### Personalização

O médico poderá **criar seus próprios protocolos**, nomeá-los e reutilizá-los em novos planos. A plataforma pode oferecer modelos iniciais; a identidade do consultório permanece do médico.

---

## Capítulo 9 — Timeline

A **timeline visual** será a principal interface de compreensão do plano para o paciente.

Ela traduz o abstrato (meses, mg, consultas) em uma **jornada concreta no tempo**.

### Estrutura conceitual

```
Hoje
  ↓
Semana 4   — primeira revisão significativa
  ↓
Semana 8   — checkpoint de evolução
  ↓
Semana 12  — ajuste de estratégia, se necessário
  ↓
Semana 16  — consolidação do ritmo
  ↓
Meta       — objetivo terapêutico acordado
```

### Papel da timeline

- Mostrar **quando** cada marco acontece (consulta, bio, exame, aplicação).
- Permitir comparação entre cenários no mesmo eixo temporal.
- Servir de âncora emocional e cognitiva: o paciente enxerga o caminho, não só o destino.

A timeline não é decorativa. É o **mapa da jornada**.

---

## Capítulo 10 — Página do paciente

A página deixa de ser uma **proposta** pontual.

Ela passa a ser:

# Sua Jornada Terapêutica

Um espaço único que acompanha o paciente do desenho do plano até a conclusão — e que pode ser revisitado a qualquer momento.

### O que a jornada reúne

| Dimensão | Conteúdo |
|----------|----------|
| Fotos | Registro visual da evolução |
| Peso | Curva real vs. prevista |
| Bioimpedância | Composição corporal ao longo do tempo |
| Aplicações | Histórico e próximas datas |
| Exames | Solicitações, resultados, tendências |
| Consultas | Agenda e resumos |
| Resultados | Marcos atingidos e desvios |
| Contrato | Documento aceito |
| Financeiro | Investimento acordado e status de pagamento |

Tudo em **uma única experiência** — sem fragmentação entre “página do orçamento”, “área do paciente”, “contrato” e “acompanhamento”.

O Treatment Designer **inicia** a jornada. A jornada **sustenta** o tratamento.

---

## Capítulo 11 — Comunicação

A linguagem do Treatment Designer é **clínica e colaborativa** — nunca comercial.

### Evitar

| Termo | Motivo |
|-------|--------|
| Venda | Reduz decisão médica a transação |
| Pacote | Sugere produto engessado, não plano personalizado |
| Promoção | Incompatível com ética e expectativa clínica |
| Oferta | Posiciona o paciente como consumidor, não participante |

### Utilizar

| Termo | Significado |
|-------|-------------|
| Plano | Estratégia terapêutica estruturada |
| Tratamento | Conjunto de condutas ao longo do tempo |
| Jornada | Experiência contínua do paciente na plataforma |
| Acompanhamento | Monitoramento clínico programado |
| Meta | Objetivo terapêutico acordado |
| Estratégia | Caminho escolhido entre cenários válidos |

### Tom

- Estimativas, não promessas.
- Participação, não pressão.
- Clareza, não persuasão.

---

## Capítulo 12 — Roadmap

O Treatment Designer evoluirá em versões incrementais, cada uma aumentando a fidelidade clínica e a riqueza da experiência — sem quebrar o que já funciona.

### Versão 1 — Motor determinístico

- Cenários derivados por regras explícitas (prazo, mg, aplicações).
- Guardrails clínicos básicos (ex.: ritmo máximo de perda).
- Página comparativa de cenários.
- Orçamento como consequência do plano aceito.
- **Estado atual de referência:** evolução do Plano Terapêutico Interativo.

### Versão 2 — Curvas terapêuticas

- Substituição de projeções ilustrativas por curvas baseadas em dados reais da plataforma.
- Timeline alimentada por evolução semanal observada em cohorts.
- Comparação visual: previsto (cohort) vs. real (paciente).

### Versão 3 — Motor híbrido (Literatura + OI)

- Literatura define limites; OI calibra dentro desses limites.
- Cenários ancorados em evidência e em experiência observada.
- Indicadores de confiabilidade visíveis para médico e paciente.

### Versão 4 — Aprendizado contínuo

- Refinamento progressivo dos modelos com novos desfechos.
- Feedback loop: plano previsto → tratamento real → conclusão → melhoria do motor.
- Sempre com supervisão médica e governança de dados.

Cada versão deve ser **entregável isoladamente** e **compatível** com a anterior.

---

## Capítulo 13 — Arquitetura

Ecossistema conceitual do Treatment Designer:

```
Paciente
    ↓
Treatment Designer          ← experiência e interface
    ↓
Treatment Planning Engine   ← cérebro do plano
    ↓
    ├── OI                  ← experiência observada na plataforma
    ├── Literatura          ← limites clínicos plausíveis
    └── Configuração do Médico  ← valores, protocolos, preferências
    ↓
Plano                       ← cenários, timeline, itens incluídos
    ↓
Contrato                    ← formalização do aceite
    ↓
Tratamento                  ← prescrição, aplicações, execução clínica
    ↓
Jornada                     ← acompanhamento contínuo do paciente
    ↓
Conclusão                   ← encerramento e aprendizado
```

### Relação com módulos existentes

| Módulo atual | Papel no ecossistema futuro |
|--------------|----------------------------|
| Orçamento Terapêutico (MetaAdmin) | Entrada legada → migrará para Treatment Designer (médico) |
| Plano Terapêutico Interativo | Protótipo da Versão 1 → evolui para página de cenários |
| OI | Fonte de calibração dentro do motor |
| Prescrição | Execução clínica pós-aceite — **não alterada pelo Designer** |
| Contrato de tratamento | Formalização pós-aceite |
| Aplicação / Conclusão / Relatório | Marcos na Jornada Terapêutica |
| Controle financeiro | Consequência do plano aceito |

Nenhum módulo existente é descartado. Todos passam a **orbitar** o Treatment Designer.

---

## Capítulo 14 — Princípios

Estes princípios são inegociáveis em qualquer versão do produto:

| Princípio | Significado |
|-----------|-------------|
| O sistema nunca substitui o julgamento clínico | O motor propõe; o médico decide |
| A decisão é compartilhada | Paciente participa de meta, prazo e cenário |
| O paciente participa | Sem acesso a dose, medicamento ou prescrição |
| O médico conduz | Autoridade clínica final |
| A plataforma organiza | Estrutura, memória, timeline, jornada |
| A OI auxilia | Informa e calibra — não prescreve |

Quando houver conflito entre conveniência de produto e segurança clínica, **prevalece a segurança clínica**.

Quando houver conflito entre linguagem comercial e clareza terapêutica, **prevalece a clareza terapêutica**.

---

## Capítulo 15 — Visão de futuro

O **Treatment Designer** será o principal diferencial competitivo da Oftware.

Hoje, plataformas de obesidade digital competem em prescrição, agenda ou pagamento. A Oftware competirá em **desenho de tratamento compartilhado** — onde médico e paciente veem o mesmo plano, no mesmo tempo, com a mesma linguagem.

### Centro da plataforma

Todos os módulos futuros deverão conversar com o Treatment Designer:

- Novo tipo de exame → aparece na timeline e na jornada.
- Novo canal de suporte → entra nos protocolos.
- Nova fonte de dados (wearables, integrações) → alimenta curvas e acompanhamento.
- Novo modelo de remuneração → consequência do plano, não entrada do fluxo.

### O que o paciente lembrará

Não será “quanto paguei”. Será **“como foi minha jornada até a meta”**.

### O que o médico ganhará

Não será “mais uma calculadora de preço”. Será **uma ferramenta de consulta** que estrutura a conversa difícil — meta, prazo, expectativa, acompanhamento — com evidência, dados da plataforma e respeito à autonomia do paciente.

---

## Decisão Arquitetural

**A partir deste documento, o Treatment Designer passa a ser o núcleo da experiência do paciente dentro da Oftware.**

Isso implica:

1. **Nomeação:** o produto deixa de ser definido como “Orçamento Terapêutico”. Orçamento é output; Treatment Designer é o produto.

2. **Priorização:** novas features devem avaliar primeiro “como se conectam ao Designer e à Jornada” — não “como se encaixam no fluxo financeiro”.

3. **Compatibilidade:** implementações em andamento (Plano Terapêutico Interativo, OI v0.1, modal de orçamento) são **degraus** da Versão 1 — não destinos finais.

4. **Governança:** nenhuma entrega futura altera prescrição, Firestore legado ou OI sem alinhamento explícito a este documento e a ADR subsequentes.

5. **Documentação:** `09_TREATMENT_DESIGNER.md` é a referência de produto. Documentos técnicos (`02_ORCAMENTO`, `08_PLANO_TERAPEUTICO`, etc.) permanecem como histórico e ponte de migração até serem consolidados.

**O Treatment Designer não é uma feature. É a arquitetura de produto da Oftware.**

---

*Próximo passo sugerido (fora do escopo deste documento): ADR técnico do Treatment Planning Engine — mapeamento de módulos, contratos de API e cronograma de migração Versão 1 → 2.*

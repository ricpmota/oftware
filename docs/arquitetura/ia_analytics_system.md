# IA ANALYTICS SYSTEM — OFTWARE

**Função:** definir **como** a Oftware **monitora**, **mede** e **interpreta** a IA em produção — painel de leitura que liga **operação** → **insights** → **ação** (aprendizado, experimentos, produto).  
**Camadas separadas:** (A) **observabilidade técnica** — latência, erros, disponibilidade; (B) **analytics de produto/IA** — qualidade percebida, jornada, negócio, segurança. Este doc privilegia **B**, referenciando **A** onde acoplada.

---

## 1. Visão geral

| Conceito | Conteúdo |
|----------|----------|
| **Por que analytics é essencial** | IA sem métricas vira caixa-preta: regressões passam despercebidas; CTAs e tons errados custam retenção; incidentes de segurança não têm baseline. |
| **Logs brutos** | Eventos atômicos (linhas/registros), alta cardinalidade; base para reprodução e debug. |
| **Métricas**= **Agregações** | Taxas, médias, percentis, contagens por dimensão e tempo; consumo de dashboard e alertas. |
| **Insights** | Perguntas respondidas (“o que subiu?”, “onde perdemos?”) + **hipótese** ou **decisão** priorizada — saída humana ou assistida, não automática só com threshold. |

**Papel no ciclo**  
**Operação** (telemetria) → **Analytics** (painéis + segmentos) → **Self-improvement** (backlog) / **Experimentação** (variantes) / **Produto** (UX). Analytics **não** substitui governança clínica ou jurídica.

---

## 2. O que deve ser medido

### 2.1 Métricas de uso

| Métrica | Uso |
|---------|-----|
| Volume de interações | Turnos ou mensagens / dia, tendência. |
| Usuários ativos | WAU/MAU **do chat** (ou feature-flag); separado do app geral. |
| Sessões por perfil | paciente \| médico \| outros. |
| Frequência de uso | mensagens por usuário ativo / semana. |

### 2.2 Métricas de qualidade

| Métrica | Uso |
|---------|-----|
| Taxa de feedback positivo | 👍 / (👍+👎), por tópico e variante. |
| Taxa de repetição de dúvida | Mesma intenção em janela curta — proxy de clareza. |
| Respostas mal-sucedidas | Marcadas por 👎, ou “correção do usuário”, ou abandono na sequência (proxy fraco). |
| Necessidade de fallback | Contagem de turnos com pergunta de clarificação ou “não sei” — sem PII no rótulo. |

### 2.3 Métricas de negócio (impacto indireto da IA)

| Métrica | Uso |
|---------|-----|
| Ativação | Passos pós-interação com IA (ex.: solicitação enviada) — só se **atribuição** for definida. |
| Adesão | Retorno ao app / chat em período T. |
| Reengajamento | Retorno após silêncio. |
| Retenção (cohort) | Curvas por cohort que **usou** IA vs controle (experimento). |
| Profundidade uso médico | Recorte funcional do produto (não misturar com “qualidade da resposta” no mesmo gráfico sem legenda). |

### 2.4 Métricas de segurança

| Métrica | Uso |
|---------|-----|
| Incidentes de risco | Flags de red flag, sintoma, modo **risco** disparado. |
| Encaminhamentos para médico | Turnos com recomendação de mensagem médica (contagem, não conteúdo clínico). |
| Encaminhamentos de emergência | Indicações a serviço de urgência — auditoria de volume e falsos positivos (processo manual). |
| Falhas críticas evitadas | **Não** mensurável direto — usar **proxi**: tempo até escalação, 👎 em contexto de sintoma, incidentes reportados. |

---

## 3. Segmentação dos dados

Dimensões obrigatórias em **canais** de análise (filtro cruzado):

| Dimensão | Valores |
|----------|---------|
| **Perfil** | paciente \| médico \| nutri \| personal \| lead |
| **Estágio da jornada** | alinhado ao classificador canônico do produto (sem redefinir aqui). |
| **Nível de risco** | baixo \| médio \| alto (comportamental / modo de resposta). |
| **Engajamento** | baixo \| médio \| alto (memória agregada). |
| **Modo da IA** | suporte \| risco \| crescimento \| eficiência *(rótulos estáveis no orquestrador)*. |

**Regra:** comparar segmentos só com **volume mínimo** acordado para evitar ruído (§7).

---

## 4. Eventos e dados coletados

### Tipos de evento

| Tipo | Exemplos de campos (sem PII) |
|------|------------------------------|
| **Conversa** | `message_id`, `turn_index`, `chars_in`, timestamps, `locale`, hash de sessão. |
| **Decisão (orchestrator)** | `strategy.mode`, `strategy.length`, `strategy.tone`, `experiment_id`, `variant_id`, `override_flags`. |
| **Feedback** | `vote`, `message_id`, versão prompt/orchestrator. |
| **Conversão / ação** | `action_type` (ex.: abriu_rota), `success`, **só** se produto emitir evento; sem inventar. |

### Estrutura

- **Envelope comum:** `event`, `ts`, `schema_version`, `service`, `release`.  
- **IDs:** preferir **hash** de usuário em camada analítica; separar **ambiente** (staging/prod).

### Separação operacional vs analítico

| Camada | Conteúdo |
|--------|-----------|
| **Operacional** | Traces, erro 5xx, timeout provider — retenção curta, foco SRE. |
| **Analítico** | Eventos de negócio/IA agregados — warehouse, retenção maior, acesso restrito. |

---

## 5. Dashboards principais

### 5.1 Dashboard executivo

| Bloco | Pergunta que responde |
|-------|-------------------------|
| Visão geral da IA | Volume, WAU chat, 👍 líquido, incidentes de segurança (contagem). |
| Impacto no negócio | Indicadores **explicitamente atribuíveis** ou **correlatos** com legenda de cautela. |

### 5.2 Dashboard operacional

| Bloco | Conteúdo |
|-------|----------|
| Volume | QPS conversacional, falhas API chat. |
| Erros | Taxa de erro, timeouts LLM, retries. |
| Latência | p50/p95 fim a fim e por etapa (orchestrator vs provider). |
| Incidentes | Links runbook, contagens por severidade. |

*Camada técnica explicitamente rotulada.*

### 5.3 Dashboard de comportamento

| Bloco | Conteúdo |
|-------|----------|
| Engajamento | frequência, profundidade de sessão. |
| Abandono | drop-off pós-turno (proxy). |
| Risco | distribuição de modos, contagens encaminhamento. |
| Reengajamento | retorno após inatividade. |

### 5.4 Dashboard de experimentação

| Bloco | Conteúdo |
|-------|----------|
| Variantes | tráfego % por `variant_id`. |
| Por experimento | KPI primário, guardrails, poder estatístico (se disponível). |
| Por segmento | só com célula mínima de dados. |

---

## 6. Alertas e detecção precoce

| Sinal | Possível problema |
|-------|-------------------|
| Pico de 👎 / queda de 👍 | Regressão de prompt, variante ruim, bug produto. |
| Aumento de fallback | Lacuna de conhecimento ou classificação errada. |
| Queda de ativação (cohort IA) | CTA confuso ou fricção antes do valor. |
| Queda de engajamento | Tom longo demais, ruido, ou fatores externos. |
| Latência p95 ↑ | Provider, payload, regressão orchestrator. |

**Quando alertar**  
- Só com **baseline** e **janela** definidos; **histerese** (evitar pager a cada pico de 1 h).  
- Severidade **P1** apenas para indisponibilidade ou possível **dano** (ex.: taxa anormal de “modo risco” mal classificado — revisão humana).

**Ruído vs real**  
- Exigir confirmação em **dois períodos** ou **dois sinais** (ex.: 👎 + repetição).  
- Segmentar: problema pode ser **só mobile** ou **só médico**.

---

## 7. Transformação de dados em insights

| Passo | Saída |
|-------|--------|
| **Métrica → pergunta** | “👎 subiu **em qual** tópico e **para qual** variante?” |
| **Priorização** | Impacto = Δ métrica × alcance × severidade; **segurança** sempre prioridade 0. |
| **Oportunidade** | Onde 👍 alto + baixa latência + baixa repetição — **escalar** prática (prompt ou UX). |

**Armadilhas** citadas no §12 — não concluir causa sem desenho experimental ou dados suficientes.

---

## 8. Integração com experimentação

| Função | Conteúdo |
|--------|----------|
| **Medir variantes** | Dashboard §5.4 alimentado pelos mesmos eventos §4. |
| **Definir vencedor** | KPI pré-registrado + guardrails; analytics **não** “escolhe” sozinho sem regra estatística acordada. |
| **Evitar interpretação errada** | Comparar **mesmo segmento** e **mesmo período**; controlar **release paralelo** do app. |

---

## 9. Integração com self-improvement

| Função | Conteúdo |
|--------|----------|
| **Alimentar aprendizado** | Insights viram **itens de backlog** com evidência (gráfico, volume N). |
| **Padrões recorrentes** | Agrupamento por `top_topic`, `strategy.mode`, versão. |
| **Backlog** | Prioridade §7; owners: produto, conteúdo, eng. |

---

## 10. Integração com orchestrator

| Função | Conteúdo |
|--------|----------|
| **Medir decisões** | Distribuição de `mode`, `length`, `tone`, taxa de **override** (ex.: sintoma suprimiu growth). |
| **Estratégia correta?** | Proxy: 👍, repetição, tempo até ação **se** medido; **não** há verdade única sem rótulo humano amostrado. |
| **Rastreio** | `dec_hash` ou payload redigido em log analítico para correlacionar decisão ↔ outcome. |

---

## 11. Governança dos dados

| Tema | Prática |
|------|---------|
| **Retenção** | Operacional curto; analítico conforme política; direito ao esquecimento mapeado. |
| **Privacidade / LGPD** | Base legal; DPIA quando agregação sensível; **minimização** de texto livre em lake. |
| **Minimização** | Não armazenar prontuário no mesmo stream que métricas de chat se evitável. |
| **Controle de acesso** | RBAC: executivo (agregado), produto (detalhe por tópico), eng (operacional), **sem** dados clínicos desnecessários. |

---

## 12. Limites

| Limite |
|--------|
| **Não** medir tudo sem hipótese — evita custo, ruído e **surveillance** desnecessária. |
| **Não** confundir **correlação** com **causalidade** (ex.: IA presente na tela de ativação). |
| **Não** decisões críticas (segurança, compliance) só com amostra fina ou métrica ambígua. |
| **Não** usar analytics para **punir** usuário ou médico individual sem processo claro. |

---

## 13. Futuro

| Direção |
|---------|
| **Analytics preditivo** — churn de uso do chat, recomendação de **conteúdo** (não tratamento). |
| **Dashboards tempo real** — streams para operações; cuidado com custo. |
| **Regressão automática** — comparar versão N vs N-1 em **shadow** ou **canário**. |
| **Inteligência de produto assistida** — LLM resume **drill-down** para PM, com trilha de auditoria. |

---

## Instrução final (continuidade)

Este documento define **como a Oftware enxerga a IA em produção**: eventos segmentados, painéis por finalidade, alertas disciplinados, passagem de **métrica → insight → backlog/experimento**, sempre com **governança** (§11) e limites epistemológicos (§12). Próximos passos de implementação escolhem stack (warehouse, BI) **fora** deste escopo conceitual.

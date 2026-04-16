# IA SELF IMPROVEMENT — OFTWARE

**Função:** definir **como** a IA **aprende com uso real**, **melhora ao longo do tempo** e **evolui decisões internas** (resposta, engine, comportamento, crescimento) **com governança** — sem auto-modificação irresponsável.  
**Contrato:** não substitui `ia_orchestrator.md`, `ia_memory_system.md`, `ia_engine_v1.md`, `ia_behavioral_layer.md`, `ia_growth_engine.md`, `ia_prompt_master_v1.md` — define **o processo** que alimenta revisões daqueles artefatos.

---

## 1. Visão geral

| Conceito | Conteúdo |
|----------|----------|
| **IA estática** | Prompt e políticas fixas; melhora só com deploy manual esporádico. Risco de drift entre produto real e documentação. |
| **IA adaptativa (controlada)** | Sinais do mundo real alimentam **métricas**, **backlog** e **versões** validadas de prompt/engine/políticas. O sistema “aprende” no sentido de **organização humana assistida por dados**, não necessariamente pesos de modelo em tempo real. |
| **Por que a Oftware precisa** | Saúde + vínculo médico–paciente geram **padrões de dúvida** e **falhas de clareza** que só aparecem em volume. Sem loop de melhoria, **retenção** e **qualidade percebida** caem. |
| **Impacto** | Melhor clareza → menos abandono por fricção; melhor classificação → menos respostas inadequadas; CTAs melhor calibrados → crescimento **ético**; tudo isso **sem** relaxar segurança clínica. |

---

## 2. Fontes de aprendizado

| Fonte | O que indica | Contribuição para melhoria |
|-------|--------------|------------------------------|
| **Mensagens dos usuários** | Intenções reais, vocabulário, estágio implícito. | Atualizar exemplos, FAQs, lacunas no RAG e no engine. |
| **Respostas da IA** | O que foi dito em produção (para auditoria). | Detectar tom errado, respostas longas demais, CTAs indevidos. |
| **Feedback explícito (👍 👎)** | Julgamento direto da utilidade. | Priorizar revisões de trechos de prompt ou de política por tópico. |
| **Feedback implícito** | Comportamento após a resposta (§6). | Medir **sucesso proxy** sem sobrecarregar o usuário. |
| **Padrões de abandono** | Queda após certos fluxos ou respostas. | Sinal de fricção de produto ou tom; revisar orchestrator/growth. |
| **Repetição de dúvidas** | Mesma pergunta ou paráfrase em janela curta. | UX, conteúdo insuficiente ou classificação errada de intenção. |
| **Erros de interpretação** | Usuário corrige (“não era isso”) ou desvia do esperado. | Ajuste de classificação ou de instruções no prompt master. |

---

## 3. Tipos de melhoria

### 3.1 Melhoria de resposta

| Alvo | Objetivo |
|------|----------|
| **Clareza** | Menos ambiguidade; um foco por turno. |
| **Tom** | Acolhimento (paciente) vs objetividade (médico) conforme política. |
| **Precisão** | Alinhamento a fatos de negócio (documentos canônicos), menos invenção. |

### 3.2 Melhoria de decisão (engine)

| Alvo | Objetivo |
|------|----------|
| **Classificação de intenção** | Menos confusão entre dúvida / sintoma / reclamação. |
| **Identificação de estágio** | Melhor vínculo entre texto e estágio operacional. |
| **Escolha de contexto** | RAG e anexos mais pertinentes por cluster de pergunta. |

### 3.3 Melhoria comportamental

| Alvo | Objetivo |
|------|----------|
| **Leitura de estado emocional** | Calibrar risco e comprimento sem “psicologizar” demais. |
| **Abordagem** | Quando reforçar vs encurtar (sempre dentro dos limites éticos). |

### 3.4 Melhoria de crescimento

| Alvo | Objetivo |
|------|----------|
| **Momentos de CTA** | CTAs só onde conversão **ética** e **taxa de sucesso** forem boas. |
| **Redução de abandono** | Corrigir gatilhos que empurram no momento errado. |

---

## 4. Coleta de dados

| Camada | O que é | Uso |
|--------|---------|-----|
| **Brutos** | Texto de mensagens, timestamps, ids de sessão, modelo, latência. | Replay seletivo, investigação de incidente. |
| **Processados** | Agregações: tópico inferido, intenção rotulada (humanamente ou modelo auxiliar), flags de resposta (comprimento, teve CTA). | Dashboards, triagem de melhorias. |

**Anonimização**

- Preferir **hash** de `userId`; evitar persistir CPF, endereço, exames no log de aprendizagem.  
- **Redação** automática de padrões sensíveis antes de armazenar texto para análise prolongada.  
- **Retenção** e base legal conforme time de privacidade; este doc assume **minimização**.

**Estruturação**

- Evento tipado: `interaction_record` com campos estáveis (versão do prompt, versão do orchestrator, `strategy.mode`, resultado de feedback, cluster semântico opcional).  
- Separar **log operacional** (curto prazo) de **warehouse** (análise).

---

## 5. Feedback explícito

| Aspecto | Definição |
|---------|-----------|
| **Avaliação** | 👍 / 👎 (ou escala mínima futura) ligada a `messageId` ou turno. |
| **Quando pedir** | Após respostas **longas** ou **procedimentais**; com baixa frequência para não cansar; nunca em momento de crise/emergência. |
| **Armazenamento** | Tabela/coleção `feedback_events` com referência ao hash de conversa, versão do sistema, **sem** PII desnecessária. |
| **Uso** | Ranking de “piores” tópicos; gatilho de **revisão humana**; **não** alterar prompt automaticamente só por 👎 isolado. |

---

## 6. Feedback implícito

| Sinal | Interpretação prudente |
|-------|-------------------------|
| **Mesma pergunta repetida** | Resposta não resolveu **ou** usuário não achou a tela **ou** ansiedade. |
| **Silêncio após resposta** | Neutro; combinar com retorno posterior antes de concluir falha. |
| **Abandono após resposta** | Sinal **fraco** sozinho; só priorizar se correlacionar com cluster/tópico. |
| **Retorno com dúvida semelhante** | Possível falha de clareza ou classificação errada no primeiro turno. |

**Regra:** implícito gera **hipótese**; confirmação vem de volume, amostra rotulada ou experimento.

---

## 7. Sistema de aprendizado

| Etapa | Conteúdo |
|-------|----------|
| **Identificar padrões** | Agrupar por tópico (cluster), por `strategy.mode`, por rota de perfil, por versão. |
| **Agrupar problemas** | Buckets: “classificação”, “RAG errado”, “tom”, “CTA indevido”, “bug produto”. |
| **Priorizar** | Impacto (volume × severidade) × custo de fix; **severidade** de segurança sempre no topo. |

**Separar**

- **Erros frequentes** — reprodutíveis, alta prioridade.  
- **Oportunidades** — ganhos incrementais (melhor micro-copy, melhor exemplo no prompt).  

---

## 8. Atualização do sistema

| Artefato | Como o aprendizado impacta |
|----------|----------------------------|
| **Prompt master** | Novos exemplos, proibições adicionais, clareza de formato — via **PR + versão** (`v1`, `v2`). |
| **Engine de decisão** | Ajuste de prioridades textuais ou matriz de classificação — **documento**, não patch silencioso. |
| **Behavioral layer** | Refinar pesos heurísticos ou limiares de risco — **changelog**. |
| **Growth engine** | Recalibrar gatilhos e frequência de CTA — **experimentos** com controle. |

**Obrigatório:** **nenhuma** atualização **automática** em produção sem **validação humana** (revisão médica/jurídica/produto conforme o tipo de mudança).

---

## 9. Segurança do aprendizado

| Risco | Mitigação |
|-------|-----------|
| **Aprendizado incorreto** | Dados espúrios, ataques de envenenamento → validação, limites de taxa, filtro de conteúdo. |
| **Viés** | Amostra torta (só um tipo de usuário) → monitorar distribuição por perfil e estágio. |
| **Validação de mudanças** | Checklist: segurança clínica, LGPD, consistência com regras de negócio; teste em staging; rollout gradual. |

---

## 10. Integração com orchestrator

| Ponto | Conteúdo |
|-------|----------|
| **Influência** | Melhorias **versionadas** expõem **flags** ou **política** (ex.: “CTA growth: versão B”) que o orchestrator lê **antes** do pipeline. |
| **Uso** | O orchestrator **não** “treina” online; consome **configuração** e **histogramas** opcionais (ex.: tópico quente da semana) só se produto habilitar. |

---

## 11. Ciclo de evolução

1. Interação ocorre.  
2. Dados coletados (brutos + eventos tipados).  
3. Agregação e detecção de padrões.  
4. Sugestões de melhoria priorizadas (backlog).  
5. **Validação humana** + experimento quando aplicável.  
6. Release de nova **versão** de prompt/política/engine doc.  
7. Monitorar regressão (👎, repetição, incidentes).  

---

## 12. Limites

| Limite |
|--------|
| A IA **não** deve aprimorar-se com comportamentos **antiéticos**, **inseguros** ou **mensagens adversárias** sem filtro. |
| **Não** mudar automaticamente **regras críticas** (emergência, proibição de prescrição, conformidade legal). |
| Aprendizado **não** substitui **validação humana** nem parecer clínico/jurídico quando o tema exigir. |
| **Fine-tuning** de modelo base com dados de produção só com pipeline aprovado (§13). |

---

## 13. Futuro

| Possibilidade |
|---------------|
| **Fine-tuning** ou adapters em modelo proprietário com dataset curado e anonimizado. |
| **Modelos próprios** ou roteamento multi-modelo por modo (já previsto no orquestrador como evolução). |
| **Personalização por usuário** — só com consentimento explícito e limites de dado. |
| **Aprendizado em tempo real** — alto risco; manter **shadow mode** ou atraso de uma versão até validação. |

---

## Instrução final (continuidade)

Este arquivo define **o sistema de aprendizado contínuo sob controle**: dados → padrões → sugestões → **validação** → versão → orquestrador. Qualquer evolução posterior deve **preservar** segurança, não alterar regras críticas sem processo e **versionar** mudanças para auditoria.

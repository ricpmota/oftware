# IA EXPERIMENTATION ENGINE — OFTWARE

**Função:** definir **como** a Oftware **testa** variações de estratégia de IA, **compara** resultados com dados reais e **promove** melhorias **só** sob **controle**, **ética** e **validação**.  
**Não implementa** pipelines; **não** autoriza auto-mudança silenciosa de políticas críticas. Relaciona-se conceitualmente com `ia_orchestrator.md`, `ia_self_improvement.md`, `ia_memory_system.md`.

| Diferencial | Significado |
|-------------|-------------|
| **Produto comum** | Muda uma vez → espera → olha resultado agregado (sem plano de variante nem alocação limpa). |
| **Produto avançado (Oftware)** | **Testa** variantes em paralelo → **compara** com métrica pré-definida → **aprende** o que vence **por segmento** → **escala** só após **gate** (rollout gradual). |

**O motor faz (em produção)**  
- Rodar **hipóteses já charteradas**: versões de resposta, CTA, tom, tamanho, estrutura, sub-prompts permitidos.  
- **Medir impacto real** (satisfação, proxies de clareza, ações telemetradas quando existirem).  
- **Escolher melhor candidato** estatisticamente + guardrails — saída padrão = **recomendação** documentada para **gate** de promoção (§11); **nunca** promover variante sensível ou em tráfego de risco sem validação explícita (§8).

---

## 1. Visão geral

| Modo | Descrição |
|------|------------|
| **Melhoria manual** | Humano altera prompt/política após insight; sem braço estatístico estruturado. |
| **Experimentação controlada** | Variantes **pré-aprovadas** expostas a **subconjuntos** de tráfego; medição **contínua**; comparação **replicável**. |
| **“Automático” permitido aqui** | Alocação em bucket, execução da variante, coleta de eventos, **cálculo** de vencedor, alertas de regressão. |
| **“Automático” proibido sem gate** | Soltar política **nova** em 100% do tráfego, mudar regras de segurança, ou promover variante **clínica/ética sensível** sem validação humana explícita. |

**Papel na evolução**  
- Fecha o gap entre “achamos melhor” e “**mediu** melhor **neste segmento**”.  
- Alimenta **self-improvement** com **evidência**, não só com opinião.  
- Habilita **teste de hipóteses em série** sem redeploy manual a cada micro-ajuste (via flags/variantes), mantendo **auditoria** (`exp_id`, `variant`).  

---

## 2. O que pode ser testado

| Dimensão | Exemplos de variantes |
|----------|------------------------|
| **Tamanho da resposta** | curto / médio / longo (instrução ao modelo + limite de tokens). |
| **Tom** | acolhedor / neutro / objetivo (com limites por perfil). |
| **Presença de CTA** | com / sem micro-CTA. |
| **Tipo de CTA** | procedural vs reengajamento vs indicação (só se produto permitir). |
| **Estrutura da resposta** | ordem dos blocos (validação → direção → passo) com microcopy alternativo. |
| **Variações do prompt** | sub-seções do master, exemplos few-shot, lista de proibições adicional **não clínica**. |

**Nota (visão “curto vs médio”):** **curto / médio / longo** = eixo **tamanho**; **acolhedor / objetivo** = eixo **tom**. Na prática, “testar tom curto vs médio” = testar **comprimento** com tom fixo **ou** **multivariável** tom × tamanho (§3), nunca confundir com duração de tratamento clínico.

---

## 3. Tipos de experimento

| Tipo | Uso |
|------|-----|
| **A/B simples** | Duas variantes; mesmo segmento; um KPI primário. |
| **Multivariável** | Combinações controladas (ex.: tom × tamanho); exige **mais volume** e análise cautelosa. |
| **Por segmento** | Experimentos **independentes** para paciente vs médico; nunca misturar interpretação entre perfis. |

---

## 4. Segmentação

Critérios **combináveis** para alocação **estável** (hash de `userId` + `experimentId`):

| Eixo | Níveis exemplares |
|------|-------------------|
| **Perfil** | paciente \| médico \| outros papéis cobertos pelo produto. |
| **Estágio da jornada** | sem vínculo \| pendente \| em tratamento \| reengajamento (definições operacionais do engine). |
| **Risco** | baixo \| médio \| alto — **alto excluído** de experimentos de growth (§8). |
| **Engajamento** | baixo \| médio \| alto (memória agregada). |

**Regra:** segmentos pequenos → **não** concluir “vencedor” estatisticamente.

---

## 5. Métricas de sucesso

| Métrica | Papel |
|---------|--------|
| **Satisfação** | 👍/👎 por turno (taxa, por tópico). |
| **Repetição de dúvida** | Queda = melhor clareza (proxy). |
| **Abandono de sessão** | Interpretar com cautela (causas externas). |
| **Conversão de ação** | Conclusão de passo declarado (ex.: “foi até área X”) só se **telemetria** existir; senão **não** forjar métrica. |

**Primário por experimento:** escolher **um** KPI principal + guardrails (ex.: 👎 não pode subir X%).

---

## 6. Sistema de execução

| Etapa | Conteúdo |
|-------|----------|
| **Dividir usuários** | Buckets determinísticos (hash) ou **feature flag** por percentual com sticky assignment. |
| **Aplicar variações** | Orchestrator resolve `experiment_variant_id` → injeta `strategy` / instruções adicionais **limitadas** ao escopo aprovado. |
| **Registrar** | Evento: `exp_id`, `variant`, `segment`, versões de sistema, resultado de métricas agregadas posteriormente. |
| **Loop fechado operacional** | Charter aprovado → tráfego → logs → painel → decisão estatística → **recomendação de promoção** (§11) — a “IA que testa sozinha” opera **neste anel**, não no anel de **governança** sem humano. |

---

## 7. Avaliação de resultados

| Regra | Detalhe |
|-------|---------|
| **Comparar** | Intervalo de confiança ou teste adequado ao volume; **pré-registrar** hipótese e duração mínima. |
| **Melhor** | Só declarar vencedor se KPI primário melhora **e** guardrails ok **e** **sem** regressão em subgrupo crítico. |
| **Evitar erro** | Parar cedo só por **segurança**; por performance, evitar **early peek** sem correção; checar **sazonalidade** e incidentes de produto paralelos. |

---

## 8. Segurança dos experimentos

| Proibição / limite |
|--------------------|
| **Não testar** prescrição, doses, diagnóstico, minimização de sintoma grave, ou mensagens que **atrasem** encaminhamento de emergência. |
| **Não testar** coleta extra de dado sensível “para ver se converte”. |
| **Ética:** sem manipulação, sem falsa urgência, sem exploração de vulnerabilidade emocional **para** KPI. |
| **Clínico:** modos **risco** e **alto risco comportamental** → **tráfego fixo** na política aprovada; **excluir** variações experimentais. |

---

## 9. Integração com orchestrator

| Ponto | Conteúdo |
|-------|----------|
| **Escolha de variação** | Passo após prioridades de segurança: `resolveVariant(experimentConfig, userContext)`. |
| **Aplicação** | Merge **não destrutivo** com `strategy` base; overrides de experimento **não** podem desligar regras globais (§8). |
| **Telemetria** | `decision_log` ganha campo `experiment` (id + variant). |

---

## 10. Integração com self-improvement

| Direção | Conteúdo |
|---------|----------|
| **Experimentos → aprendizado** | Resultados viram **evidência** no backlog (priorização de merge da variante vencedora na política estável). |
| **Aprendizado → experimentos** | Hipóteses geradas por clusters de falha **geram novos** experimentos **com charter** e aprovação. |

**Nada circula em loop fechado** sem etapa humana de **promoção** (§11).

---

## 11. Rollout de melhorias

| Fase | Ação |
|------|------|
| **Promover** | Variante vencedora vira **default** em documento/version bump (`prompt_master`, política orchestrator). |
| **Gradual** | 5% → 25%/50% → 100% com monitoramento de 👎 e incidentes. |
| **Rollback** | Flag global que reverte variant em minutos; playbook de comunicação se impacto externo. |

---

## 12. Limites

| Limite |
|--------|
| **Não** testar em situação de risco clínico ou alto risco comportamental. |
| **Não** afetar regras de **segurança** ou conformidade. |
| **Não** sacrificar **confiança** por ganho marginal de conversão. |
| **Não** conduzir experimento sem **DPIA**/alistamento privacidade quando dados forem sensíveis em agregação. |

---

## 13. Futuro

| Direção |
|---------|
| **Testes automáticos inteligentes** — geração de hipóteses assistida, ainda com **human-in-the-loop**. |
| **Otimização contínua** — bandits **só** em segmentos de **baixo risco** e com **orçamento** de exploração capado. |
| **Tempo real** — seleção dinâmica de estratégia por contexto; exige **simulador** e **guardrails** fortes. |

---

## Instrução final (continuidade)

Este documento é o **contrato de experimentação**: hipótese → alocação → métrica → decisão estatística → **promoção humana** → rollout gradual. Qualquer automação adicional deve **preservar** as exclusões do §8 e os limites do §12.

---

## Tradução do que o sistema representa (evolução)

| Estágio | Significado |
|---------|-------------|
| **IA responde** | Resposta pontual ao usuário. |
| **IA decide** | Orquestrador + engine escolhem modo, tom e política dentro de regras. |
| **IA melhora** | Self-improvement estruturado: dados → backlog → versão validada. |
| **IA se otimiza (com controle)** | Experimentation engine mede variantes **reais**, promove só o **vencedor validado** e **nunca** troca segurança ou ética automaticamente. |

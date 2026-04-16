# Sistema de memória — IA Oftware (`ia_memory_system`)

**Objetivo:** definir **como** a IA armazena memória do usuário, **recupera** contexto e **evolui** ao longo do tempo — sem substituir o prontuário clínico nem o Firestore de produto (`pacientes`, `leads`, etc.).  
**Relacionados:** `docs/arquitetura/ia_runtime_architecture.md`, `docs/conhecimento/ia_engine_v1.md`, `docs/conhecimento/regras_negocio.md`.

---

## 1. Visão geral

| Modo | Comportamento |
|------|----------------|
| **IA sem memória** | Cada turno depende só do system prompt + mensagem atual (+ RAG estático). Retenção emocional zero; repete explicações; não detecta padrão de risco. |
| **IA com memória** | O servidor injeta **sinais derivados** de interações anteriores (estágio inferido, engajamento, risco leve, tom preferido). Respostas mais **consistentes**, menos repetitivas, melhor **conduta** alinhada ao perfil. |

**Por que importa (Oftware)**  
- **Retenção:** paciente que se sente “lembrado” tende a voltar ao app.  
- **Resultado clínico (indireto):** memória ajuda a **encaminhar** cedo ao médico e a **reduzir abandono** por fricção — **não** substitui decisão clínica.  
- **Eficiência:** médico recebe respostas de apoio ao produto mais curtas quando o sistema já sabe que domina o painel.

**Princípio:** memória da IA = **metadados de conversa e comportamento no chat**; **não** cópia do prontuário nem substituto do registro médico legal.

---

## 2. Tipos de memória

### Curto prazo

| Tipo | Conteúdo | Onde vive |
|------|----------|-----------|
| **Conversa atual** | Mensagens do turno ativo. | Cache / sessão Redis ou memória do processo; opcionalmente Firestore `session` com TTL. |
| **Últimas mensagens** | Janela deslizante (ex.: últimas 10–20 trocas). | Enviada ao LLM como `messages[]`; pode truncar com resumo. |

### Médio prazo

| Tipo | Conteúdo | Onde vive |
|------|----------|-----------|
| **Sessões recentes** | IDs de conversa, temas principais por sessão. | Firestore ou tabela auxiliar; agregação por dia/semana. |
| **Histórico de dúvidas** | Tags: `login`, `solicitacao`, `financeiro`, `sintoma_reportado`, etc. | Campos agregados no documento de memória (`topTopics`, `lastIntent`). |

### Longo prazo

| Tipo | Conteúdo | Onde vive |
|------|----------|-----------|
| **Perfil derivado** | “Iniciante no app”, “já domina solicitações”, “médico modo escala ativo”. | Documento `user_memory` (§4). |
| **Comportamento / padrões** | Frequência de uso do chat, tendência a desânimo, picos de ansiedade em pendência. | Campos numéricos / enums; **atualização incremental** (§6). |

---

## 3. O que salvar por usuário

### Paciente

| Campo conceitual | Uso |
|------------------|-----|
| **Estágio** | `sem_login` \| `sem_medico` \| `aguardando_aprovacao` \| `em_tratamento` \| `intercorrencia` \| `desanimo` \| `evolucao` — alinhado ao engine (`ia_engine_v1` §3). Pode espelhar **status de negócio** quando disponível no servidor sem duplicar prontuário. |
| **Engajamento** | `baixo` \| `medio` \| `alto` — derivado de frequência de mensagens, dias desde último chat, repetição de “não entendi”. |
| **Dúvidas recorrentes** | Top 3 tópicos ou contadores por tag. |
| **Sinais de risco** | `nenhum` \| `desanimo` \| `abandono_declarado` \| `sintoma_recorrente_nao_medico` — **não** diagnóstico; gatilho para tom e para **encaminhar** humano. |

### Médico

| Campo conceitual | Uso |
|------------------|-----|
| **Tipo de uso** | `clinico` \| `operacional_escala` \| `misto` — inferido por rotas/contexto ou declaração na UI. |
| **Domínio do sistema** | `iniciante` \| `intermediario` \| `avancado` — heurística: primeiras dúvidas genéricas vs perguntas finas. |
| **Padrões de dúvida** | Contagem: pacientes, financeiro, escalas, integrações. |

**Regra:** nada disso precisa ser **visível** ao usuário final; é **cálculo de sistema** (§7).

---

## 4. Estrutura no banco (Firestore)

**Coleção sugerida (dedicada à IA):** `user_memory`  
*(Nome final a cargo do time; evitar colidir com coleções clínicas existentes.)*

**Documento:** `user_memory/{userId}` — um por conta autenticada.

**Exemplo de shape (conceitual) — documento único:**

```json
{
  "userId": "firebase-uid",
  "roleHint": "paciente",
  "stage": "em_tratamento",
  "lastInteractions": {
    "lastChatAt": "2026-03-24T12:00:00Z",
    "messageCount30d": 12,
    "sessionCount30d": 4
  },
  "riskLevel": "baixo",
  "behaviorProfile": {
    "engagement": "medio",
    "expertiseLevel": "iniciante",
    "usoTipo": "clinico"
  },
  "topTopics": ["solicitacao", "mensagens"],
  "version": 1,
  "updatedAt": "2026-03-24T12:00:00Z"
}
```

Extensões opcionais: `topicCounts` (mapa), `lastStageUpdatedAt`, `requiresHumanFollowUp` (boolean, sem dados clínicos).

**Índices:** consulta por `userId` apenas (documento único); agregações feitas em **write path** após cada chat.

**Alternativa:** subcoleção `user_memory/{userId}/sessions/{sessionId}` para médio prazo detalhado; `user_memory/{userId}` mantém **agregados**.

---

## 5. Recuperação de memória

**Fluxo (antes de chamar o LLM):**

1. Autenticar `userId`.  
2. `getDoc(user_memory/{userId})` (ou cache).  
3. Montar **bloco compacto** para o prompt, ex.:  

   `MEMÓRIA_RESUMIDA: perfil=… estágio=… engajamento=… risco=… tópicos frequentes=…`

4. Concatenar com system / RAG (`ia_runtime_architecture` §3).  
5. Se documento **não existir**, criar lazy no primeiro chat ou após primeira classificação.

**Não** injetar texto longo: limite de **~300–800 caracteres** de memória resumida para não estourar contexto.

---

## 6. Atualização da memória

**Disparo:** após resposta bem-sucedida do LLM (e opcionalmente após mensagem do usuário, **antes** do LLM, só para contadores).

| Atualização | Como |
|-------------|------|
| **Estágio** | Classificador leve ou saída estruturada do LLM (JSON mode) **validada** por regras; sobrescrever `stage` só se confiança ≥ limiar ou confirmação de dados de negócio no servidor. |
| **Risco** | Atualizar se intenção = sintoma, abandono, desânimo repetido; decaimento temporal (ex.: risco `alto` de chat não vira permanente sem novos sinais). |
| **Comportamento** | Incrementar `messageCount30d`, recalcular `engagement`; ajustar `expertiseLevel` após N interações sem dúvidas “onboarding”. |
| **Tópicos** | Merge com contagem ou lista LRU. |

**Transação:** preferir **batched write** ao final da requisição para não bloquear streaming (se houver).

---

## 7. Regras de uso da memória

| Regra |
|-------|
| **Nunca** usar dados sensíveis indevidamente: não colocar CPF, exames, endereço no blob de memória da IA; **não** ler prontuário inteiro para “lembrar” no chat. |
| **Não expor** histórico bruto ao usuário como “você perguntou X no dia…” — a menos que produto decida feature explícita de privacidade. |
| **Uso exclusivo** para melhorar **tom**, **brevedade** e **roteamento**; não para exibir score ao paciente. |
| **Consentimento / LGPD:** finalidade, base legal e retenção devem ser alinhados com jurídico; este doc assume **minimização** e **anonimização** em logs agregados. |

---

## 8. Exemplos práticos

### Paciente desanimado (padrão)

- **Memória:** `riskLevel=medio`, `topTopics` inclui `desanimo`, `stage=desanimo`.  
- **Efeito:** IA usa **validação** mais forte, evita tutorial longo, **um** passo + texto para mensagem ao médico (`paciente_mente`).

### Paciente iniciante

- **Memória:** `expertiseLevel` inexistente ou `engajamento` baixo, poucas sessões.  
- **Efeito:** IA **expande** explicação em 1 nível, define termos; mantém próximo passo único.

### Paciente avançado

- **Memória:** muitas sessões, poucas dúvidas “onde fica”; `engagement=alto`.  
- **Efeito:** IA **encurta**, vai direto ao menu/ação; confirma só se ambíguo.

*(Para médico: mesmo lógica — iniciante recebe caminho de menu; avançado recebe atalhos verbais.)*

---

## 9. Integração com engine

| Ordem sugerida | Papel da memória |
|----------------|------------------|
| **1** | Carregar `user_memory` + **curto prazo** (histórico). |
| **2** | **Pré-classificação:** se `stage` persistido é recente (<24–48h) e mensagem curta, usar como **prior** para o engine; senão, reclassificar. |
| **3** | **Engine** (`ia_engine_v1`): memória **influencia** escolha de ramo (ex.: desânimo prioriza §9 jornada + risco médio) mas **não** substitui detecção de **sintoma** no texto atual. |
| **4** | **Risco:** memória `alto` anterior + nova mensagem leve → ainda assim passar por **checagem de red flag** no turno atual. |
| **5** | **Pós-resposta:** persistir atualizações (§6). |

**Regra:** `memory → classificação → árvore de decisão → LLM → atualização de memória`.

---

## 10. Limites

| Limite |
|--------|
| A IA **não assume** fatos não confirmados (ex.: “você já tem médico” sem dado no servidor ou na mensagem). |
| Em **dúvida**, **validar** com **uma pergunta** ou usar apenas o que está em **memória** + **input** explícito. |
| Memória **desatualizada** (ex.: paciente mudou de médico ontem) pode induzir erro — por isso **TTL** ou **refresh** quando o backend detecta mudança de `medicoResponsavelId` / status de solicitação (`regras_negocio`). |
| Conflito **memória vs regra de negócio** → **prevalece** regra de negócio e o documento de memória deve ser **corrigido** no mesmo request. |

---

*Documento v1 — implementar writes/reads em `user_memory` quando o chat Oftware for ligado à API (`ia_runtime_architecture`).*

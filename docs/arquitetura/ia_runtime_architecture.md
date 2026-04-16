# Arquitetura de runtime — IA Oftware (`ia_runtime_architecture`)

**Objetivo:** descrever como a IA da Oftware **deve funcionar em produção** (Next.js App Router, rotas API, LLM, contexto documental). Não substitui implementação: é o **alvo** para engenharia.  
**Prompt e motor de decisão:** `docs/conhecimento/ia_prompt_master_v1.md` + `docs/conhecimento/ia_engine_v1.md`.

---

## 1. Visão geral da arquitetura

```
USER (browser/app)
    ↓ mensagem
FRONTEND (componente de chat)
    ↓ HTTPS
API Next.js (Route Handler)
    ↓ montagem de contexto + autorização
ENGINE (classificação leve + seleção de docs + montagem de mensagens)
    ↓ HTTPS
LLM (OpenAI ou Google Gemini / Vertex)
    ↓ texto
API → FRONTEND → USER
```

| Camada | Responsabilidade |
|--------|------------------|
| **Frontend (chat)** | UI, histórico local, envio de `message` + identificação de sessão; **não** enviar prontuário completo no cliente. |
| **API** | Autenticação, validação, limites de taxa, chamada ao engine, logs redigidos. |
| **Engine** | Resolver perfil/estágio (ou consumir sinal do frontend), escolher documentos, compor system + context + user, acionar LLM, pós-processamento mínimo. |
| **LLM** | Gerar resposta obedecendo ao system prompt; sem acesso direto ao banco. |

**Precedente no repositório:** existem rotas que já integram **Gemini** (ex.: fluxo `chatnutri`) — a IA “Oftware” pode **reutilizar o mesmo padrão** de serviço + Route Handler, com **prompt e política** próprios.

---

## 2. Fluxo de execução

1. **Usuário envia mensagem** no chat (frontend).  
2. **Frontend** chama a API com **corpo mínimo** (`message`, identificadores de sessão; opcionalmente `role` declarado pela UI).  
3. **Backend** valida **sessão** (Firebase / cookie / token existente no projeto) e obtém **`userId`** (e papéis reais no servidor, não só o corpo).  
4. **Engine** infere ou confirma **contexto**: `role` efetivo (paciente, médico, …), opcionalmente estágio da jornada (heurística ou estado persistido).  
5. **Seleção de documentos** (RAG leve — §5): carrega **trechos ou arquivos inteiros pequenos** — nunca a pasta inteira sem critério.  
6. **Montagem do prompt** (§3): system = prompt master; bloco de contexto; últimas *N* mensagens; user = mensagem atual.  
7. **Chamada ao LLM** com timeout e limite de tokens (§7).  
8. **Resposta** devolvida ao cliente; opcional persistência de log (§9).  
9. **Frontend** exibe texto; opcionalmente guarda **messageId** para feedback.

---

## 3. Montagem do prompt

| Parte | Fonte |
|-------|--------|
| **System prompt** | Conteúdo canônico de `docs/conhecimento/ia_prompt_master_v1.md` (bloco “PROMPT DO SISTEMA”), possivelmente **compactado** em versão interna “production” se o arquivo evoluir. |
| **Contexto dinâmico** | Fatias de: `paciente_mente.md` **ou** `medico_mente.md` conforme perfil; `jornada_paciente.md` se paciente **e** intenção/jornada; `regras_negocio.md` quando a pergunta for status, vínculo, permissão, lead, financeiro. |
| **Não obrigatório sempre** | `ia_engine_v1.md` pode ir **resumido** no system ou **só** na cabeça do produto — o master prompt já incorpora o fluxo; o engine completo serve documentação e auditoria. |
| **Mensagens** | Histórico recente (ex.: últimas 10 trocas) + **user** = input atual. |

**Ordem sugerida para o LLM:**  
`[SYSTEM: master + regras]` → `[SYSTEM ou USER auxiliar: trechos RAG]` → `[USER/ASSISTANT alternados…]` → `[USER: nova mensagem]`.

---

## 4. Classificação antes da IA (opcional otimização)

| Ideia | Benefício |
|-------|-----------|
| **Pré-classificar perfil** | UI já sabe se o chat abriu em `/meta` vs `/metaadmin` → enviar `role` **hint**; servidor **confere** com claims/Firestore. |
| **Heurística simples** | Palavras-chave no primeiro turno (CRM, pacientes, escala) vs (peso, sintoma, solicitação) para escolher **quais docs** carregar antes do LLM. |
| **Redução de tokens** | Menos texto no contexto = menor custo e menor risco de “perder” instruções do system. |
| **Classificador barato** | Modelo pequeno ou regras; **opcional** — o master prompt já manda o LLM classificar internamente. |

**Regra:** a decisão de segurança (sintoma, emergência) pode exigir **camada única** no servidor (regex/lista de red flags) **antes** do LLM para latência e consistência.

---

## 5. Estratégia de contexto (RAG leve)

**Princípio:** não enviar **todos** os arquivos de `docs/conhecimento/` em toda requisição.

| Tipo de pergunta (detectável) | Documentos candidatos |
|------------------------------|------------------------|
| Tom, medo, objeção (paciente) | `paciente_mente.md` (+ trecho de `jornada_paciente.md` se estágio conhecido) |
| Tom, objeção (médico) | `medico_mente.md` |
| Status, vínculo, lead, permissão, financeiro | `regras_negocio.md` |
| Navegação genérica | Trecho do mapa de rotas ou FAQ (futuro `faq_chunks.md`) — **não inventar** tela |

**Implementação leve:**  
- Índice manual por **tags** no front-matter dos `.md` **ou**  
- Embeddings em vector store **ou**  
- Só **árvore fixa** “se role=paciente carregar [A,B]” na v1.

---

## 6. Estrutura da API

**Rota alvo (exemplo de contrato):** `POST /api/ia/chat`

Corpo sugerido:

```json
{
  "message": "string",
  "userId": "string",
  "role": "paciente | medico | nutricionista | personal | lead",
  "conversationId": "string (opcional)",
  "locale": "pt-BR (opcional)"
}
```

**Notas de implementação**

- **`userId`:** idealmente **omitido do corpo** e derivado do **token** no servidor; se presente, **deve coincidir** com o usuário autenticado.  
- **`role`:** tratado como **hint**; servidor valida contra perfil real para evitar **elevação de privilégio**.  
- **Resposta:** `{ "reply": "string", "conversationId": "…", "meta": { "provider": "openai|google", "model": "…" } }` — `meta` opcional e sem dados sensíveis.

*Esta rota é **especificação**; implementar no repositório quando o produto for ligar o chat Oftware.*

---

## 7. Integração com LLM

| Provider | Uso típico | Observação |
|----------|------------|------------|
| **OpenAI (GPT)** | Chat completions / responses API | Variáveis: `OPENAI_API_KEY`; modelo configurável por ambiente. |
| **Google (Gemini)** | API Gemini ou **Vertex AI** | Já há uso de Gemini em fluxos do projeto (ex.: nutri); reutilizar **padrão de cliente** e política de retry. |

**Trocar provider**

1. Extrair interface interna: `completeChat({ system, messages, maxTokens, timeout })`.  
2. Implementação **OpenAI** vs **Gemini** atrás da mesma interface.  
3. Selecionar via **env** (`LLM_PROVIDER=openai|google`) sem alterar a rota HTTP.  
4. Manter **mesmo system prompt**; validar limites de tamanho por modelo.  

---

## 8. Tratamento de erro

| Caso | Comportamento |
|------|----------------|
| **Timeout** | Retornar erro controlado ao frontend + mensagem amigável genérica (“Não foi possível concluir agora”) + **não** duplicar conteúdo clínico inventado. |
| **Falha de resposta** (5xx provider) | Retry **limitado** com backoff; se falhar, fallback (abaixo). |
| **Fallback padrão** | Resposta curta + **um** próximo humano (suporte / médico conforme contexto) + opcional **ticket** interno. |
| **Conteúdo bloqueado pelo provider** | Logar código; fallback neutro; não expor detalhe técnico ao usuário final. |

---

## 9. Logs e aprendizado

| Dado | Uso |
|------|-----|
| **Pergunta** (hash ou texto redigido) | Métricas, clusters de intenção, melhoria de RAG. |
| **Resposta** | Qualidade, regressões entre versões de prompt. |
| **provider, model, latency** | Custo e SLO. |
| **feedback explícito** (👍/👎) | Ajuste fino de trechos do master ou dos docs. |

**Privacidade:** armazenar **mínimo** necessário; preferir **hash** de `userId` + retenção definida; **nunca** logar token ou prontuário completo em claro.

**Melhoria contínua:** versionar `ia_prompt_master_v1` (`v2`, changelog) e **não** “aprender” pesos no modelo base sem processo formal (fine-tuning é fora do escopo deste doc).

---

## 10. Segurança

| Tema | Prática |
|------|---------|
| **Dados sensíveis** | O LLM **não** precisa receber nome completo, CPF, exames, endereço — só o necessário para o tom (“paciente autenticado” basta). |
| **Filtrar inputs** | Limite de tamanho; bloqueio de **prompt injection** óbvia (instruções do tipo “ignore o system”); sanitização básica. |
| **Controle por usuário** | Cada requisição amarra ao **mesmo** `userId` autenticado; contexto RAG **só** de documentos **públicos internos** (policy docs), **nunca** dados de outro paciente. |
| **Saída** | Opcional: filtro de PII na resposta; garantir que respostas **não** vazem dados de terceiros. |
| **Compliance** | IA de produto ≠ prontuário: decisões de **LGPD** (base legal, DSR) ficam com jurídico; este doc assume **minimização**. |

---

## Referências rápidas

| Artefato | Caminho |
|----------|---------|
| Prompt master | `docs/conhecimento/ia_prompt_master_v1.md` |
| Engine | `docs/conhecimento/ia_engine_v1.md` |
| Regras de negócio | `docs/conhecimento/regras_negocio.md` |
| Mente paciente / médico | `docs/conhecimento/paciente_mente.md`, `medico_mente.md` |
| Mapa mestre (incl. §14 IA) | `docs/00_mapa_mestre_oftware.md` |

---

*Documento de arquitetura v1 — alinhar com implementação real ao criar `app/api/ia/chat` (ou path definitivo escolhido pelo time).*

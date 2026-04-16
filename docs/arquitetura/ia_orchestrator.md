# Orquestrador da IA — Oftware (`ia_orchestrator`)

**Objetivo:** especificar o **componente central** que coordena **memória**, **camada comportamental**, **motor de crescimento**, aplica o **engine de decisão** e define a **estratégia final** da resposta antes de chamar o LLM.  
**Não substitui** os módulos citados — **compõe** o fluxo. Referências: `ia_memory_system.md`, `ia_behavioral_layer.md`, `ia_growth_engine.md`, `ia_engine_v1.md`, `ia_runtime_architecture.md`, `regras_negocio.md` (contexto factual).

---

## 1. Visão geral

| Abordagem | Descrição |
|-----------|------------|
| **IA modular** | Cada concern (RAG, prompt, LLM) existe isolado; sem coordenação, ordem de precedência fica **ambígua** e **crescimento** pode conflitar com **risco**. |
| **IA orquestrada** | Um **orchestrator** executa um **pipeline** fixo, aplica **prioridades** e produz um **plano de resposta** (modo, tom, tamanho, CTA) consumido pelo montador de prompt e pelo LLM. |

**Papel do orchestrator**  
- Único lugar que decide **o quê** entra na chamada ao modelo e **com quais parâmetros de política** (não confundir com hiperparâmetros técnicos do provider).  
- Garante: **segurança primeiro**, **negócio** consistente, **comportamento** e **crescimento** só quando permitido.

---

## 2. Pipeline completo

Ordem **obrigatória** por requisição (uma mensagem do usuário):

1. **Entrada:** validar auth, obter `userId`, ler corpo (`message`, hints de `role` / rota).  
2. **Carregar memória:** `get user_memory/{userId}` (ou criar lazy); anexar janela de **curto prazo** (últimas *N* mensagens).  
3. **Classificar contexto (engine):** perfil → estágio → intenção (`ia_engine_v1` §2–4); aplicar **checagens de negócio** se dados existirem no servidor (`regras_negocio.md` — status, vínculo).  
4. **Avaliar comportamento:** calcular/atualizar sinais → `riskLevel` / rótulo comportamental (`ia_behavioral_layer.md`).  
5. **Avaliar crescimento:** ler gatilhos (`ia_growth_engine.md` §5); gerar **intenção de crescimento** *provisória* (pode ser anulada em §3).  
6. **Definir estratégia final:** resolver **modo**, **tom**, **tamanho**, **CTA** (§4–6).  
7. **Montar prompt:** system (`ia_prompt_master_v1`) + bloco memória resumida + RAG selecionado + instruções **implícitas** da estratégia (ex.: “resposta curta”).  
8. **Chamar LLM** com timeout (`ia_runtime_architecture` §7).  
9. **Atualizar memória:** incrementos, `stage`, `riskLevel`, tópicos (`ia_memory_system` §6).  
10. **Resposta HTTP** ao cliente + opcional **payload interno** de observabilidade (§8–9).

---

## 3. Ordem de prioridade

**Hierarquia** (maior → menor). O item superior **bloqueia** ou **reduz** efeito dos inferiores.

| Prioridade | Fonte | Efeito |
|------------|-------|--------|
| **1. Segurança / risco clínico** | Sintoma, emergência, red flags (`ia_engine_v1` §8) | Modo **risco**; crescimento **desligado**; resposta mínima + encaminhamento. |
| **2. Regras de negócio** | Vínculo, permissões, lead, estados (`regras_negocio.md`) | Não inventar fluxo; corrigir memória se conflitar com dado servidor. |
| **3. Contexto da mensagem** | Intenção explícita (dúvida técnica, problema de app) | Responde ao que foi perguntado **antes** de nudges. |
| **4. Comportamento** | `riskLevel`, desânimo, superfície de uso (`ia_behavioral_layer`) | Ajusta tom e comprimento; pode suprimir expansão. |
| **5. Crescimento** | Gatilhos orgânicos (`ia_growth_engine`) | Micro-CTA **no máximo um** por turno, **só** se 1–4 permitirem. |

---

## 4. Decisão de estratégia

Estrutura lógica produzida pelo orchestrator **antes** do LLM:

| Campo | Valores / notas |
|-------|------------------|
| **tipo de resposta** | `informativa` \| `procedural` \| `validacao_encaminhamento` \| `emergencia` |
| **tamanho** | `curto` \| `medio` \| `longo` — influencia instrução ao modelo (não só max tokens). |
| **tom** | `acolhedor` \| `neutro` \| `objetivo` \| `firme_seguranca` — mapear perfil (paciente vs médico). |
| **CTA** | `nenhum` \| `unico_micro` — texto sugerido **opcional**; nunca obrigatório em risco alto. |

**Derivação:** `tipo` vem sobretudo de (engine + regras); `tamanho` e `tom` de (comportamento + perfil); `CTA` de (crescimento **e** estágio de jornada), sujeito a §6.

---

## 5. Modos da IA

| Modo | Quando | Comportamento resumido |
|------|--------|-------------------------|
| **suporte** | Dúvida/problema de produto, baixo risco | Educar, navegar; CTA procedural permitido. |
| **risco** | Sintoma, intercorrência grave, alto risco comportamental com crise | Prioridade segurança; curto; sem crescimento. |
| **crescimento** | Baixo risco + gatilho de jornada (ativação/reengajamento) | Micro-CTA leve após responder dúvida. |
| **eficiência (médico)** | Perfil médico + domínio ≥ intermediário ou sobrecarga declarada | Resposta curta, atalhos; sem motivational speak. |

**Modo ativo único** por turno; “crescimento” pode ser **flag secundária** anulada por override (§6).

---

## 6. Regras de override

| Condição | Efeito |
|----------|--------|
| **Sintoma** (incl. red flag servidor) | **Ignora growth**; modo **risco** ou emergência; CTA só para serviço de urgência ou médico. |
| **Risco alto** (comportamental ou clínico ambíguo) | **Força** `length=curto`; `tom` firme ou acolhedor mínimo; sem indicação/compartilhamento. |
| **Dúvida simples + paciente estável** (`riskLevel=baixo`, intenção `dúvida`) | Permite **expansão leve** (micro-CTA) **após** resposta direta. |
| **Conflito memória vs Firestore** | **Override** memória com dado servidor; log em `decision_log`. |
| **Médico em modo escala** | Suprimir CTAs de paciente/crescimento clínico; modo **eficiência** ou **suporte** operacional. |

---

## 7. Integração com runtime

| Ponto | Papel |
|-------|--------|
| **Onde entra** | Dentro do handler de `POST /api/ia/chat` (ou rota final); **primeira** função após auth: `orchestrate(input)`. |
| **Engine** | Chamada como `classifyContext({ message, memory, serverFacts })` — não envolve LLM obrigatoriamente. |
| **Memória** | Leitura no início; escrita no fim; orchestrator passa **resumo** ao montador de prompt. |
| **Behavioral / Growth** | Sub-módulos puros (funções ou serviços) invocados pelo orchestrator; **sem** chamadas LLM entre eles na v1. |

Fluxo textual: `API Route → orchestrator → buildPrompt → LLM → orchestrator.finalizeMemory → JSON response`.

---

## 8. Estrutura de saída

Objeto **interno** (logs, debug, eventualmente tracing). **Não** expor `decision_log` completo ao cliente.

```json
{
  "strategy": {
    "mode": "suporte | risco | crescimento | eficiencia",
    "tone": "acolhedor | neutro | objetivo | firme_seguranca",
    "length": "curto | medio | longo",
    "cta": "nenhum | unico_micro",
    "responseType": "informativa | procedural | validacao_encaminhamento | emergencia"
  },
  "context_used": [
    "memory_summary",
    "regras_negocio#trecho",
    "paciente_mente#trecho"
  ],
  "decision_log": [
    { "step": "engine", "result": "paciente | em_tratamento | duvida" },
    { "step": "behavioral", "riskLevel": "baixo" },
    { "step": "growth", "nudge": "off | on" },
    { "step": "override", "rule": "sintoma_suprime_growth" }
  ]
}
```

**Resposta ao cliente:** manter apenas `{ reply, conversationId?, meta? }`; `strategy` pode ir a **telemetria** redigida.

---

## 9. Observabilidade

| Prática | Finalidade |
|---------|------------|
| **Logs de decisão** | Persistir `decision_log` agregado (sem PII em texto livre da mensagem se política exigir). |
| **Debug do fluxo** | Correlation id por request; rastrear qual override disparou. |
| **Comparação de respostas** | Versionar `ia_prompt_master` + hash da estratégia para A/B offline. |

---

## 10. Evolução futura

| Direção |
|---------|
| **Testes A/B** — políticas alternativas de `cta` e `length` só com flag e amostragem. |
| **Múltiplos modelos** — orchestrator escolhe provider/modelo por **modo** (ex.: modelo menor em eficiência médica). |
| **Personalização avançada** — features derivadas com consentimento; nunca prontuário completo no prompt. |

---

*Documento v1 — implementar `orchestrate()` como módulo único importado pela rota descrita em `ia_runtime_architecture.md`.*

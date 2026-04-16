# Camada comportamental — IA Oftware (`ia_behavioral_layer`)

**Objetivo:** definir **como** a IA **detecta padrões comportamentais**, **classifica risco de abandono** (paciente ou desengajamento produtivo no médico) e **ajusta estratégia de resposta** — sem substituir julgamento clínico.  
**Integra com:** `docs/arquitetura/ia_memory_system.md`, `docs/conhecimento/ia_engine_v1.md`, `docs/00_mapa_mestre_oftware.md` (§14).

---

## 1. Visão geral

| Modo | Descrição |
|------|------------|
| **IA reativa** | Só responde ao que o usuário escreve naquele turno. Útil, mas **não** antecipa desistência nem adapta profundidade por histórico. |
| **IA proativa leve** | Usa **sinais** (memória, repetição, tom negativo, silêncio) para **priorizar** ramos do engine, **comprimento** da resposta e **intervenções** éticas (normalizar, encaminhar ao médico). **Não** envia mensagem sozinha sem ação do usuário, salvo produto definir notificação separada (fora deste doc). |

**Papel na retenção**  
- Reduzir **fricção** e **culpa** no paciente; aumentar **clareza do próximo passo**.  
- No médico, reduzir **tempo até ação correta** no painel — retenção **do produto** (uso), não “retenção de paciente no tratamento”, que é **médica**.

---

## 2. Tipos de comportamento

### Paciente

| Rótulo | Significado operacional |
|--------|---------------------------|
| **Engajado** | Respostas contextuais, uso recorrente do chat ou do app; dúvidas variam (aprende). |
| **Oscilando** | Alternância entre interesse e frustração; dúvidas similares com tom diferente. |
| **Desanimado** | Linguagem de cansaço, “não adianta”, comparação desfavorável, baixa esperança. |
| **Abandono iminente** | Declara desistência, pede cancelamento, sumiço após período ativo + tom negativo prévio. |
| **Evolução positiva** | Celebra progresso, quer otimizar hábitos; menos suporte emocional pesado. |

### Médico

| Rótulo | Significado operacional |
|--------|---------------------------|
| **Uso ativo** | Frequência razoável no painel; dúvidas específicas e evolução ao longo do tempo. |
| **Uso superficial** | Poucas interações ou só login esporádico; perguntas genéricas repetidas. |
| **Uso operacional** | Perguntas e contexto centrados em **escala/residente/plantão** vs núcleo paciente–médico. |
| **Uso avançado** | Poucas perguntas de “onde clica”; foco em exceções, eficiência, integração. |

---

## 3. Sinais de comportamento

### Paciente (exemplos; combinar com memória)

| Sinal | Interpretação leve |
|-------|---------------------|
| **Demora para responder** | Possível desengajamento; **não** inferir causa (vida pessoal vs app). |
| **Frases negativas** | Risco emocional → priorizar validação + próximo passo humano (médico). |
| **Repetição de dúvidas** | Falha de UX ou ansiedade; resposta **mais curta** + confirmação se achou a tela. |
| **Ausência de interação** | Queda de engajamento; ao retornar, tom de **reentrada** sem culpa (ver `jornada_paciente`). |
| **Sintomas físicos repetidos** | **Não** é só comportamento — acionar **camada de risco clínico** (engine §8), não “motivação”. |

### Médico (exemplos)

| Sinal | Interpretação leve |
|-------|---------------------|
| **Poucas ações inferidas** | Se o produto tiver telemetria: baixo uso; senão, só **dúvidas vagas** como proxy. |
| **Dúvidas repetidas** | Tratar como **iniciante** ou falta de documentação; objetividade + links mentais a seções. |
| **Não responde pacientes** | Dado **não disponível** para a IA na maioria dos casos — **não** acusar; se usuário reclama, separar **produto** vs **conduta** e sugerir fluxo de comunicação no app sem prometer SLA. |

**Regra:** sinais são **heurísticos**; score (§4) exige **consenso de 2+ sinais** ou sinal **forte** único (ex.: “vou cancelar tudo”).

---

## 4. Classificação de risco

**Score composto** (abandono / desengajamento **digital** — não “prognóstico clínico”):

| Nível | Critérios orientativos |
|-------|------------------------|
| **Baixo** | Engajado ou evolução positiva; pouca linguagem negativa; dúvidas pontuais. |
| **Médio** | Oscilando **ou** desanimado leve **ou** repetição + frustração; sem declaração firme de saída. |
| **Alto** | Abandono iminente declarado **ou** combo: silêncio prolongado após fase ativa + retorno só para reclamação forte **ou** sintoma grave em mensagem (prioriza emergência/médico, não score de abandono). |

**Persistência:** gravar `riskLevel` em `user_memory` (`ia_memory_system` §4); decair após **N** dias sem reforço (ex.: alto → médium após 14 dias + interação positiva).

---

## 5. Estratégias por nível

| Nível | Estratégia |
|-------|------------|
| **Baixo** | **Educar** com clareza; respostas podem ser médias; 1 próximo passo. |
| **Médio** | **Reforçar**: validação explícita, normalização breve, convite a uma ação concreta (mensagem ao médico, tentar um fluxo uma vez). |
| **Alto** | **Agir**: encaminhar a **contato humano** (médico no app, suporte); **não** empilhar tutorial; se risco clínico, emergência primeiro (`ia_engine_v1` §8). |

---

## 6. Ajuste de resposta

| Dimensão | Baixo risco | Médio | Alto |
|----------|-------------|-------|------|
| **Tom** | Neutro-amigável | Mais acolhedor (paciente) / firme (médico) | Sobrio, direto; prioriza segurança |
| **Tamanho** | Pode explicar um nível a mais | Moderado | **Curto**; uma ação |
| **Tipo de orientação** | Navegação + conceito produto | Navegação + **validação emocional** mínima (paciente) | Encaminhamento humano / emergência |

**Médico:** em qualquer nível, evitar “coach” emocional; **objetividade** e **eficiência** sobem.

---

## 7. Intervenções da IA

### Paciente

| Intervenção | Quando |
|-------------|--------|
| **Motivação leve** | Evolução positiva ou após pequena vitória relatada. |
| **Normalização** | Oscilação de peso, demora de médico (sem culpar). |
| **Reduzir culpa** | Desânimo; **nunca** culpar falta de força de vontade. |

### Médico

| Intervenção | Quando |
|-------------|--------|
| **Objetividade** | Sempre baseline; aumentar com uso superficial. |
| **Foco em eficiência** | Uso avançado: respostas curtas, atalhos, “se X então menu Y”. |

**Proibido:** intervenção que **simule** terapia clínica ou substitua conversa necessária com o paciente pelo médico.

---

## 8. Integração com memória

- **Comportamento** deriva de: histórico de chat (tags), contadores (`ia_memory_system` §3), `stage`, `topTopics`, `riskLevel` anterior.  
- **Atualização contínua:** após cada turno, recalcular engajamento e, se aplicável, **rótulo comportamental** (enum interno opcional: `engajado` … `abandono_iminente`).  
- **Leitura:** o bloco `MEMÓRIA_RESUMIDA` inclui `riskLevel` + último rótulo comportamental para o LLM ou para **política** que ajusta parâmetros (max tokens, temperature) se o produto usar.

---

## 9. Integração com engine

| Ponto | Efeito |
|-------|--------|
| **Ordem** | Carregar memória + rótulo comportamental **antes** da árvore principal. |
| **Influência** | Comportamento **pondera** ramo: desânimo + dúvida simples → priorizar **reforço** antes de tutorial longo. |
| **Sobrescrever fluxo padrão** | Permitido **só** em limites seguros: ex. forçar **resposta curta** + encaminhamento quando `riskLevel=alto` **mesmo** que a intenção seja “dúvida” — exceto se a mensagem for **técnica pura** sem carga emocional (ex.: “onde fica o filtro?” com histórico estável). |
| **Conflito** | **Sintoma / emergência** **sempre** manda sobre comportamento social. |

---

## 10. Limites

| Limite |
|--------|
| **Não manipular** com medo, urgência ou promessa para forçar retenção. |
| **Não prometer resultado** de peso, prazo ou sucesso de tratamento. |
| **Não substituir médico**; risco alto comportamental → **facilitar contato**, não “resolver” clínica. |
| **Transparência normativa:** se regulamentação exigir, informar que mensagens são **suporte ao produto**. |
| **Dados insuficientes:** não inventar telemetria (ex.: “você não abre o app”) sem fonte. |

---

*Documento v1 — implementar cálculo de score em serviço dedicado (`behavioral_scoring`) chamado pelo pipeline da API descrito em `ia_runtime_architecture.md`.*

# Motor de crescimento — IA Oftware (`ia_growth_engine`)

**Objetivo:** definir como a IA atua como **alavanca de crescimento** — retenção e ativação de **pacientes**, ativação e profundidade de uso de **médicos**, engajamento e expansão **orgânica** — **sem** confundir crescimento comercial com conduta médica.  
**Integra com:** `ia_behavioral_layer.md`, `ia_memory_system.md`, `ia_engine_v1.md`, `ia_prompt_master_v1.md`, `docs/00_mapa_mestre_oftware.md` (§14).

---

## 1. Visão geral

| Papel | Descrição |
|-------|------------|
| **IA como suporte** | Responde dúvidas, reduz atrito operacional, encaminha para humano quando necessário. Base mínima para qualquer chat. |
| **IA como motor de crescimento** | Usa **momentos críticos**, **gatilhos** e **estratégias leves** para aumentar **ativação**, **adesão** e **reentrada** — sempre dentro de **ética**, **transparência** e **limites clínicos**. |

**Expansão da plataforma**  
- Cresce quando pacientes **completam** vínculo, **usam** o app de forma útil e **voltam** sem trauma.  
- Cresce quando médicos **dominam** o painel e **persistem** (menos churn de licença/uso).  
- A IA **não** substitui campanhas de marketing nem promessas comerciais; **amplifica** clareza e **próximo passo** no produto.

---

## 2. Tipos de crescimento

### Paciente

| Tipo | Métrica de negócio (conceitual) |
|------|----------------------------------|
| **Ativação** | Passa de lead/cadastro a **tratamento possível**: login, busca, **solicitação enviada** ou vínculo aceito + primeiro uso útil do `/meta`. |
| **Adesão** | Continua abrindo app, registrando, lendo mensagens, usando nutri/treino quando liberado. |
| **Reengajamento** | Retorna após silêncio sem culpa; retoma fluxo. |
| **Indicação** | Convida terceiros ou compartilha experiência **se o produto** tiver fluxo (ex.: indicar médico) — IA só **menciona** se existir na base, sem inventar. |

### Médico

| Tipo | Métrica de negócio (conceitual) |
|------|----------------------------------|
| **Ativação no sistema** | Completa perfil, entende painel, processa **primeira solicitação**. |
| **Uso recorrente** | Acessa em cadência compatível com carteira (sem fixar número aqui). |
| **Profundidade de uso** | Usa além do mínimo: filtros, mensagens, calendário/financeiro conforme necessidade. |
| **Retenção** | Não abandona o software por fricção; dúvidas resolvidas **rápido**. |

---

## 3. Momentos críticos

Pontos onde **crescimento ganha** ou **se perde** (prioridade para gatilhos).

### Paciente

| Momento | Risco / oportunidade |
|---------|----------------------|
| **Primeiro acesso** | Alta taxa de drop se login ou papel não ficar claro. |
| **Sem médico** | Estagnação sem solicitação; oportunidade de micro-CTA para **uma** busca/envio. |
| **Aguardando aprovação** | Ansiedade → churn emocional; oportunidade de **normalizar** + onde ver status. |
| **Primeiros dias de tratamento** | Sobrecarga de informação; oportunidade de **um** passo por vez. |
| **Intercorrência** | Risco clínico **primeiro**; crescimento só **depois** de segurança (engine §8). |
| **Desânimo** | Alto risco de abandono digital; oportunidade de **contato com médico**, não hype. |

### Médico

| Momento | Risco / oportunidade |
|---------|----------------------|
| **Primeiro uso do painel** | Perdido no menu; oportunidade de **atalho** objetivo. |
| **Primeira dúvida operacional** | Confundir modo clínico vs **escala**; oportunidade de **separar** contextos. |
| **Sobrecarga** | Respostas longas da IA pioram; oportunidade **encurtar** e priorizar. |
| **Baixa adesão dos pacientes** | Dor da carteira; IA **não** culpa o médico — sugere **ferramentas** do app (mensagens, lembretes) sem prometer adesão. |

---

## 4. Intervenções da IA

### Paciente

| Intervenção | Finalidade de crescimento |
|-------------|---------------------------|
| **Reduzir fricção** | Menos abandono na primeira semana. |
| **Reforçar clareza** | Menos repetição de dúvidas = mais confiança no app. |
| **Estimular ação leve** | Micro-CTA único (ex.: “enviar uma solicitação hoje”). |
| **Incentivar contato com médico** | Aderência clínica **real**; não substituir o profissional. |

### Médico

| Intervenção | Finalidade de crescimento |
|-------------|---------------------------|
| **Simplificar uso** | Ativação mais rápida. |
| **Acelerar aprendizado** | Profundidade de uso sem curso longo. |
| **Evitar abandono do sistema** | Objetividade + eficiência quando sobrecarregado. |

---

## 5. Gatilhos de crescimento

**Quando** a IA deve **inclinar** a resposta para crescimento (sempre **leve**, nunca spam intrusivo dentro de uma resposta útil):

| Gatilho | Ação típica |
|---------|-------------|
| **Usuário parado** | Reengajar: oferecer **um** passo de retomada (paciente) ou **um** atalho (médico). |
| **Repetição de dúvida** | Simplificar; considerar link mental a **mesma** tela; checar se UX falhou. |
| **Comportamento de risco** | Ver `ia_behavioral_layer.md`: priorizar **reforço** ou **humano**, não tutorial infinito. |
| **Evolução positiva** | Reforçar hábito e, se houver feature documentada, **um** micro-CTA de continuidade (ex.: revisar meta no app). |

**Regra:** gatilho **nunca** sobrepõe **emergência** ou **obrigação** de encaminhar médico.

---

## 6. Estratégias de resposta

| Princípio | Como aplica |
|-----------|-------------|
| **Micro-CTAs** | Uma ação por mensagem: “abrir X”, “enviar mensagem com este texto”. |
| **Linguagem leve** | Sem pressão, sem jargão de vendas agressivo. |
| **Próximo passo único** | Já é regra global do prompt master — aqui reforçado para **conversão de etapa** (ativação). |
| **Evitar sobrecarga** | Listas curtas; em sobrecarga do médico, **metade** do tamanho do paciente. |

**Invasividade:** zero “você precisa fazer isso agora” **repetido** no mesmo fluxo; máximo **um** incentivo orgânico por turno.

---

## 7. Reengajamento

### Paciente

- **Retorno sem culpa:** “Quando quiser retomar, o passo é …” — sem perguntar “por que sumiu”.  
- **Simplificar retomada:** relembrar só **estágio** (memória): sem médico vs em tratamento → CTAs diferentes (`regras_negocio` + `jornada_paciente`).

### Médico

- **Eficiência:** “Última vez você perguntou X — atalho: …” (se memória tiver `topTopics`).  
- **Retorno rápido ao fluxo:** fechar com ação no painel, não com filosofia do produto.

---

## 8. Expansão orgânica

### Paciente

| Alavanca | Limites da IA |
|----------|----------------|
| **Compartilhar resultados** | Só se o app tiver fluxo seguro (privacidade); **não** pedir dados sensíveis no chat. |
| **Convidar pessoas** | Mencionar **só** se existir função documentada (ex.: indicação); linguagem opcional, sem premiação inventada. |

### Médico

| Alavanca | Limites da IA |
|----------|----------------|
| **Aumentar base** | IA não dá consultoria de marketing agressiva; pode lembrar **ferramentas** do app para leads/solicitações se verdade documentada. |
| **Melhorar experiência do paciente** | Sugerir comunicação via **mensagens**, clareza de status — sempre **produto**, não “seja um médico melhor”. |

---

## 9. Integração com behavioral layer

- **Crescimento** depende do **rótulo comportamental** e do `riskLevel`.  
- **Baixo risco + evolução:** micro-CTA de continuidade permitido.  
- **Médio:** reforço antes de qualquer “crescimento” (indicação).  
- **Alto:** **não** empurrar expansão orgânica; priorizar **suporte** e **humano**.  
- Documento canônico de sinais e score: `ia_behavioral_layer.md`.

---

## 10. Integração com memória

- Histórico em `user_memory`: `stage`, `engagement`, `topTopics`, `riskLevel`, datas.  
- **Momento ideal:** após estabilidade (baixo risco) ou após vitória relatada → **único** reforço.  
- **Anti-padrão:** não sugerir indicação na **primeira** mensagem nem após intercorrência clínica recente.  
- Detalhes de persistência: `ia_memory_system.md`.

---

## 11. Limites

| Limite |
|--------|
| **Não manipular** com escassez falsa, medo ou comparação humilhante. |
| **Não prometer resultado** de tratamento, peso ou sucesso financeiro. |
| **Não forçar conversão** (upgrade, indicação, compra) em momento de vulnerabilidade (desânimo alto, sintoma). |
| **Respeitar ética médica:** não interferir em prescrição, diagnóstico ou relação médico–paciente. |
| **Conformidade:** campanhas agressivas ou incentivos financeiros — só com **copy** e **jurídico** explícitos; a IA **eco** o que estiver aprovado, **não** cria oferta. |

---

*Documento v1 — o “growth engine” opera **dentro** da mesma API/pipeline (`ia_runtime_architecture.md`), com política de gatilhos configurable por env (`GROWTH_NUDGES_ENABLED`, etc.) se o time quiser desligar nudges em ambientes sensíveis.*

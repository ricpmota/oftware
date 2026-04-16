# Perguntas da entrevista do paciente (chat + sistema) — V2

**Fonte principal do fluxo em chat:** `components/ModalDadosPacienteChat.tsx`  
**Onde o paciente vê os dados depois:** `app/meta/page.tsx` (resumo em cards — textos podem divergir levemente)

Use este arquivo para substituir a versão atual com uma abordagem mais **humana**, **didática**, **orientada à conversão** e ainda compatível com uso clínico.  
Ao aprovar, alinhar:
1. Constantes e arrays no modal do chat  
2. Labels na página `/meta` (exibição) e em qualquer outro formulário equivalente  
3. Regras condicionais de exibição (ex.: gestação/lactação por gênero; circunferência apenas se paciente souber informar)

---

## Objetivos desta versão

- Melhorar a experiência do paciente no chat
- Reduzir sensação de “formulário burocrático”
- Tornar termos clínicos mais compreensíveis para leigos
- Coletar dados úteis para decisão médica e conversão
- Preservar o máximo possível das chaves técnicas já existentes

---

## Legenda

| Tipo | Significado |
|------|-------------|
| **Livre** | Campo numérico ou texto (sem botões de opção) |
| **Única** | Uma opção entre várias |
| **Múltipla** | Várias opções + botão Enviar |
| **Sequência** | Várias perguntas em sequência (uma por vez) |
| **Condicional** | Só aparece se uma resposta anterior ativar esse passo |

---

## Passo -1 — Abertura do fluxo *(novo)*

| Campo | Valor |
|-------|--------|
| **Pergunta / texto ao usuário** | Vamos montar um plano personalizado para você emagrecer com mais segurança. |
| **Texto auxiliar** | Leva menos de 2 minutos. |
| **Tipo** | Única |
| **Alternativas** | **Começar** |
| **Chave técnica** | `flow.start` |

> **Observação UX:** esse passo reduz atrito inicial e prepara o paciente antes de pedir dados pessoais.

---

## Passo 0 — Telefone de contato

| Campo | Valor |
|-------|--------|
| **Pergunta / texto ao usuário** | Pra começar, me passa seu telefone. |
| **Texto auxiliar** | O médico usará esse número para entrar em contato com você. |
| **Tipo** | Livre (máscara telefone BR) |
| **Placeholder** | `(11) 99999-9999` |
| **Alternativas** | *(nenhuma — mín. 10 dígitos)* |
| **Chave técnica** | `dadosIdentificacao.telefone` |

---

## Passo 1 — Data de nascimento

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Quando você nasceu? |
| **Texto auxiliar** | Isso ajuda a ajustar o tratamento com mais precisão. |
| **Tipo** | Livre (dia + select mês + select ano + Enviar) |
| **Alternativas** | Meses: Janeiro … Dezembro; anos: últimos 120 anos |
| **Chave técnica** | `dadosIdentificacao.dataNascimento` |

---

## Passo 2 — Gênero

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual seu gênero? |
| **Tipo** | Única (clique envia) |
| **Alternativas** | Masculino (`M`) · Feminino (`F`) · Prefiro não responder (`Outro`) |
| **Chave técnica** | `dadosIdentificacao.sexoBiologico` |

---

## Passo 3 — CPF

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual seu CPF? |
| **Texto auxiliar** | Usado apenas para registro médico seguro. |
| **Tipo** | Livre (máscara 11 dígitos) |
| **Placeholder** | `000.000.000-00` |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosIdentificacao.cpf` |

---

## Passo 4 — Peso

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual seu peso atual? |
| **Texto auxiliar** | Pode ser aproximado, sem problema. |
| **Tipo** | Livre (número, ex.: 85.5) |
| **Placeholder** | `Peso em kg (ex: 85.5)` |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosClinicos.medidasIniciais.peso` |

---

## Passo 5 — Altura

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual sua altura? |
| **Texto auxiliar** | Você pode informar em centímetros ou em metros. |
| **Tipo** | Livre (cm ou metros, ex.: 170 ou 1,70) |
| **Placeholder** | `Altura: 170 ou 1,70 m` |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosClinicos.medidasIniciais.altura` *(sempre em cm internamente)* |

---

## Passo 6 — Circunferência abdominal *(ajustado para reduzir travamento)*

### 6A — Pergunta inicial

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Você sabe sua circunferência abdominal? |
| **Tipo** | Única |
| **Alternativas** | **Sim** · **Não sei** |
| **Chave técnica** | `aux.circunferenciaPergunta` |

### 6B — Valor da circunferência *(condicional)*

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual sua circunferência abdominal inicial? |
| **Texto auxiliar** | Se quiser, pode informar em cm ou metros. |
| **Tipo** | Livre + condicional |
| **Placeholder** | `Circunferência: 102 ou 1,02 m` |
| **Alternativas** | *(nenhuma)* |
| **Condição de exibição** | Só aparece se o paciente responder **Sim** no passo 6A |
| **Chave técnica** | `dadosClinicos.medidasIniciais.circunferenciaAbdominal` |

### 6C — Circunferência não informada *(condicional)*

| Campo | Valor |
|-------|--------|
| **Ação interna** | Marcar circunferência não informada |
| **Condição** | Se o paciente responder **Não sei** no passo 6A |
| **Chave técnica sugerida** | `circunferenciaNaoInformada` |

---

## Passo 7 — Motivação principal *(novo)*

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | O que mais te incomoda hoje em relação ao seu peso? |
| **Texto auxiliar** | Pode marcar mais de uma opção. |
| **Tipo** | Múltipla + Enviar |
| **Alternativas** | Ver tabela abaixo |
| **Chave técnica** | `dadosClinicos.motivacao.*` |

| Chave | Texto (botão) |
|-------|----------------|
| `estetica` | Estética |
| `cansaco_falta_energia` | Cansaço / falta de energia |
| `saude_exames_alterados` | Saúde / exames alterados |
| `autoestima` | Autoestima |
| `dificuldade_emagrecer` | Dificuldade para emagrecer |
| `outro` | Outro |

**Campo adicional opcional se `outro` for marcado:**  
`dadosClinicos.motivacaoOutro`

> **Observação estratégica:** esse passo melhora personalização, retenção e futuras mensagens de acompanhamento.

---

## Passo 8 — Motivo do acompanhamento (diagnóstico principal)

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Você tem alguma dessas condições? Pode marcar a que melhor descreve o motivo principal do seu acompanhamento. |
| **Texto auxiliar** | Usamos nomes mais simples para facilitar a escolha. |
| **Tipo** | Múltipla (vários botões + Enviar; opção “Outro” abre texto) |
| **Alternativas** | Ver tabela abaixo |
| **Chave técnica** | `diagnosticoPrincipalTipos` / `diagnosticoPrincipal.tipo` |

| Valor interno | Texto exibido (chat) |
|---------------|----------------------|
| `dm1` | Diabetes tipo 1 |
| `dm2` | Diabetes tipo 2 |
| `pre_diabetes` | Pré-diabetes |
| `sobrepeso_comorbidade` | Sobrepeso com problema de saúde |
| `sop_ri` | Ovário policístico (SOP) |
| `ehna_sem_dm2` | Gordura no fígado / esteatose hepática |
| `obesidade` | Obesidade |
| `resistencia_insulinica` | Resistência à insulina / síndrome metabólica |
| `outro` | Outro (+ campo “Especificar outro”) |

> **Nota de compatibilidade:** mantidos os valores internos já existentes no banco; foram alterados apenas os textos exibidos ao paciente.

---

## Passo 9 — Outras condições (comorbidades)

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Além disso, você tem ou já teve alguma dessas condições? Pode marcar mais de uma. |
| **Tipo** | Múltipla + Enviar (“Outra” abre “Qual?”) |
| **Chave técnica** | `dadosClinicos.comorbidades.*` |

| Chave | Texto (botão) |
|-------|----------------|
| `hipertensaoArterial` | Pressão alta (hipertensão) |
| `dislipidemia` | Colesterol ou triglicerídeos altos |
| `apneiaObstrutivaSono` | Apneia do sono |
| `esteatoseEHNA` | Gordura no fígado / esteatose |
| `doencaCardiovascular` | Doença cardiovascular |
| `doencaRenalCronica` | Doença renal crônica |
| `sop` | Ovário policístico (SOP) |
| `hipotireoidismo` | Hipotireoidismo |
| `asmaDPOC` | Asma / DPOC |
| `transtornoAnsiedadeDepressao` | Ansiedade / depressão |
| `nenhuma` | Nenhuma |
| `outra` | Outra |

**Campo adicional opcional se `outra` for marcado:**  
`dadosClinicos.comorbidadesOutra`

---

## Passo 10 — Segurança do tratamento (riscos)

| Campo | Valor |
|-------|--------|
| **Texto introdutório (bot)** | Agora algumas perguntas rápidas sobre sua saúde — isso nos ajuda a garantir que o tratamento seja seguro para você. |
| **Tipo** | Sequência (uma pergunta por vez; resposta imediata passa à próxima) |
| **Alternativas por pergunta** | **Sim** · **Não** · (quando aplicável) **Desconheço** |

| Ordem | Chave | Pergunta | Opções |
|-------|-------|----------|--------|
| 1 | `pancreatitePrevia` | Você já teve pancreatite? | Sim, Não |
| 2 | `gastroparesia` | Você tem ou já teve esvaziamento lento do estômago (gastroparesia)? | Sim, Não |
| 3 | `historicoCMT_MEN2` | Existe histórico familiar de câncer medular de tireoide (CMT) ou MEN2? | Sim, Não, Desconheço |
| 4* | `gestacao` | Você está grávida ou pode estar? | Sim, Não, Desconheço |
| 5* | `lactacao` | Você está em período de amamentação? | Sim, Não |

\* *Só aparecem se gênero for Feminino ou “Prefiro não responder”.*

**Chave técnica:** `dadosClinicos.riscos.<key>` → `sim` | `nao` | `desconheco`

> **Sugestão funcional futura:** gerar alerta automático para respostas de maior risco.

---

## Passo 11 — Tireoide

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Em relação à tireoide, qual situação se aplica a você? |
| **Tipo** | Única (+ “Outro” com texto “Qual?” + Enviar) |
| **Chave técnica** | `historiaTireoidiana` / `historiaTireoidianaOutro` |

| Valor interno | Texto |
|---------------|--------|
| `eutireoidismo` | Tireoide normal |
| `hipotireoidismo_tratado` | Hipotireoidismo tratado |
| `nodulo_bocio` | Nódulo ou bócio |
| `tireoidite_previa` | Tireoidite prévia |
| `cmt_confirmado` | CMT confirmado |
| `outro` | Outro |

> **Nota de compatibilidade:** chaves internas preservadas; texto exibido ficou mais compreensível.

---

## Passo 12 — Sintomas digestivos

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Você costuma ter algum desses sintomas digestivos? Marque os que se aplicam. |
| **Tipo** | Múltipla + Enviar |
| **Chave técnica** | `dadosClinicos.sintomasGI.*` |

| Chave | Texto |
|-------|--------|
| `plenitudePosPrandial` | Sensação de estômago cheio / plenitude após comer |
| `nauseaLeve` | Náusea leve |
| `constipacao` | Constipação |
| `refluxoPirose` | Refluxo / queimação |
| `nenhum` | Nenhum |

---

## Passo 13 — Objetivos do tratamento

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | O que você quer alcançar com o tratamento? Pode marcar mais de um. |
| **Texto auxiliar** | Você pode escolher objetivos de saúde e também de bem-estar. |
| **Tipo** | Múltipla + Enviar (“Outro” + texto “Qual?”) |
| **Chave técnica** | `dadosClinicos.objetivosTratamento.*` |

| Chave | Texto |
|-------|--------|
| `perdaPeso10Porcento` | Perder pelo menos 10% do peso |
| `hba1cMenor68` | Melhorar glicose / hemoglobina glicada |
| `reducaoCircunferencia10cm` | Reduzir a circunferência abdominal |
| `remissaoPreDiabetes` | Reverter o pré-diabetes |
| `melhoraEHNA` | Melhorar gordura no fígado |
| `mais_energia` | Ter mais energia no dia a dia |
| `melhora_autoestima` | Melhorar autoestima |
| `outro` | Outro |

**Campo adicional opcional se `outro` for marcado:**  
`dadosClinicos.objetivosTratamentoOutro`

> **Nota técnica importante:** os 5 primeiros itens preservam a lógica clínica original; foram acrescentadas opções mais humanas para melhorar adesão e personalização.

---

## Passo 14 — Busca de médico

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Perfeito. Já conseguimos montar seu perfil inicial. Agora selecione seu estado e cidade para encontrar um médico. |
| **Texto auxiliar** | Vamos te conectar com um profissional para avaliar seu caso e iniciar seu plano. |
| **Tipo** | Seleção UF + cidade + lista de médicos (fluxo posterior) |
| **Alternativas** | Estados: AC, AL, AP, … TO (lista completa no código `ESTADOS_BR`) |
| **Chave técnica sugerida** | `flow.findDoctor` |

---

## Textos auxiliares (somente UI, não são “perguntas”)

| Onde | Texto |
|------|--------|
| Modal solicitação já enviada | **Título:** Solicitação já enviada — **Corpo:** Já existe uma solicitação em andamento. Você pode acompanhar em **Médicos → Minhas solicitações**. |
| `/meta` (convite ao chat) | Ex.: “Responda às perguntas no formato de chat para cadastrar seus dados, peso, comorbidades e outras informações importantes para o tratamento.” |
| Modal solicitar médico (telefone) | **Seu telefone*** / “O médico usará este telefone para entrar em contato com você.” |
| Mensagem final do chat | “Perfeito. Com base nas suas respostas, já conseguimos montar seu perfil inicial para o tratamento.” |

---

## Regras e observações de implementação

### 1. Compatibilidade com banco
- Manter **valores internos já existentes** sempre que possível
- Alterar preferencialmente apenas os **rótulos exibidos** ao paciente
- Novas chaves sugeridas nesta versão devem ser adicionadas com cuidado, principalmente se houver validação forte no backend

### 2. Condicionais importantes
- `gestacao` e `lactacao` só aparecem para gênero **Feminino** ou **Prefiro não responder**
- Valor da circunferência só aparece se o paciente disser que **sabe informar**
- Campos “Outro” devem abrir input textual complementar
- Se o paciente marcar `nenhuma`, idealmente desmarcar as demais opções do mesmo grupo

### 3. Melhorias sugeridas para o Cursor implementar
- Cálculo automático de IMC após peso + altura
- Geração de resumo final do paciente antes da busca de médico
- Alertas visuais para riscos relevantes (`pancreatitePrevia`, `historicoCMT_MEN2`, `gestacao`)
- Ajuste de copy na `/meta` para espelhar os novos rótulos humanizados

---

## Checklist ao alterar textos

- [ ] Atualizar `CHAT_BOT_TEXTS`, `RISK_QUESTIONS`, `DIAGNOSTICO_LABELS`, arrays inline (comorbidades, tireoide, sintomas, objetivos, motivação, fluxo inicial) em **`ModalDadosPacienteChat.tsx`**
- [ ] Conferir labels espelhados em **`app/meta/page.tsx`** (chips de resumo: diagnóstico, comorbidades, sintomas, objetivos, motivação)
- [ ] Manter **valores internos** (`dm2`, `eutireoidismo`, etc.) estáveis se já houver dados salvos no banco; só mudar rótulos quando seguro
- [ ] Adicionar passo inicial de abertura do fluxo
- [ ] Adicionar lógica condicional da circunferência abdominal
- [ ] Adicionar passo novo de motivação
- [ ] Revisar textos de fechamento e transição para busca de médico

---

## Resumo das principais mudanças desta V2

1. **Novo passo de abertura** para reduzir atrito  
2. **Tom de voz mais humano** em telefone, peso, altura e encerramento  
3. **Circunferência abdominal em fluxo condicional**  
4. **Novo passo de motivação**  
5. **Diagnósticos e comorbidades com linguagem mais leiga**  
6. **Sintomas, tireoide e objetivos com rótulos mais claros**  
7. **Objetivos do tratamento mais humanos**, sem perder o racional clínico  
8. **Fechamento com sensação de progresso**, antes de buscar médico

---

*Versão revisada para upgrade de UX, adesão e clareza clínica.*

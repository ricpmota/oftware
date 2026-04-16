# Perguntas da entrevista do paciente (chat + sistema)

**Fonte principal do fluxo em chat:** `components/ModalDadosPacienteChat.tsx`  
**Onde o paciente vê os dados depois:** `app/meta/page.tsx` (resumo em cards — textos podem divergir levemente)

Use este arquivo para propor **novas redações** e **alternativas**. Ao aprovar, alinhar:
1. Constantes e arrays no modal do chat  
2. Labels na página `/meta` (exibição) e em qualquer outro formulário equivalente  

---

## Legenda

| Tipo | Significado |
|------|-------------|
| **Livre** | Campo numérico ou texto (sem botões de opção) |
| **Única** | Uma opção entre várias |
| **Múltipla** | Várias opções + botão Enviar |
| **Sequência** | Várias perguntas em sequência (uma por vez) |

---

## Passo 0 — Telefone de contato

| Campo | Valor |
|-------|--------|
| **Pergunta / texto ao usuário** | Antes de iniciar, precisamos do seu telefone de contato. |
| **Tipo** | Livre (máscara telefone BR) |
| **Placeholder** | `(11) 99999-9999` |
| **Alternativas** | *(nenhuma — mín. 10 dígitos)* |
| **Chave técnica** | `dadosIdentificacao.telefone` |

---

## Passo 1 — Data de nascimento

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Para te conhecer melhor, quando você nasceu? |
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
| **Tipo** | Livre (máscara 11 dígitos) |
| **Placeholder** | `000.000.000-00` |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosIdentificacao.cpf` |

---

## Passo 4 — Peso

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual seu peso atual em kg? |
| **Tipo** | Livre (número, ex.: 85.5) |
| **Placeholder** | Peso em kg (ex: 85.5) |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosClinicos.medidasIniciais.peso` |

---

## Passo 5 — Altura

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual sua altura em cm? |
| **Tipo** | Livre (cm ou metros, ex.: 170 ou 1,70) |
| **Placeholder** | Altura: 170 ou 1,70 m |
| **Alternativas** | *(nenhuma)* |
| **Chave técnica** | `dadosClinicos.medidasIniciais.altura` (sempre em cm internamente) |

---

## Passo 6 — Circunferência abdominal

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Qual sua circunferência abdominal inicial em cm? |
| **Tipo** | Livre + opção extra |
| **Placeholder** | Circunferência: 102 ou 1,02 m |
| **Alternativas** | **Não sei** → marca circunferência não informada (`circunferenciaNaoInformada`) |
| **Chave técnica** | `dadosClinicos.medidasIniciais.circunferenciaAbdominal` |

---

## Passo 7 — Motivo do acompanhamento (diagnóstico principal)

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Você tem alguma dessas condições? Marque a que melhor descreve o motivo do seu acompanhamento. |
| **Tipo** | Múltipla (vários botões + Enviar; opção “Outro” abre texto) |
| **Alternativas** | Ver tabela abaixo |
| **Chave técnica** | `diagnosticoPrincipalTipos` / `diagnosticoPrincipal.tipo` |

| Valor interno | Texto exibido (chat) |
|---------------|----------------------|
| `dm1` | Diabetes Tipo 1 |
| `dm2` | Diabetes Tipo 2 |
| `pre_diabetes` | Pré-diabetes |
| `sobrepeso_comorbidade` | Sobrepeso com Comorbidade |
| `sop_ri` | SOP |
| `ehna_sem_dm2` | Esteatose Hepática |
| `obesidade` | Obesidade (IMC ≥ 30) |
| `resistencia_insulinica` | Resistência insulínica / Síndrome metabólica |
| `outro` | Outro (+ campo “Especificar outro”) |

---

## Passo 8 — Outras condições (comorbidades)

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Além disso, você tem ou já teve alguma dessas outras condições? Pode marcar mais de uma. |
| **Tipo** | Múltipla + Enviar (“Outra” abre “Qual?”) |
| **Chave técnica** | `dadosClinicos.comorbidades.*` |

| Chave | Texto (botão) |
|-------|----------------|
| `hipertensaoArterial` | Hipertensão (HAS) |
| `dislipidemia` | Dislipidemia |
| `apneiaObstrutivaSono` | Apneia do sono (AOS) |
| `esteatoseEHNA` | Esteatose/EHNA |
| `doencaCardiovascular` | Doença cardiovascular |
| `doencaRenalCronica` | DRC |
| `sop` | SOP |
| `hipotireoidismo` | Hipotireoidismo |
| `asmaDPOC` | Asma/DPOC |
| `transtornoAnsiedadeDepressao` | Ansiedade/depressão |
| `nenhuma` | Nenhuma |
| `outra` | Outra |

---

## Passo 9 — Segurança do tratamento (riscos)

| Campo | Valor |
|-------|--------|
| **Texto introdutório (bot)** | Algumas perguntas rápidas sobre sua saúde — isso nos ajuda a garantir que o tratamento seja seguro. |
| **Tipo** | Sequência (uma pergunta por vez; resposta imediata passa à próxima) |
| **Alternativas por pergunta** | **Sim** · **Não** · (quando aplicável) **Desconheço** |

| Ordem | Chave | Pergunta | Opções |
|-------|-------|----------|--------|
| 1 | `pancreatitePrevia` | Você já teve pancreatite? | Sim, Não |
| 2 | `gastroparesia` | Você tem ou já teve gastroparesia? | Sim, Não |
| 3 | `historicoCMT_MEN2` | Histórico de CMT ou MEN2 na família? | Sim, Não, Desconheço |
| 4* | `gestacao` | Você está grávida ou pode estar? | Sim, Não, Desconheço |
| 5* | `lactacao` | Você está em período de amamentação? | Sim, Não |

\* *Só aparecem se gênero for Feminino ou “Prefiro não responder”.*

**Chave técnica:** `dadosClinicos.riscos.<key>` → `sim` | `nao` | `desconheco`

---

## Passo 10 — Tireoide

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Em relação à tireoide, qual situação se aplica a você? |
| **Tipo** | Única (+ “Outro” com texto “Qual?” + Enviar) |
| **Chave técnica** | `historiaTireoidiana` / `historiaTireoidianaOutro` |

| Valor interno | Texto |
|---------------|--------|
| `eutireoidismo` | Eutireoidismo |
| `hipotireoidismo_tratado` | Hipotireoidismo tratado |
| `nodulo_bocio` | Nódulo/bócio |
| `tireoidite_previa` | Tireoidite prévia |
| `cmt_confirmado` | CMT confirmado |
| `outro` | Outro |

---

## Passo 11 — Sintomas digestivos

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Você costuma ter algum desses sintomas digestivos? Marque os que se aplicam. |
| **Tipo** | Múltipla + Enviar |
| **Chave técnica** | `dadosClinicos.sintomasGI.*` |

| Chave | Texto |
|-------|--------|
| `plenitudePosPrandial` | Plenitude pós-prandial |
| `nauseaLeve` | Náusea leve |
| `constipacao` | Constipação |
| `refluxoPirose` | Refluxo/pirose |
| `nenhum` | Nenhum |

---

## Passo 12 — Objetivos do tratamento

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Quais são seus principais objetivos com o tratamento? Pode marcar mais de um. |
| **Tipo** | Múltipla + Enviar (“Outro” + texto “Qual?”) |
| **Chave técnica** | `dadosClinicos.objetivosTratamento.*` |

| Chave | Texto |
|-------|--------|
| `perdaPeso10Porcento` | Perda ≥10% do peso |
| `hba1cMenor68` | HbA1c < 6,8% |
| `reducaoCircunferencia10cm` | Red. circunferência ≥10 cm |
| `remissaoPreDiabetes` | Remissão pré-diabetes |
| `melhoraEHNA` | Melhora EHNA |
| `outro` | Outro |

---

## Passo 13 — Busca de médico

| Campo | Valor |
|-------|--------|
| **Pergunta (bot)** | Agora selecione seu estado e cidade para encontrar um médico. |
| **Tipo** | Seleção UF + cidade + lista de médicos (fluxo posterior) |
| **Alternativas** | Estados: AC, AL, AP, … TO (lista completa no código `ESTADOS_BR`) |

---

## Textos auxiliares (somente UI, não são “perguntas”)

| Onde | Texto |
|------|--------|
| Modal solicitação já enviada | Título: **Solicitação já enviada** — corpo explica solicitação em andamento e Médicos → Minhas solicitações. |
| `/meta` (convite ao chat) | Ex.: “Responda às perguntas no formato de chat para cadastrar sua data de nascimento, CPF, peso, comorbidades e outras informações.” |
| Modal solicitar médico (telefone) | **Seu telefone *** / “O médico usará este telefone para entrar em contato com você.” |

---

## Checklist ao alterar textos

- [ ] Atualizar `CHAT_BOT_TEXTS`, `RISK_QUESTIONS`, `DIAGNOSTICO_LABELS`, arrays inline (comorbidades, tireoide, sintomas, objetivos) em **`ModalDadosPacienteChat.tsx`**
- [ ] Conferir labels espelhados em **`app/meta/page.tsx`** (chips de resumo: diagnóstico, comorbidades, sintomas, objetivos)
- [ ] Manter **valores internos** (`dm2`, `eutireoidismo`, etc.) estáveis se já houver dados salvos no banco; só mudar rótulos quando seguro

---

*Última extração alinhada ao código em mar/2025.*

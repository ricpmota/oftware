# Mapeamento V2 — Chat (`ModalDadosPacienteChat`) × Metaadmin (Pasta 2)

Referência: `PERGUNTAS_ENTREVISTA_PACIENTE_V2.md`

## Nova ordem lógica (entrevista)

| # | Bloco | Chaves / persistência |
|---|--------|------------------------|
| 0 | Abertura + **Começar** | `sessionStorage` `meta-chat-intro-v2` (só chat; não salva no paciente) |
| 1 | Telefone | `dadosIdentificacao.telefone` |
| 2 | Data nascimento | `dadosIdentificacao.dataNascimento` |
| 3 | Gênero | `dadosIdentificacao.sexoBiologico` |
| 4 | CPF | `dadosIdentificacao.cpf` |
| 5 | Peso | `medidasIniciais.peso` |
| 6 | Altura | `medidasIniciais.altura` |
| 7 | Circunferência **condicional** | 7A pergunta Sim/Não sei → 7B valor **ou** `circunferenciaNaoInformada` |
| 8 | **Motivação** (NOVO) | `dadosClinicos.motivacao.*`, `motivacaoOutro` |
| 9 | Diagnóstico principal | `diagnosticoPrincipalTipos` / `diagnosticoPrincipal` (+ **dm1** no chat) |
| 10 | Comorbidades | `comorbidades.*` (mesmas chaves; rótulos V2) |
| 11 | Riscos (intro + sequência) | `riscos.*` (textos das perguntas V2) |
| 12 | Tireoide | `historiaTireoidiana`, `historiaTireoidianaOutro` |
| 13 | Sintomas GI | `sintomasGI.*` |
| 14 | Objetivos | `objetivosTratamento.*` + **NOVO** `mais_energia`, `melhora_autoestima` |
| 15–16 | Busca médico | UF/cidade + lista (steps 15/16 no código) |

## Antes (chat) → Depois (V2)

| Antigo step | Novo step | Observação |
|-------------|-----------|------------|
| 0 telefone | 1 | Antes: step 0 intro (se sem telefone e sem session) |
| 1–6 | 2–7 | Textos V2; step 7 virou fluxo 7A/7B |
| — | 8 | Motivação (não existia) |
| 7 diag | 9 | Labels V2; dm1 já existia no array |
| 8 comorb | 10 | Labels V2 |
| 9 riscos | 11 | Perguntas V2 (gastroparesia, CMT/MEN2) |
| 10 tireoide | 12 | Labels V2 |
| 11 sintomas | 13 | Labels V2 |
| 12 objetivos | 14 | +2 opções; labels V2 |
| 13–14 médico | 15–16 | Texto fechamento V2 |

## Metaadmin Pasta 2 — alvo da ordem V2

| Seção | Conteúdo |
|-------|----------|
| 2.1 | Medidas + checkbox “não sabe circunferência” (`circunferenciaNaoInformada`) |
| 2.2 | **Motivação** (NOVO — espelha chat) |
| 2.3 | Diagnóstico (+ dm1, rótulos V2) |
| 2.4 | Comorbidades (rótulos V2) |
| 2.5 | Riscos (rótulos/perguntas V2 nos labels) |
| 2.6 | Tireoide (rótulos V2) |
| 2.7 | Sintomas GI (rótulos V2) |
| 2.8 | Objetivos (+ mais energia, autoestima; rótulos V2) |
| 2.9 | Medicações |
| 2.10 | Alergias |
| 2.11 | Função renal |

**Antes:** Medidas → Diagnóstico → Comorb → Medicações → Alergias → Riscos → Tireoide → Função renal → Sintomas → Objetivos.

**Duplicata mobile** (`showEditarPacienteMobileModal`): ainda na ordem antiga (2.1→2.2 diag…); convém espelhar motivação, dm1, circ., rótulos V2 e objetivos extras quando for prioridade.

## Tipos (`types/obesidade.ts`)

- `medidasIniciais.circunferenciaNaoInformada?: boolean`
- `motivacao`, `motivacaoOutro`
- `diagnosticoPrincipal.tipo` incluir `dm1`
- `objetivosTratamento.mais_energia?`, `melhora_autoestima?`

## `/meta` (resumo paciente)

Atualizar chips para motivação, novos objetivos e rótulos alinhados ao V2 onde já existirem espelhos.

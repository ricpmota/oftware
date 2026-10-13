# ETAPA 03 — Consolidação do Check-in Semanal (profissionais)

O Check-in Semanal Nutri passa a ser o **único fluxo funcional** de check-in nutricional. O questionário é recalibrado para V2 (`nutri_weekly_v2`). O Check-in Diário deixa de existir como produto; os documentos antigos permanecem como histórico legado.

Não implementado nesta etapa: cronograma, `scheduledDate` configurável, cards verde/laranja/vermelho, `/checkin-nutri/{token}`, WhatsApp, cron, fila, e-mail.

`/aplicacao` permanece intacto.

---

## 1. Questionário V2

Versão persistida: `questionnaireVersion: "nutri_weekly_v2"`.

Etapas do wizard (mesmo `CheckInSemanalNutriWizard`):

1. **Alimentação** — `aderenciaPlano` (0–100%), `diasProteinaMeta` (0–7), `diasFrutasVegetais` (0–7), `alimentacaoForaPlano` (`nenhuma` / `pouca` / `moderada` / `frequente`).
2. **Hidratação** — `diasMetaAgua` (0–7). Se o plano tiver `aguaDia_ml`, o wizard mostra `Sua meta atual: X mL/dia`.
3. **Como o corpo respondeu** — náusea, constipação, diarreia (nenhuma/leve/moderada/grave) + `energiaSemana` (1–5).
4. **Rotina e desafios** — `sessoesAtividadeFisica` (0–7+), dificuldade (opções + Outra), conquista (opções + Outra).
5. **Recado ao nutricionista** — `observacoes` (opcional).

Energia permanece:

```
1 = Muito baixa · 2 = Baixa · 3 = Regular · 4 = Boa · 5 = Muito boa
```

---

## 2. Campos removidos da coleta (não apagados dos docs V1)

O wizard V2 **não pergunta**:

- `probioticoDias`
- `wheyDias`
- `creatinaDias`
- `suplementosAplicaveis` (não é mais usado para filtrar perguntas)
- `mediaSono`

Serialize V2 **omite** esses campos (não grava `null`), para o merge não apagar valores V1 existentes.

---

## 3. Opções de dificuldade

Campo `principalDificuldadeTipo`. Texto normalizado em `principalDificuldade` para compatibilidade.

| valor | rótulo |
|---|---|
| `falta_tempo` | Falta de tempo para preparar as refeições |
| `comer_fora` | Comi fora de casa muitas vezes |
| `eventos_sociais` | Eventos sociais / festas / finais de semana |
| `vontade_doces` | Vontade de comer doces |
| `fome_aumentada` | Fome acima do habitual |
| `ansiedade` | Ansiedade / vontade de comer sem fome |
| `horarios` | Dificuldade em organizar os horários |
| `falta_alimentos` | Não consegui manter os alimentos planejados disponíveis |
| `sem_dificuldade` | Não tive dificuldade relevante |
| `outra` | Outra → `principalDificuldadeOutra` |

Registros V1 só com texto livre abrem o form como `outra`.

---

## 4. Opções de conquista

Campo `principalConquistaTipo`. Texto normalizado em `principalConquista`.

| valor | rótulo |
|---|---|
| `aderencia` | Consegui seguir melhor o planejamento |
| `organizacao` | Organizei minhas refeições com antecedência |
| `proteina` | Atingi minha meta de proteína com mais frequência |
| `hidratacao` | Bebi mais água |
| `frutas_vegetais` | Comi mais frutas e vegetais |
| `reduziu_extras` | Reduzi doces / alimentos fora do planejamento |
| `boas_escolhas_fora` | Consegui fazer melhores escolhas fora de casa |
| `controle_fome` | Controlei melhor a fome / vontade de comer |
| `atividade` | Mantive atividade física com regularidade |
| `sem_conquista` | Não percebi uma conquista específica |
| `outra` | Outra → `principalConquistaOutra` |

---

## 5. Score V2

Dificuldade e conquista **não entram** no score. Suplementos e sono são ignorados mesmo se o documento V1 os tiver.

| bloco | peso |
|---|---|
| Aderência ao plano | 35% |
| Proteína / frutas / extras | 30% |
| Hidratação | 15% |
| Sintomas / tolerabilidade | 10% |
| Energia / disposição | 5% |
| Atividade física | 5% |
| **Total** | **100%** |

Se energia ou atividade estiverem ausentes, o peso é redistribuído (normalização pelo soma dos pesos usados).

Função: `calcularScoreCheckInSemanalNutri()`.

---

## 6. Compatibilidade V1

- `deserializeCheckInSemanalNutri` preserva `questionnaireVersion === "nutri_weekly_v1"` quando o doc tem essa versão.
- Campos V1 opcionais continuam no tipo TypeScript.
- Leitura de detalhes mostra suplementos/sono **somente se existirem** no registro, como histórico.
- Edição de um V1 pelo wizard V2 grava `nutri_weekly_v2` nas respostas novas e o merge mantém chaves V1 não reenviadas.

---

## 7. Remoção funcional do Check-in Diário

Flag: `CHECK_IN_DIARIO_NUTRI_ENABLED = false` em `lib/nutri/checkInSemanalNutriCapabilities.ts`.

Não há CTA `Check-in Diário` em `/meta`, `/metanutri`, `/metaadmin` (NutriContent) nem `/metapersonal`. `salvarCheckIn` retorna imediatamente. Se `view === 'checkin'` (estado residual), a UI aponta para o semanal.

O modal/formulário diário permanece no arquivo `NutriContent.tsx` como código legado, atrás da flag — não é acessível pela navegação normal. `app/meta/nutri/page.tsx` (rota antiga) também esconde o botão.

---

## 8. Preservação do legado

Coleção diária **não é apagada**:

```text
pacientes_completos/{pacienteId}/nutricao/dados/checkins/{YYYY-MM-DD}
```

Quem já tem documentos vê **Histórico anterior → Check-ins diários anteriores** (somente leitura: calendário + detalhes). Sem criar e sem editar.

---

## 9. MetaNutri

`viewerRole = nutritionist` (`chatNutriAuthorKind="nutritionist"`).

- Semana atual: resumo profissional (score, aderência, proteína, frutas, água, atividade).
- Sem registro: “Check-in da semana ainda não respondido” + **Preencher Check-in**.
- Com registro: abre em **view**; **Editar Check-in** é explícito.
- Preenchimento usa o mesmo `CheckInSemanalNutriWizard` com `mode = nutritionist`.
- `chatNutriAuthorId` (profissional autenticado) vira `answeredById` e `nutritionistId` na **criação**. Não usa o primeiro `nutricionistaVinculadoIds` quando o próprio nutricionista preenche.

Flags (`getWeeklyNutritionCheckInFlags`) e deltas (`compareWeeklyNutritionCheckIns`) no resumo.

---

## 10. MetaAdmin

`viewerRole = doctor` — `chatNutriAuthorKind="doctor"` tem prioridade sobre `modoNutricionista`.

Capabilities: `create: false`, `edit: false`, `view: true`.

Sem **Preencher Check-in** / **Editar Check-in**. Histórico e detalhes em leitura. Prontuário também lista os semanais.

---

## 11. MetaPersonal

`somenteVisualizacao` resolve `viewerRole = personal` **antes** de `modoNutricionista`.

Somente leitura. Sem CTA de preenchimento. Histórico visível.

---

## 12. Autoria

Criação:

- paciente → `answeredBy=patient`, `source=patient_meta`
- nutricionista → `answeredBy=nutritionist`, `source=nutritionist`, `nutritionistId=ator autenticado`

Edição: o autor original (`answeredBy`, `answeredById`, `source`) é preservado. Campos simples de auditoria:

- `lastEditedBy`
- `lastEditedById`
- `lastEditedAt`

No detalhe: “Respondido pelo paciente” / “Preenchido pelo nutricionista” + data/hora.

Helper: `resolveWeeklyCheckInSaveAuthorship()`.

---

## 13. Capabilities

`lib/nutri/checkInSemanalNutriCapabilities.ts`

| papel | create | edit | editCurrentWeek | view |
|---|---|---|---|---|
| patient | sim | não | sim (semana atual) | sim |
| nutritionist | sim | sim | sim | sim |
| doctor | não | não | não | sim |
| personal | não | não | não | sim |

Não usar `modoNutricionista === true` como sinônimo de nutricionista.

---

## 14. Prontuário

`buscarEventosNutricaoProntuario` agora lê `checkinsSemanais`.

Evento novo: **Check-in nutricional semanal** — semana, score, aderência, proteína/frutas/água/atividade, dificuldade/conquista quando existirem, flags se houver.

Autoria: `patient → paciente`, `nutritionist → nutri`, `doctor → medico`.

Eventos diários antigos: **Check-in nutricional — histórico anterior**.

Mapper puro: `lib/nutri/checkInSemanalNutriProntuario.ts`.

---

## 15. Arquivos novos

- `lib/nutri/checkInSemanalNutriCapabilities.ts`
- `lib/nutri/checkInSemanalNutriFlags.ts`
- `lib/nutri/checkInSemanalNutriAutoria.ts`
- `lib/nutri/checkInSemanalNutriProntuario.ts`
- `components/nutri/checkin-semanal/CheckInSemanalNutriResumoProfissional.tsx`
- `lib/nutri/checkInSemanalNutriEtapa03.spec.ts`
- `docs/nutri/ETAPA_03_CONSOLIDACAO_CHECKIN_SEMANAL_PROFISSIONAIS.md`

---

## 16. Arquivos alterados

- `lib/nutri/checkInSemanalNutriTypes.ts` — V2 + campos de dificuldade/conquista/edição
- `lib/nutri/checkInSemanalNutriQuestions.ts` — questionário V2
- `lib/nutri/checkInSemanalNutriForm.ts`
- `lib/nutri/calcularScoreCheckInSemanalNutri.ts`
- `lib/nutri/checkInSemanalNutriPersist.ts` / `Store.ts` / `Authorship.ts` / `Labels.ts` / `Week.ts`
- `lib/nutri/canEditWeeklyNutritionCheckIn.ts`
- `components/nutri/checkin-semanal/*` (CTA, Details, View, Historico)
- `components/NutriContent.tsx` — diário desativado; `viewerRole` no semanal
- `app/metanutri/page.v2.tsx` e `app/metanutri/nutri/[pacienteId]/page.tsx` — `chatNutriAuthorId`
- `app/meta/nutri/page.tsx` — CTA diário escondido
- `app/metaadmin/.../nutricaoProntuarioService.ts`
- FAQ (`faqData.ts`, `FAQpaciente.tsx`, `FAQtotal.ts`)
- testes V2 / score / etapa 02 permanece

**Não alterados:** `lib/aplicacao/*`, `components/aplicacao/*`, `app/aplicacao/*`.

---

## 17. Testes

- Questionário V2: sem suplementos/sono; energia; dificuldade/conquista + Outra
- Score V2 (aderência 0 → 65; suplementos V1 ignorados)
- Deserialize V1
- Serialize V2 não zera suplementos
- Diário: `CHECK_IN_DIARIO_NUTRI_ENABLED === false`
- Capabilities doctor/personal/nutritionist/patient
- Autoria original + `lastEditedBy`
- Flags e comparação
- Prontuário semanal + título do diário legado
- `/aplicacao` ainda tem `localAplicacao`

---

## 18. Pendências (próximas etapas)

- Cronograma MetaNutri (dia/horário, `scheduledDate` configurável)
- Cards verde/laranja/vermelho
- Link público `/checkin-nutri/{token}` e `nutri_checkin_links`
- WhatsApp, cron, fila, e-mail, envio automático
- Remoção física do bloco morto do Check-in Diário em `NutriContent.tsx` (alto volume, baixo benefício agora)
- Gráfico de evolução semanal

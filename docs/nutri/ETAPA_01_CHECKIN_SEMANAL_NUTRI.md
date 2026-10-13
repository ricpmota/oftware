# ETAPA 01 — Check-in Semanal Nutri

Fundação de dados, semana (segunda → domingo), questionário declarativo V1 e wizard reutilizável no padrão visual de `/aplicacao/{token}`.

Esta etapa **não** implementa calendário operacional, cards verde/laranja/vermelho, WhatsApp, cron, link público nem exclusão dos check-ins diários.

---

## Auditoria do `/aplicacao` (o que foi reutilizado)

O questionário público de aplicação vive em:

- `lib/aplicacao/checkInSemanalQuestions.ts` — lista declarativa (`key`, `type`, `label`, `options`, `required`)
- `components/aplicacao/AplicacaoCheckInPageClient.tsx` — wizard: intro + **uma pergunta por tela**, `form: Record<string, string>`, barra de progresso, pills de escolha, validação por passo, tela de sucesso
- `components/metaadmin/AplicacaoCheckInMedicoModal.tsx` — o profissional usa **as mesmas perguntas**
- `app/aplicacao/[token]/page.tsx` + `app/api/aplicacao/[token]/dados|atualizar` — persistência via token

**Padrão reutilizado**

1. Fonte única de perguntas (não copiar título/opções em componentes).
2. Wizard linear (intro → pergunta → pergunta → envio).
3. Form plano `Record<string, string>`.
4. Tipos de pergunta declarados na lista (`slider`, `days`, `single_choice`, etc.).
5. Validação só da pergunta atual.
6. Progresso = passo atual / total de telas.
7. Mesmo questionário para paciente e profissional (muda só `mode` / autoria).

**O que NÃO foi extraído de `/aplicacao`**

`AplicacaoCheckInPageClient` está acoplado a token, white-label, vídeo, indicação, fogos, fotos, dose e `DigitalMeasurePicker`. Extrair um shell compartilhado nesta etapa quebraria o fluxo clínico que já funciona.

O Nutri copia o **conceito visual** (card, progresso, pills, sticky anterior/próximo, tela final) em `components/nutri/checkin-semanal/`, sem alterar arquivos de `/aplicacao`.

Componentes que **poderão** ser unificados depois, com baixo risco, se o `/aplicacao` for desacoplado:

- barra de progresso
- renderer de escolha única (pills)
- shell de página (gradiente + card + sticky footer)

**Risco para `/aplicacao`:** nenhum nesta etapa. Nenhum arquivo de aplicação foi modificado.

**Conteúdo:** as perguntas da aplicação (peso, circunferência, local da aplicação, fome, dose…) **não** foram reutilizadas. São fluxos clínicos diferentes.

---

## 1. Arquivos criados

### Dados e regras (`lib/nutri/`)

| Arquivo | Papel |
|---|---|
| `checkInSemanalNutriTypes.ts` | Schema `CheckInSemanalNutri`, versionamento, path Firestore |
| `checkInSemanalNutriWeek.ts` | Semana única segunda→domingo, `weekKey` |
| `checkInSemanalNutriQuestions.ts` | Fonte única das perguntas V1 + `showIf` |
| `checkInSemanalNutriForm.ts` | Form ↔ respostas + validação por pergunta |
| `calcularScoreCheckInSemanalNutri.ts` | Score 0–100 nutricional (não reutiliza o da aplicação) |
| `checkInSemanalNutriStatus.ts` | Status derivado `upcoming` / `pending` / `completed` |
| `checkInSemanalNutriPersist.ts` | Montagem / serialize Firestore |
| `checkInSemanalNutriStore.ts` | `load` / `save` em `checkinsSemanais/{weekKey}` |
| `checkInSemanalNutriAuthorship.ts` | `answeredBy` / `source` / `nutritionistId` |

### UI (`components/nutri/checkin-semanal/`)

| Arquivo | Papel |
|---|---|
| `CheckInSemanalNutriWizard.tsx` | Wizard reutilizável (`patient` / `nutritionist` / `public`) |
| `CheckInSemanalNutriView.tsx` | Load/save da semana corrente (usado pelo `/meta`) |
| `CheckInSemanalNutriQuestionRenderer.tsx` | Slider, dias, escolha, escala, textarea |
| `CheckInSemanalNutriProgress.tsx` | Barra de progresso + etapa |
| `CheckInSemanalNutriScoreCard.tsx` | Score na tela final |

### Testes

- `lib/nutri/checkInSemanalNutriWeek.spec.ts`
- `lib/nutri/calcularScoreCheckInSemanalNutri.spec.ts`
- `lib/nutri/checkInSemanalNutriStatus.spec.ts`
- `lib/nutri/checkInSemanalNutriAuthorship.spec.ts`
- `lib/nutri/checkInSemanalNutriQuestions.spec.ts`

### Documentação

- `docs/nutri/ETAPA_01_CHECKIN_SEMANAL_NUTRI.md` (este arquivo)

---

## 2. Arquivos alterados

- `components/NutriContent.tsx` — botões **Check-in Semanal** (sidebar + mobile) e view `checkinSemanal` que apenas abre o wizard. Check-in Diário, path `checkins/{YYYY-MM-DD}` e restante do Nutri **permanecem intactos**.

Nenhum arquivo em `lib/aplicacao/`, `components/aplicacao/`, `app/aplicacao/` ou APIs de aplicação foi alterado.

---

## 3. Schema final

`questionnaireVersion: "nutri_weekly_v1"`

```ts
type CheckInSemanalNutri = {
  questionnaireVersion: 'nutri_weekly_v1'
  pacienteId: string
  weekKey: string          // YYYY-MM-DD da segunda
  weekStart: string
  weekEnd: string
  isoWeek?: number         // adicional; não é a chave
  scheduledDate?: string   // preparado para o cronograma (V1 grava o domingo)
  aderenciaPlano: number   // 0–100
  diasProteinaMeta: number
  diasFrutasVegetais: number
  alimentacaoForaPlano: 'nenhuma' | 'pouca' | 'moderada' | 'frequente'
  diasMetaAgua: number
  probioticoDias?: number | null
  wheyDias?: number | null
  creatinaDias?: number | null
  nauseas: 'nenhum' | 'leve' | 'moderado' | 'grave'
  constipacao: 'nenhum' | 'leve' | 'moderado' | 'grave'
  diarreia: 'nenhum' | 'leve' | 'moderado' | 'grave'
  mediaSono?: 'menos_6h' | '6_8h' | 'mais_8h'
  energiaSemana?: number   // 1–5
  sessoesAtividadeFisica?: number // 0–8 (8 = 7+)
  principalDificuldade?: string
  principalConquista?: string
  observacoes?: string
  score?: number
  answeredBy: 'patient' | 'nutritionist' | 'doctor'
  answeredById?: string
  source: 'patient_meta' | 'patient_public_link' | 'nutritionist' | 'doctor'
  nutritionistId?: string
  suplementosAplicaveis?: { probiotico: boolean; whey: boolean; creatina: boolean }
  createdAt: Date
  updatedAt: Date
}
```

---

## 4. Path Firestore

Novo (esta etapa):

```text
pacientes_completos/{pacienteId}/nutricao/dados/checkinsSemanais/{weekStart}
```

Exemplo: `.../checkinsSemanais/2026-08-17`

Legado (intocado):

```text
pacientes_completos/{pacienteId}/nutricao/dados/checkins/{YYYY-MM-DD}
```

Não há migração, conversão nem exclusão dos documentos diários.

---

## 5. Cálculo da semana

Helper único: `lib/nutri/checkInSemanalNutriWeek.ts`.

- Semana Nutri: **segunda → domingo**
- `weekKey` = `weekStart` = YYYY-MM-DD da segunda (calendário **local**, via `ymdLocal`)
- Strings `YYYY-MM-DD` são interpretadas como dia civil local (não `Date.parse` UTC)
- `isoWeek` é gravado como metadado; a identidade da semana **não** usa `2026-W34`

Identidade exigida:

```text
17/08 … 23/08/2026  →  weekKey = 2026-08-17  /  weekEnd = 2026-08-23
```

---

## 6. Estrutura das perguntas

Fonte única: `CHECK_IN_SEMANAL_NUTRI_QUESTIONS`.

Cada item declara `id`, `step`, `type`, `title`, `required`, opções/limites e, quando fizer sentido, `showIf` / `hintFromContext`.

Tipos V1: `slider` | `days` | `days_plus` | `single_choice` | `scale` | `textarea`.

Condicionais: `showIf` já existe (usado nos suplementos). Não há ramificações clínicas nesta V1; a estrutura permite, por exemplo, detalhar GI moderado/grave no futuro.

**Suplementos — limitação V1:** `plano.suplementos` sempre recebe textos de orientação para probiótico, whey e creatina (`gerarSuplementos` no NutriContent). Não dá para inferir com segurança se o paciente usa cada item. V1 exibe as três perguntas; o score **não pune** suplemento marcado como não aplicável (`null` / `suplementosAplicaveis.*.false` redistribui o peso).

---

## 7. Etapas do wizard

1. **Sua alimentação** — aderência, proteína, frutas/vegetais, fora do plano
2. **Hidratação e suplementação** — água (hint com `plano.aguaDia_ml`) + suplementos
3. **Como seu corpo respondeu** — náuseas, constipação, diarreia, sono, energia
4. **Sua rotina** — atividade física, dificuldade, conquista
5. **Para o seu nutricionista** — observações

Não há pergunta sobre Tirzepatida, dose, local ou horário de aplicação.

O wizard **não** depende de router do `/meta`, Firebase Auth nem do modal do `NutriContent`. Recebe `mode`, `week`, `initialData` e `onSubmit`.

---

## 8. Fórmula do score

Função: `calcularScoreCheckInSemanalNutri()` — **não** reutiliza `calcularScoreCheckInSemanal` (aplicação) nem `calcularScoreCheckIn` (diário).

Pesos nominais:

| Bloco | Peso |
|---|---|
| Aderência ao plano | 30% |
| Proteína / alimentação | 25% (proteína 40% + frutas/vegetais 40% + fora do plano 20%) |
| Hidratação | 15% |
| Suplementação | 10% |
| Sintomas / tolerabilidade | 10% |
| Sono / energia | 5% |
| Atividade física | 5% |

Blocos não aplicáveis (suplementos N/A, sono/energia/atividade omitidos) têm peso 0 e o restante é **normalizado**. Resultado 0–100, uma casa decimal.

Exemplos cobertos por teste: semana ideal = 100; aderência 0 e resto ideal = 70; suplementos aplicáveis em 0 dias = 90; suplementos todos N/A = 100.

---

## 9. Autoria

Todo registro grava:

- `answeredBy`: `patient` | `nutritionist` | `doctor`
- `answeredById`
- `source`: `patient_meta` | `patient_public_link` | `nutritionist` | `doctor`

Mapeamento: `mapCheckInSemanalNutriAuthorship()`. O link público ainda não existe; a tipagem e o `mode: "public"` já estão preparados.

---

## 10. `nutritionistId`

Campo opcional no documento. Preenchido com o id do nutricionista que responde **ou**, se o paciente responder, com o primeiro vínculo em `paciente.nutricionistaVinculadoIds`.

Não se assume que o médico é o responsável pelo Check-in Nutri.

---

## 11. Compatibilidade com check-ins diários

Os documentos em `nutricao/dados/checkins/{YYYY-MM-DD}` continuam sendo lidos/gravados pelo Check-in Diário atual. O semanal só lê/escreve `checkinsSemanais`. Sem backfill, sem overwrite, sem mudança de IDs.

---

## 12. Preparação para `/checkin-nutri/{token}`

O wizard e o schema já aceitam `mode: "public"` e `source: "patient_public_link"`.

Nesta etapa **não** foram criados:

- coleção `nutri_checkin_links`
- rota `/checkin-nutri/[token]`
- `GET /api/checkin-nutri/link`
- `POST /api/checkin-nutri/[token]/...`

A etapa seguinte pode copiar o padrão de `aplicacao_links` + `/aplicacao/{token}` usando o mesmo `CHECK_IN_SEMANAL_NUTRI_QUESTIONS`.

Uso previsto da fonte única:

```text
QUESTIONÁRIO NUTRI ─┬── /meta → Nutri (CheckInSemanalNutriView)
                    ├── /checkin-nutri/{token}   (futuro)
                    └── /metanutri               (futuro, mode=nutritionist)
```

---

## 13. Deliberadamente NÃO implementado nesta etapa

- Calendário operacional do MetaNutri
- Cards verde / laranja / vermelho
- WhatsApp, automações, cron, envio de link, notificações
- Token público `/checkin-nutri/{token}`
- Redesign pesado do Nutri
- Exclusão ou migração dos check-ins diários
- Extração de componentes compartilhados com `/aplicacao`
- Condicionais clínicas extras (além da estrutura `showIf`)
- Inferência confiável de quais suplementos o paciente usa

`scheduledDate` e o helper de status existem para os cards futuros; V1 grava `scheduledDate = weekEnd` (domingo) no save do `/meta`, sem UI de cronograma.

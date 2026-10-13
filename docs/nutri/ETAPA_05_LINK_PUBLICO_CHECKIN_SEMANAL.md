# ETAPA 05 — Link público do Check-in Semanal Nutri

Paciente responde o Check-in Semanal V2 em `/checkin-nutri/{token}` **sem login** no `/meta`. O nutricionista gera/copia o link no Calendário do MetaNutri.

Fora desta etapa: WhatsApp, cron, fila, D-1/D0, e-mail. Questionário V2, score, schedule e `/aplicacao` não foram alterados. Check-in Diário permanece desativado.

---

## 1. Auditoria de `/aplicacao`

Referência operacional apenas. Nenhum arquivo de `/aplicacao` foi modificado.

1. **Idempotência.** `aplicacao_links` guarda `key = pacienteId_data_semana`. `ensureAplicacaoPublicLink` consulta `where('key','==',key).limit(1)` e reutiliza o `doc.id` (token).
2. **Token.** `lib/publicLinks/publicLinkToken.ts`: 8 caracteres do alfabeto `23456789ABCDEFGHJKLMNPQRSTUVWXYZ`, `crypto.randomBytes`, create-until-unique. Doc ID = token público.
3. **Página.** `/aplicacao/[token]` é pública (middleware operacional). Sem Firebase Auth no cliente.
4. **GET `/api/aplicacao/[token]/dados`.** Resolve o token → `pacienteId` → contexto da semana/dose/nome. Expõe mais dados clínicos do que o Nutri precisa (evolução, medidas). Nutri entrega só o mínimo.
5. **POST `/api/aplicacao/[token]/atualizar`.** Token é a fonte de `pacienteId`/semana. Recalcula score da **aplicação** (não reutilizado).
6. **`jaPreenchido`.** Derivado do registro clínico (`evolucaoSeguimento`), não só do status do link.
7. **Sem autenticação.** Token basta. GET/POST Admin SDK.
8. **Token inválido.** 400 formato / 404 inexistente. Mensagem genérica.
9. **Já respondido.** Formulário de aplicação ainda permite fluxo próprio; Nutri V1 é somente leitura depois do envio.
10. **White-label.** Layout de `/aplicacao` resolve marca do médico pelo token. O Check-in Nutri **não** herda essa marca nesta etapa (título fixo).

Padrão copiado: `slot → ensure link → token estável → página pública → GET contexto → wizard → POST → dado clínico`.

Não reutilizado: `aplicacao_links`, perguntas/score/dose/fotos/`evolucaoSeguimento`.

---

## 2. Arquitetura

```text
Calendário MetaNutri (card pending)
        ↓
POST /api/checkin-nutri/link  (auth + vínculo)
        ↓
ensureNutriCheckInPublicLink
        ↓
nutri_checkin_links/{token}
        ↓
/checkin-nutri/{token}
        ↓
GET /api/checkin-nutri/{token}/dados
        ↓
CheckInSemanalNutriWizard mode=public
        ↓
POST /api/checkin-nutri/{token}/atualizar
        ↓
pacientes_completos/{patientId}/nutricao/dados/checkinsSemanais/{weekKey}
        ↓
card completed (existência do doc clínico)
```

Gerar o link **não** cria o documento clínico.

---

## 3. Collection

```text
nutri_checkin_links/{token}
```

Token = ID do documento. Campo de negócio: `key`.

---

## 4. Schema do link

```ts
{
  patientId: string
  nutritionistId: string
  weekKey: string          // segunda YYYY-MM-DD
  weekStart: string
  weekEnd: string
  scheduledDate?: string   // do schedule ativo
  scheduledTime?: string
  key: string              // nutritionistId_patientId_weekKey
  status: 'active' | 'completed' | 'revoked'
  createdAt / updatedAt
  createdBy
  organizationId           // shadow
}
```

Fonte de verdade clínica: existência de `checkinsSemanais/{weekKey}`. `status=completed` é espelho após o POST.

---

## 5. Chave idempotente

```text
nutritionistId + patientId + weekKey
→ nutri_123_pac_456_2026-08-17
```

Mesma tríade → mesmo token. Nova `weekKey` → novo token. Outro nutricionista → outra identidade.

---

## 6. Geração do token

Mesmo helper de `/aplicacao`: `allocateUniquePublicLinkToken` / `generatePublicLinkToken`. Aleatório, curto, sem IDs na URL.

---

## 7. Endpoint ensure

`POST /api/checkin-nutri/link`

- Header `Authorization: Bearer <Firebase ID token>`
- Body: `{ patientId, weekKey }`
- `nutritionistId` = UID autenticado (não confiar no cliente)
- Exige vínculo ativo em `paciente_nutricionista`
- Normaliza `weekKey` via `getNutritionWeek`
- Lê schedule vigente (`nutri_checkin_schedules`) para `scheduledDate` / `scheduledTime`
- Resposta: `{ url, token, weekKey }`

---

## 8. Página pública

```text
/checkin-nutri/[token]
```

Sem login. Middleware: rota operacional no domínio Método (como `/aplicacao/`). Wizard V2 com `mode=public`.

---

## 9. GET contexto

`GET /api/checkin-nutri/[token]/dados`

```ts
{
  valid: true
  alreadyCompleted: boolean
  patient: { firstName }
  week: { weekKey, weekStart, weekEnd, label }
  nutritionist: { displayName }
  context: { aguaDia_ml? }  // só de nutri_planos/{paciente}_{nutri}
  score?: number            // se alreadyCompleted
}
```

Sem CPF, telefone, e-mail, prontuário, plano completo, medicamentos, financeiro, IDs.

---

## 10. POST

`POST /api/checkin-nutri/[token]/atualizar`

- Identidade (`patientId`, `weekKey`, `nutritionistId`) **só do token**
- Zod em `checkInSemanalNutriAnswersSchema`
- Score oficial: `calcularScoreCheckInSemanalNutri()` no backend
- Semana antiga não respondida: permitido (token ativo)
- Já existe clínico: **409**, sem editar (V1 somente leitura no link)
- Token **não** é invalidado; `status` → `completed`

---

## 11. Validação

Campos V2: aderência, proteína, frutas, extras, água, náuseas, constipação, diarreia, energia 1–5, sessões 0–8, dificuldade, conquista, observações. `outra` exige texto. Campos V1 de suplemento/sono não são aceitos no POST público. `score` / `weekKey` / `patientId` do cliente são ignorados.

---

## 12. Autoria

```text
answeredBy = patient
source = patient_public_link
answeredById ausente
nutritionistId do link
```

Edição autenticada no `/meta` continua nas regras da ETAPA 02/03.

---

## 13. `scheduledDate`

Persistido no link a partir do schedule ativo. No save público, se o clínico ainda não tem `scheduledDate`, usa o valor do link. Merge existente preserva o original.

---

## 14. Segundo acesso

`alreadyCompleted` → tela **Check-in concluído** + score. Sem wizard vazio. Sem botão editar no link.

---

## 15. Privacidade

GET escolhe campos. Página não recebe o documento do paciente. Logs de erro sem token completo, sem respostas, sem observações.

---

## 16. Segurança

- Token imprevisível
- Ensure autenticado + vínculo
- POST/GET públicos só com token
- Token inválido / paciente ausente → mesma mensagem
- Firestore Admin nas rotas; collection não é lida pelo SDK cliente

---

## 17. Calendário

Card **pending** (e upcoming com `scheduledDate <= hoje`): **Preencher Check-in** (nutri) + **Copiar link** (ensure + clipboard).

Card **completed**: **Ver resultado**. Link não é ação principal.

Card futuro (`scheduledDate > hoje`): sem Copiar link na UI; o ensure ainda funciona para a ETAPA 06 (D-1).

Refresh: botão Atualizar já existente + `reload` ao fechar o wizard do nutri. Sem polling.

---

## 18. Arquivos criados

- `lib/nutri/checkInSemanalNutriPublicLink.ts`
- `lib/nutri/checkInSemanalNutriAnswersSchema.ts`
- `lib/nutri/checkInSemanalNutriPublicDados.ts`
- `lib/nutri/ensureNutriCheckInPublicLink.ts`
- `lib/nutri/checkInSemanalNutriPersist.server.ts`
- `lib/nutri/copyNutriCheckInPublicLink.ts`
- `lib/nutri/checkInSemanalNutriEtapa05.spec.ts`
- `app/api/checkin-nutri/link/route.ts`
- `app/api/checkin-nutri/[token]/dados/route.ts`
- `app/api/checkin-nutri/[token]/atualizar/route.ts`
- `app/checkin-nutri/[token]/page.tsx`
- `app/checkin-nutri/[token]/layout.tsx`
- `components/nutri/checkin-semanal/CheckInSemanalNutriPublicPage.tsx`
- `docs/nutri/ETAPA_05_LINK_PUBLICO_CHECKIN_SEMANAL.md`

---

## 19. Arquivos alterados

- `lib/nutri/checkInSemanalNutriPersist.ts` — serialize com `Date` (sem SDK cliente; rotas Admin podem reutilizar)
- `lib/nutri/checkInSemanalNutriSchedule.ts` — `deserializeNutriWeeklyCheckInSchedule` puro
- `lib/nutri/checkInSemanalNutriScheduleStore.ts` — reexport
- `lib/nutri/checkInSemanalNutriSchedule.spec.ts`
- `components/nutri/checkin-semanal/CheckInSemanalNutriWizard.tsx` — intro/resumo `mode=public`
- `components/profissional/ProfissionalCalendarioSection.tsx` — Copiar link
- `middleware.ts` — `/checkin-nutri/` operacional no domínio Método
- `lib/migrations/organizationBackfillCollections.ts`
- `lib/platform-audit/auditPublicLinks.ts`

Não alterados: rotas/páginas de `/aplicacao`, questions V2, fórmula de score, schema de schedule, WhatsApp/cron.

---

## 20. Testes

`lib/nutri/checkInSemanalNutriEtapa05.spec.ts`

- mesma tríade → mesmo token
- nova weekKey → novo token
- outro nutri → outra key
- token aleatório sem IDs
- ensure não cria clínico
- GET mínimo / sem PHI
- POST ignora score/weekKey/patientId
- `outra` exige texto
- autoria `patient_public_link` + `scheduledDate`
- Copiar link só `scheduledDate <= hoje` e não completed
- diário off / V2 intacto / `/aplicacao` intacto

---

## 21. Próximos passos (ETAPA 06)

WhatsApp manual + automático + fila + D-1 + D0 + atrasado + deduplicação, **reutilizando a mesma URL** `/checkin-nutri/{token}`. O robô não deve criar outro path.

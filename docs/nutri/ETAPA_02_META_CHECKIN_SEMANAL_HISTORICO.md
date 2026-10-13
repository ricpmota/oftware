# ETAPA 02 — `/meta`: Check-in Semanal + Histórico Semanal

A experiência principal do paciente em `/meta` → Nutri deixa de ser o Check-in Diário e passa a ser o **Check-in Semanal Nutri** criado na ETAPA 01.

Esta etapa **não** implementa token público, WhatsApp, cron, cards do MetaNutri nem integração definitiva com o Prontuário.

---

## 1. Arquivos criados

| Arquivo | Papel |
|---|---|
| `lib/nutri/canEditWeeklyNutritionCheckIn.ts` | Semana atual editável; passada = view |
| `lib/nutri/checkInSemanalNutriMerge.ts` | Merge seguro + ordenação do histórico |
| `lib/nutri/checkInSemanalNutriLabels.ts` | Rótulos humanos das respostas |
| `components/nutri/checkin-semanal/CheckInSemanalNutriCta.tsx` | Botão da semana atual (estado preenchido/não) |
| `components/nutri/checkin-semanal/CheckInSemanalNutriDetails.tsx` | Resumo / detalhes da semana |
| `components/nutri/checkin-semanal/CheckInSemanalNutriHistorico.tsx` | Lista semanal + summary do legado |
| `lib/nutri/checkInSemanalNutriEtapa02.spec.ts` | Testes de persistência, edição e isolamento |
| `docs/nutri/ETAPA_02_META_CHECKIN_SEMANAL_HISTORICO.md` | Este arquivo |

---

## 2. Arquivos alterados

- `components/NutriContent.tsx` — CTA do paciente, view semanal, aba Histórico. Check-in Diário permanece no código (legado / nutricionista).
- `components/nutri/checkin-semanal/CheckInSemanalNutriView.tsx` — modos `create` / `edit` / `view`; não grava `scheduledDate` automaticamente.
- `components/nutri/checkin-semanal/CheckInSemanalNutriWizard.tsx` — cabeçalho da semana, sucesso, “Ver meu histórico”.
- `lib/nutri/checkInSemanalNutriStore.ts` — `setDoc(..., { merge: true })` + `loadWeeklyNutritionCheckIns`.
- `lib/nutri/checkInSemanalNutriPersist.ts` — não escreve `scheduledDate`/`nutritionistId` nulos.
- `lib/nutri/checkInSemanalNutriWeek.ts` — labels longa e curta.

**Não alterados:** `lib/aplicacao/*`, `components/aplicacao/*`, `app/aplicacao/*`, Prontuário (`nutricaoProntuarioService` continua lendo só `checkins` diários).

---

## 3. Fluxo do paciente

```text
/meta → Nutri
  → botão Check-in Semanal (semana corrente)
  → wizard ETAPA 01 (sem seletor de dia)
  → salvar em checkinsSemanais/{weekKey}
  → Perfeito! → Ver meu histórico
  → card da semana → Ver detalhes (view)
  → Editar Check-in (só semana atual)
```

---

## 4. Botão

No `/meta` (paciente, não `modoNutricionista`):

- Check-in Diário **sai do fluxo principal**.
- Check-in Semanal mostra a semana (`17–23 ago`) ou “✓ Check-in da semana concluído”.

No MetaNutri (`modoNutricionista`): o diário permanece acessível para não redesenhar a superfície profissional nesta etapa.

MetaPersonal (`somenteVisualizacao`): sem CTA de preenchimento; histórico em leitura.

---

## 5. Semana atual

`getNutritionWeek(new Date())` — segunda → domingo, `weekKey` = segunda em YYYY-MM-DD local.

O paciente **não** escolhe dia.

---

## 6. Criação

Sem registro da `weekKey` corrente → `create` → wizard.

Documento: `pacientes_completos/{id}/nutricao/dados/checkinsSemanais/{weekKey}`.

Autoria no `/meta`: `answeredBy = patient`, `source = patient_meta`, `answeredById` = UID quando houver.

`nutritionistId` só se existir vínculo (`nutricionistaVinculadoIds` ou ator nutricionista). Não é inventado.

`scheduledDate` **não** é preenchido automaticamente (fica para o Cronograma do MetaNutri).

---

## 7. Edição

`canEditWeeklyNutritionCheckIn`: `true` só na semana corrente e se não for `readOnly`.

Reabrir a semana atual: **view** → “Editar Check-in” → mesmas respostas → recálculo de score → `updatedAt` novo, `createdAt` preservado.

A mesma `weekKey` é o ID: não há duplicata.

---

## 8. Visualização

Semana passada ou MetaPersonal: `view` com detalhes. “Ver detalhes” no histórico **não** abre formulário de criação.

---

## 9. Persistência

`saveCheckInSemanalNutri`:

1. lê o doc existente;
2. recalcula score;
3. `mergeCheckInSemanalNutriWrite` preserva `createdAt`, `scheduledDate`, `nutritionistId` e chaves desconhecidas;
4. `setDoc(ref, merged, { merge: true })`.

Coleção diária `checkins/{YYYY-MM-DD}` não é lida nem escrita por este fluxo.

---

## 10. Histórico

Aba Histórico:

1. **Check-ins Semanais** — cards (mais recente primeiro), 12 por página, “Carregar mais”.
2. **Histórico anterior** (`<details>`) — calendário diário legado, só se existirem documentos em `checkins`.

Score visual: ≥80 verde, ≥60 amarelo, &lt;60 vermelho (mesma convenção da ETAPA 01). Delta vs semana anterior é opcional e simples.

---

## 11. Legado diário

Não apagar, não migrar, não misturar na mesma timeline sem identificação.

O Prontuário profissional **ainda lê só `checkins` diários**. Integração do semanal no Prontuário: etapa posterior.

---

## 12. Mobile

Wizard `max-w-lg`, progress sticky, footer com `safe-area-inset-bottom`, textarea com margem inferior para o teclado. Overlay full-screen no `/meta` (não embed). `body.overflow` restaurado ao fechar (`checkin` e `checkinSemanal`).

---

## 13. Impactos MetaNutri / MetaAdmin / MetaPersonal

| Superfície | Efeito |
|---|---|
| `/meta` paciente | Fluxo principal semanal |
| `/metanutri` | Herda histórico semanal; diário ainda no menu profissional |
| `/metaadmin` | NutriContent não é o prontuário; prontuário diário intacto |
| `/metapersonal` | `somenteVisualizacao`: lê histórico, não preenche |

---

## 14. Pendências (próximas etapas)

- `/checkin-nutri/{token}` e `nutri_checkin_links`
- WhatsApp / cron / fila
- Cards verde/laranja/vermelho no calendário MetaNutri
- `scheduledDate` definido pelo nutricionista
- Integração do Check-in Semanal com o Prontuário
- Remoção definitiva do Check-in Diário (quando o legado não for mais necessário)

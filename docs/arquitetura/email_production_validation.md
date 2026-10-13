# Production Validation — Automation Engine (E-mail)

**Fase:** Shadow Validation (pré-cutover queue)  
**Estado atual (baseline NOC):** `BLOCKED` — fila vazia, shadow OFF  
**Queue engine:** **NÃO ativar** sem autorização explícita.

---

## Baseline observacional (registrado)

Registrado em **2026-07-12** (horário local UTC-3), antes do rebuild + shadow.

### NOC — última run motor legado

| Métrica | Valor |
|---------|-------|
| Engine Status | Healthy |
| Org Queue | 0 |
| Org Legacy | 2 |
| Org Shadow | 0 |
| Reads última run | 136 |
| Writes última run | 25 |
| Tempo execução | ~1,9 min |
| Queue Pending | 0 |
| Queue Sent | 0 |
| Shadow comparações | 0 |
| Shadow Validation ON | false |
| Fila populada | false |

### Google Cloud (observacional — não causalidade exclusiva do cron)

| Métrica | Valor aproximado |
|---------|------------------|
| Firestore Read Ops (mês) | ~112 milhões |
| Custo Read Ops (mês) | ~R$ 295 |
| Query `/email_envios` | Entre principais consumidores |

**Uso pós-piloto queue:** comparar reads/run, writes/run, duração/run, volume `/email_envios`, custo projetado.

---

## Relógio oficial das 72h

```text
PRODUCTION_VALIDATION_STARTED_AT: null
```

**As 72h NÃO começam no deploy.** Só registrar quando **todos** forem verdadeiros:

1. Fila `email_automation_queue` populada (`counts.total > 0`).
2. `EMAIL_QUEUE_SHADOW_VALIDATION=true` em Production.
3. ≥ 1 comparação real persistida (`email_queue_shadow/aggregate.totalComparisons >= 1`).
4. Operations Center recebendo métricas (`ops-dashboard` + `shadow-stats` OK).

Quando atendido, preencher:

```text
PRODUCTION_VALIDATION_STARTED_AT: <ISO-8601>
PRODUCTION_VALIDATION_72H_ENDS_AT: <ISO-8601 + 72h>
```

---

## FASE A — Pré-flight (código + índices)

### A.1 Índices em `firestore.indexes.json`

| Query / uso | Índice | Repo |
|-------------|--------|------|
| Fila vencida global | `status` + `scheduledFor` | ✅ |
| Fila por org | `organizationId` + `status` + `scheduledFor` | ✅ |
| SLA / sent recentes | `status` + `sentAt` DESC | ✅ |
| SLA por org | `organizationId` + `status` + `sentAt` DESC | ✅ |
| Processing age (ops) | `status` + `updatedAt` | ✅ |
| Shadow mismatches recentes | `createdAt` DESC | ✅ |
| Shadow events janela | `createdAt` ASC (range `>=`) | ✅ |

**Ação operacional:** confirmar no [Firebase Console → Indexes](https://console.firebase.google.com/project/oftware-9201e/firestore/indexes) que todos estão **Enabled** (não só no git).

```bash
firebase deploy --only firestore:indexes --project oftware-9201e
```

### A.2 Código — garantias (sem alteração necessária)

| Garantia | Onde |
|----------|------|
| Rebuild **não envia** e-mail | `rebuildEmailAutomationQueueForOrganization`, cron `rebuild-email-queue` |
| Rebuild **não altera** `email_envios` | Só lê via `fetchEnviosCampanhaPorLeadIds` |
| IDs determinísticos | `lead_{leadId}_{emailTipo}` |
| Não reabre `sent` → `pending` | `upsertQueueItem`: se `status !== pending`, `skipped: true` |
| Motor legado continua enviando | `getEmailAutomationEngine` → default `legacy`; queue só se `engine=queue` |
| Shadow só compara | `runShadowValidationForLegacyLeadsAptos` + flag `EMAIL_QUEUE_SHADOW_VALIDATION` |
| Queue **não** ativado nesta fase | Manter `automation.email.engine = legacy` em todas as orgs |

---

## FASE B — Rebuild inicial da fila

### Opção 1 — API admin (recomendado, sob demanda)

**Endpoint:** `POST /api/metaadmingeral/automacoes/email-queue/rebuild`  
**Auth:** `Authorization: Bearer <Firebase ID token do MetaAdmin Geral>`  
**Body (org Método / default):**

```json
{ "organizationId": "metodo" }
```

**cURL (substituir TOKEN):**

```bash
curl -s -X POST "https://<SEU_DOMINIO>/api/metaadmingeral/automacoes/email-queue/rebuild" \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"organizationId":"metodo"}'
```

**Resposta esperada (`shadowMode: true`):**

```json
{
  "ok": true,
  "scope": "organization",
  "shadowMode": true,
  "result": {
    "organizationId": "metodo",
    "leadsScanned": <N>,
    "leadsEligible": <N>,
    "leadsIneligible": <N>,
    "enqueued": <N>,
    "updated": <N>,
    "skippedExisting": <N>,
    "skippedConversion": <N>
  }
}
```

**Timeout:** rota com `maxDuration = 300` (5 min). Se falhar por tempo, repetir — `upsert` é idempotente para itens não-pending.

### Opção 2 — Cron diário (backup)

`GET /api/cron/rebuild-email-queue` — agenda `45 6 * * *` em `vercel.json`.  
Não substitui o rebuild manual inicial; use para consistência diária.

### O rebuild NÃO pode

- Enviar e-mail (Zepto)
- Duplicar docs (id determinístico)
- Alterar `email_envios`
- Reabrir `sent` / `failed` / `skipped` para `pending`
- Alterar cron legado de envio

---

## FASE B — Validação pós-rebuild (métricas)

### Via Operations Center

`/metaadmingeral?menu=automation-ops` — conferir counts e `Fila populada`.

### Via API

```bash
curl -s "https://<SEU_DOMINIO>/api/metaadmingeral/automacoes/email-queue/stats?organizationId=metodo" \
  -H "Authorization: Bearer TOKEN"
```

Registrar:

- `stats.counts.total`, `pending`, `processing`, `sent`, `failed`, `skipped`
- `stats.dueNow`

### Distribuição por `emailTipo`

O endpoint `stats` não agrega por tipo. No **Firebase Console → Firestore → `email_automation_queue`**, amostrar ou exportar e agrupar por campo `emailTipo` (`email1`…`email5`).

Expectativa: ~5 docs por lead elegível (sequência completa), com `sent` nos tipos já enviados pelo legado.

---

## FASE C — Consistência fila × `email_envios`

Executar **antes** de ligar shadow. Se houver inconsistência material → **não** ativar shadow.

### Checklist

| # | Regra | Como validar |
|---|-------|----------------|
| 1 | Histórico `email_envios.status=enviado` → fila `sent` | Amostra 20 leads com envios; doc `lead_{uid}_{tipo}` deve ser `sent` |
| 2 | Lead convertido → `skipped` | Leads em `solicitacoes_medico` / `pacientes_completos` com médico |
| 3 | Futuros elegíveis → `pending` | Tipos não enviados e não convertidos |
| 4 | IDs determinísticos | Formato `lead_{leadId}_{emailTipo}` único |
| 5 | Sem duplicata lógica | Um doc por par lead+tipo |

### Amostragem rápida (Console)

1. Coleção `email_envios` — filtrar `tipo=automatico`, `status=enviado`, pegar `leadId` + `emailTipo`.
2. Doc `email_automation_queue/lead_{leadId}_{emailTipo}` deve existir com `status=sent` e `sentAt` coerente.

### Diagnóstico de inconsistência

| Sintoma | Ação |
|---------|------|
| Fila `pending` mas `email_envios` já `enviado` | Re-run rebuild; se persistir, investigar `fetchEnviosCampanhaPorLeadIds` |
| Fila `sent` sem envio legado | Verificar se envio manual ou tipo fora campanha email1–5 |
| Convertido como `pending` | Re-run rebuild; verificar maps de conversão |
| `total=0` após rebuild | Verificar erro/timeout do POST; logs Vercel `[metaadmingeral/automacoes/email-queue/rebuild]` |

---

## FASE D — Ativar Shadow Validation

**Somente se FASE C OK.**

### Vercel Production

1. Project → Settings → Environment Variables  
2. `EMAIL_QUEUE_SHADOW_VALIDATION` = `true`  
3. **Redeploy** Production (variável só vale após deploy)

### Governança de engine (manter)

```http
GET /api/metaadmingeral/automacoes/email-queue/set-engine?organizationId=metodo
```

Deve retornar `engine: "legacy"` para **todas** as orgs. **Não** usar `queue`.

> Nota: `engine=shadow` no Firestore é governança documental; a comparação shadow é controlada pela **flag de ambiente** acima. Nesta fase manter `legacy`.

---

## FASE E — Confirmar shadow em produção

Após próximas execuções do cron `send-automatic-emails` (*/15):

### Operations Center

- Shadow Validation ON = **true**
- Fila populada = **true**
- Comparações > 0 (crescendo)
- Match Rate com dados reais

### API

```bash
curl -s "https://<SEU_DOMINIO>/api/metaadmingeral/automacoes/email-queue/shadow-stats?organizationId=metodo" \
  -H "Authorization: Bearer TOKEN"
```

### Logs Vercel

Filtrar: `[email_queue_shadow]`

Validar campos: `MATCH`, `MISMATCH`, `mismatchKind`, `isCritical` / critical mismatches.

---

## FASE F — Início oficial das 72h

Quando critérios da seção **Relógio oficial** forem atendidos:

1. Atualizar este arquivo com `PRODUCTION_VALIDATION_STARTED_AT`.
2. Registrar no relatório operacional / NOC (screenshot ou export `shadow-stats`).
3. Estado → `SHADOW VALIDATING` (observação 72h em curso).

---

## Máquina de estados

| Estado | Condição |
|--------|----------|
| **BLOCKED** | Fila vazia OU shadow OFF OU inconsistência FASE C |
| **SHADOW VALIDATING** | Fila OK + shadow ON + comparações > 0 + 72h em curso |
| **READY FOR 72H OBSERVATION** | Critérios FASE F registrados; aguardando conclusão 72h + checklist cutover |

**Estado atual documentado:** `BLOCKED`

---

## Referências

- [email_automation_queue.md](./email_automation_queue.md)
- [email_cutover.md](./email_cutover.md)
- Operations Center: `/metaadmingeral?menu=automation-ops`

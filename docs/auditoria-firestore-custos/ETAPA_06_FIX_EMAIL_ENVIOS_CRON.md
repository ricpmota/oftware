# ETAPA 06 — Fix full-scan crítico em `email_envios` (cron leads)

**Data:** 2026-05-31  
**Escopo:** `app/api/cron/send-automatic-emails/route.ts` + índice Firestore.  
**Restrição cumprida:** sem alteração de UI, layout ou regras visuais.

---

## 1. Antes / depois do trecho crítico

### Antes (ETAPA 05 — ~1,29 bi reads/30d)

```typescript
// 5. Buscar todos os envios já realizados
const enviosSnapshot = await db.collection('email_envios').get();
const envios: any[] = enviosSnapshot.docs.map(doc => ({ /* ... */ }));
const enviosPorLead = new Map<string, any[]>();
envios.forEach(envio => { /* agrupa por leadId em memória */ });

// Loop em allFirebaseUsers usando enviosPorLead.get(user.uid)
```

- **1 query** por execução do cron.
- **~157k–223k reads** (coleção inteira).
- Custo cresce linearmente com **todos** os envios ever (aplicação, nutri, agenda, etc.).

### Depois (ETAPA 06)

```typescript
const enviosPorLeadCache = new Map<string, EnvioCampanhaLead[]>();

for (const user of allFirebaseUsers) {
  // ... elegibilidade existente (email, solicitação, médico, dataMinima) ...
  if (horasDesdeCriacao < 1) continue; // skip sem query

  const enviosDoLead = await fetchEnviosCampanhaPorLead(db, user.uid, enviosPorLeadCache);
  const { proximoEmail, proximoEnvio } = calcularProximoEmailCampanha(enviosDoLead, createdAt, agora);
  // ...
}

async function fetchEnviosCampanhaPorLead(db, leadId, cache) {
  const snapshot = await db
    .collection('email_envios')
    .where('leadId', '==', leadId)
    .where('emailTipo', 'in', ['email1','email2','email3','email4','email5'])
    .get();
  // cache por leadId na execução
}
```

- **0 queries** se nenhum candidato com ≥1h desde cadastro.
- **1 query por lead candidato** (tipicamente 0–5 docs retornados).
- **Sem** `collection('email_envios').get()` e **sem fallback** full-scan.

---

## 2. Sequência email1–email5 preservada

A lógica de decisão foi extraída para `calcularProximoEmailCampanha()` **sem alteração de regras**:

| Etapa | Condição temporal | Pré-requisito de envio anterior |
|-------|-------------------|--------------------------------|
| email1 | ≥ 1h desde cadastro | — |
| email2 | ≥ 24h | email1 `status === 'enviado'` |
| email3 | ≥ 72h | email2 enviado |
| email4 | ≥ 168h (7d) | email3 enviado |
| email5 | ≥ 336h (14d) | email4 enviado |

Envio só ocorre se `proximoEnvio <= agora` (mesma condição de antes).

Filtros de elegibilidade **inalterados**:

- Sem e-mail válido → excluído
- Com `solicitacoes_medico` → excluído
- Com `medicoResponsavelId` em `pacientes_completos` → excluído
- Cadastro antes de `2025-11-20` → excluído

---

## 3. Como evita duplicidade

| Mecanismo | Status |
|-----------|--------|
| Verificação `emailN enviado` via histórico em `email_envios` | Mantida — agora por lead |
| Lock cron (`acquireCronLock`) | Mantido |
| Gate produção/host (`assertCronProductionEnvironment`) | Mantido |
| Gate Zepto (`assertCronZeptoConfigured`) | Mantido |
| Limite por execução (`getCronZeptoMaxSendsPerRun`) | Mantido |
| Registro `envioRef.set(...)` após envio | Mantido |
| Throttle Zepto (`cronEmailThrottle`) | Mantido |

A query segmentada retorna apenas tipos `email1`–`email5` do **mesmo leadId**, suficiente para saber se cada etapa já foi enviada com sucesso.

---

## 4. Índice Firestore necessário

Adicionado em `firestore.indexes.json`:

```json
{
  "collectionGroup": "email_envios",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "leadId", "order": "ASCENDING" },
    { "fieldPath": "emailTipo", "order": "ASCENDING" }
  ]
}
```

**Query que exige o índice:**

```
email_envios
  WHERE leadId == ?
  AND emailTipo IN ['email1','email2','email3','email4','email5']
```

**Deploy do índice:**

```bash
firebase deploy --only firestore:indexes
```

> Se o índice ainda não estiver ativo, a primeira execução do cron retornará erro com link de criação no console Firebase. Não há fallback full-scan — o índice deve ser deployado antes ou logo após o deploy do código.

---

## 5. Estimativa de redução de reads

| Cenário | Antes (reads/exec) | Depois (reads/exec) | Redução |
|---------|-------------------:|--------------------:|--------:|
| Coleção ~220k docs, cron ativo | ~220.000 | ~N × 0–5 docs* | **~99%+** |
| Sem candidatos ≥1h | ~220.000 | **0** | **100%** |
| 500 candidatos, média 2 envios/lead | ~220.000 | ~1.000 | **~99,5%** |
| 30 dias (8.194 exec histórico) | ~1,29 bi | ~5–15 M (est.)** | **~98–99%** |

\* N = leads elegíveis com ≥1h e sem solicitação/médico.  
\*\* Depende do número de usuários Auth na janela de campanha; não escala mais com e-mails de aplicação/agenda.

**Query Insights esperado pós-fix:**

- Docs verificados/consulta: de **~157k–223k** → **0–5 por query** (ou **<100 docs/exec** típico).
- Reads diários `email_envios`: de **~56 M** → **<500k** (ordem de grandeza).

---

## 6. Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Índice não deployado | Erro explícito no cron; deploy `firestore:indexes` |
| Mais queries Firestore (1/candidato) | Ainda << 1 full-scan; candidatos <1h não consultam |
| `leadId` inconsistente (uid vs outro id) | Comportamento idêntico ao anterior (mesmo campo `leadId` no write L353) |
| Candidatos muitos (milhares) | Reads ainda ~O(candidatos×5) vs O(coleção); ETAPA futura: doc agregado `leads_email_state` |
| Outros full-scans em `email_envios` | `leads-email-status`, `emailConfigService` — fora do escopo desta etapa |

---

## 7. Checklist

- [x] Sem `db.collection('email_envios').get()` no cron `send-automatic-emails`
- [x] Sem fallback full-scan
- [x] UI / layout / fluxo visual não alterados
- [x] Sequência email1–email5 preservada
- [x] Lock cron mantido (`acquireCronLock` / `releaseCronLock`)
- [x] Gate produção mantido (`assertCronProductionEnvironment`)
- [x] Gate Zepto mantido (`assertCronZeptoConfigured`)
- [x] Limite batch Zepto mantido (`getCronZeptoMaxSendsPerRun`)
- [x] Índice documentado em `firestore.indexes.json`
- [x] Métricas de observabilidade na resposta JSON (`emailEnviosQueries`, `emailEnviosDocsLidos`)
- [x] Build aprovado (`npm run build` — exit 0)

---

## 8. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/api/cron/send-automatic-emails/route.ts` | Full-scan → consulta segmentada + cache + early return |
| `firestore.indexes.json` | Índice composto `leadId` + `emailTipo` |

---

## 9. Confirmação técnica

```bash
# Verificar ausência de full-scan no cron
rg "collection\('email_envios'\)\.get\(\)" app/api/cron/send-automatic-emails/route.ts
# → sem matches
```

**Economia estimada:** ~**1,25–1,28 bilhão reads/mês** eliminados do cron de leads (≈97–99% do consumo de `email_envios` identificado na ETAPA 05).

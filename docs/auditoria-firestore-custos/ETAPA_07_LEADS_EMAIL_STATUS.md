# ETAPA 07 — Otimizar `/api/leads-email-status`

**Data:** 2026-05-31  
**Escopo:** `app/api/leads-email-status/route.ts` + helper compartilhável.  
**Restrição cumprida:** sem alteração de UI, layout ou payload JSON da Gestão Visual.

---

## 1. Antes / depois da query

### Antes (ETAPA 05 — risco ALTO)

```typescript
const enviosSnapshot = await adminDb
  .collection('email_envios')
  .where('emailTipo', 'in', ['email1','email2','email3','email4','email5'])
  .orderBy('enviadoEm', 'desc')
  .get();
```

- Carregava **todos** os envios históricos de campanha (email1–email5) de **todos** os leads.
- Sem `limit` / paginação.
- Custo crescia com cada e-mail enviado na história da plataforma (dezenas de milhares+ docs).
- Leads exibidos na UI são um subconjunto filtrado — a query trazia dados de leads **fora da lista**.

### Depois (ETAPA 07 — Opção A)

```typescript
// 1) Montar leadsFormatted (mesma lógica de elegibilidade)
const leadIds = leadsFormatted.map((lead) => lead.id);

// 2) Consultar email_envios só desses leadIds, em batches de 30
const { enviosPorLead, docsLidos } = await fetchEnviosCampanhaPorLeadIds(adminDb, leadIds);

// fetchEnviosCampanhaPorLeadIds:
//   .where('leadId', 'in', batchAté30).get()
//   filtro emailTipo in [email1..email5] em memória
//   dedup por emailTipo (mantém enviadoEm mais recente)
```

- **0 reads** em `email_envios` se `leadsFormatted.length === 0`.
- **ceil(N/30) queries** para N leads exibidos.
- Reads ≈ soma dos docs retornados por batch (tipicamente **0–5 por lead** de campanha; pode incluir outros tipos filtrados em memória).

---

## 2. Como a Gestão Visual foi preservada

### Dados que a UI consome (`LeadsEmailDashboard`)

| Campo | Uso na UI | Preservado |
|-------|-----------|------------|
| `leadId`, `leadEmail`, `leadNome`, `dataCriacao` | Tabela de leads | ✓ (de Auth + filtros) |
| `email1`…`email5` (`enviado`, `status`, `dataEnvio`) | Ícones, badges, datas, botão Enviar | ✓ |
| `proximoEmail`, `proximoEnvio` | Coluna contagem regressiva | ✓ (mesma lógica temporal) |
| `medicoNome`, `emailConversao`, `dataConversao` | Colunas médico/conversão | ✓ |
| Estatísticas (`total`, `conversoes`, `emailNEnviados`) | Cards superiores | ✓ |

**Payload:** continua `NextResponse.json(status)` — array de `LeadEmailStatus[]`, sem campos novos obrigatórios na UI.

**Regras de negócio inalteradas:**

- Filtros de lead (sem solicitação, sem médico, data ≥ 20/11/2025).
- Status `nao_enviar` / `pendente` / `enviado` / `falhou` por email.
- Sequência email1→email5 e cálculo de `proximoEmail`.
- Detecção de conversão via campo `conversao` no envio.

**Dedup emailTipo:** quando há múltiplos envios do mesmo tipo, mantém o de **`enviadoEm` mais recente** (equivalente ao comportamento anterior com `orderBy('enviadoEm','desc')` + `.find()`).

---

## 3. Reads esperados

| Cenário | Antes | Depois |
|---------|------:|-------:|
| 200 leads na Gestão Visual, ~2 envios campanha/lead | ~40.000+ (todos históricos globais) | ~400–1.000* |
| 500 leads | ~40.000–100.000+ | ~1.000–2.500* |
| 0 leads elegíveis | ~40.000+ (ainda lia campanha) | **0** |
| 1 abertura admin/dia | 1× query global | ceil(N/30) queries segmentadas |

\*Inclui docs não-campanha retornados por `leadId in` (ex.: aplicação) — filtrados em memória, mas contados como read pelo Firestore. Ainda muito menor que histórico global.

**Por abertura típica (200 leads):** ~**99% menos reads** em `email_envios` vs. query anterior.

---

## 4. Índice necessário

Query final:

```
email_envios WHERE leadId IN (até 30 valores)
```

- Usa índice **simples automático** em `leadId` — **não exige novo índice composto** para esta rota.
- O índice `leadId + emailTipo` (ETAPA 06) continua necessário para o **cron** `send-automatic-emails`, não para esta rota.

> Firestore permite **apenas uma** cláusula `in` por query — por isso não usamos `leadId in` + `emailTipo in` juntos; o filtro de tipo é feito em memória.

---

## 5. Cache server-side

**Não implementado** nesta etapa.

Motivo: a UI chama `loadStatus()` imediatamente após envio manual (`sendEmailManually` → `await loadStatus()`). Cache de resposta (TTL 60–120s) deixaria a Gestão Visual **stale** até expirar, sem alterar a UI para bust de cache.

**Opção C (futuro):** doc agregado `leads_email_state/{leadId}` — documentado como evolução ideal; reduziria reads a ~1/lead com cache seguro.

---

## 6. Riscos residuais

| Risco | Mitigação / nota |
|-------|------------------|
| Batch `leadId in` retorna envios não-campanha | Filtrados em memória; reads ligeiramente acima do mínimo teórico |
| Muitos leads exibidos (500+) | Várias queries (ceil(N/30)); ainda << histórico global |
| Auth + solicitações + pacientes ainda pesados | Fora do escopo desta etapa (não são `email_envios`) |
| Duplicata emailTipo | Dedup por `enviadoEm` mais recente |

---

## 7. Checklist

- [x] UI / layout não alterados
- [x] Sem full-scan de `email_envios`
- [x] Sem query global `where('emailTipo','in',…).orderBy('enviadoEm').get()`
- [x] Status email1–email5 preservados
- [x] Payload JSON compatível com `LeadsEmailDashboard`
- [x] Build aprovado (`npm run build` — exit 0)

---

## 8. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/api/leads-email-status/route.ts` | Substituição da query global por batches por `leadId` |
| `lib/leadsEmailStatus/fetchEnviosCampanhaPorLeadIds.ts` | Helper reutilizável (batch 30, filtro campanha, dedup) |

---

## 9. Confirmação técnica

```bash
rg "orderBy\('enviadoEm'" app/api/leads-email-status/route.ts
# → sem matches

rg "where\('emailTipo'" app/api/leads-email-status/route.ts
# → sem matches
```

**Economia estimada por abertura da Gestão Visual:** de **dezenas de milhares** para **centenas–baixos milhares** de reads em `email_envios` (~**95–99%**), dependendo do número de leads exibidos e do histórico por lead.

---

## 10. Opção C — evolução futura (apenas documentada)

Criar `leads_email_state/{leadId}` atualizado no write de `email_envios`:

```typescript
{
  email1: { enviado: true, status: 'enviado', dataEnvio: Timestamp },
  // … email2–email5
  proximoEmail: 'email3',
  proximoEnvio: Timestamp,
  updatedAt: Timestamp
}
```

Benefício: 1 read/lead na Gestão Visual, independente do volume histórico em `email_envios`.

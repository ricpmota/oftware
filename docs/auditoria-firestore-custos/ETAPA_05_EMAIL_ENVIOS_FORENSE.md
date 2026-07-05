# ETAPA 05 — Forense da coleção `email_envios`

**Data:** 2026-05-31  
**Escopo:** mapear **todas** as leituras em `email_envios`, estimar impacto, identificar o gerador dos ~1,29 bi reads/30d.  
**Restrição:** nenhuma correção aplicada nesta etapa — apenas localização e plano.

---

## 1. Resumo executivo

| Métrica Query Insights (fornecida) | Valor |
|---|---|
| Últimas 24h — execuções | 253 |
| Últimas 24h — reads | 56.406.769 |
| Últimas 24h — docs verificados/consulta | ~222.729 |
| 30 dias — execuções | 8.194 |
| 30 dias — reads | 1.291.308.000 |
| 30 dias — docs verificados/consulta | ~157.434 |

**Correlação matemática:**

```
1.291.308.000 reads ÷ 8.194 exec ≈ 157.586 reads/exec
56.406.769 reads ÷ 253 exec ≈ 223.148 reads/exec
```

O padrão é **uma consulta que varre praticamente a coleção inteira** (~157k–223k documentos, crescendo com o tempo), executada **centenas de vezes por dia**.

### Suspeito principal (confirmado no código)

**`app/api/cron/send-automatic-emails/route.ts` linha 216:**

```typescript
const enviosSnapshot = await db.collection('email_envios').get();
```

- Sem `where`, sem `orderBy`, sem `limit` → **full-scan**.
- Cron agendado em `vercel.json`: `*/15 * * * *` (96 exec/dia máx. em produção).
- Média observada 30d: **273 exec/dia** → compatível com janela que incluiu schedule `*/5` (288/dia) antes da ETAPA 04.1.
- **Encaixe perfeito:** 8.194 × ~157k ≈ **1,29 bi reads**.

### Conclusão

> **≥95% do consumo de `email_envios` vem do cron `send-automatic-emails`**, que carrega todos os envios para montar um `Map<leadId, envios[]>` em memória antes de decidir o próximo e-mail da sequência email1–email5.

---

## 2. Metodologia

1. `grep` em `app/`, `services/`, `components/`, `lib/` por `email_envios`, `ENVIOS_COLLECTION`, `enviosCollection`.
2. Classificação de cada ocorrência: **READ** vs **WRITE** (`add`, `set`, `create`, `updateDoc`).
3. Exclusão de `app - Copia/**` (código duplicado legado, não deployado).
4. Cruzamento com consumidores UI/API e schedule em `vercel.json`.
5. Estimativa de impacto: reads/exec × frequência.

---

## 3. Inventário completo — LEITURAS (`email_envios`)

### 3.1 CRÍTICO

| # | Arquivo | Linha | Query completa | Filtros | orderBy | limit | Gatilho / frequência | Reads/exec estimados | Impacto 30d estimado |
|---|---------|------:|----------------|---------|---------|------:|----------------------|---------------------:|---------------------:|
| **C1** | `app/api/cron/send-automatic-emails/route.ts` | 216 | `db.collection('email_envios').get()` | *(nenhum)* | *(nenhum)* | **Não** | Cron Vercel `*/15` + gate produção + lock Zepto | **~157k–223k** (tamanho da coleção) | **~1,0–1,3 bi** (dominante) |

**Detalhe C1 — uso pós-query (linhas 217–228):**

```typescript
const enviosPorLead = new Map<string, any[]>();
envios.forEach(envio => { /* agrupa por leadId em memória */ });
```

Para cada lead apto (Firebase Auth), consulta `enviosPorLead.get(user.uid)` — ou seja, **precisa apenas dos envios dos leads elegíveis**, mas lê **100% da coleção** a cada execução.

**Problemas identificados:**

- Full-scan sem índice parcial.
- Filtro de negócio (`email1`–`email5`, `status === 'enviado'`) feito **em memória** após varredura.
- Executado mesmo quando `envioAutomatico.ativo === false`? **Não** — retorna antes (L146). Mas quando ativo, sempre full-scan.
- Lock evita concorrência, **não** reduz reads.

---

### 3.2 ALTO

| # | Arquivo | Linha | Query completa | Filtros | orderBy | limit | Gatilho | Reads/exec | Notas |
|---|---------|------:|----------------|---------|---------|------:|---------|----------:|-------|
| **A1** | `app/api/leads-email-status/route.ts` | 217–221 | `.collection('email_envios').where('emailTipo','in',['email1'…'email5']).orderBy('enviadoEm','desc').get()` | `emailTipo in [5 tipos]` | `enviadoEm desc` | **Não** | GET `/api/leads-email-status` — aba "Gestão Visual" em `EmailManagement` → `LeadsEmailDashboard` (`useEffect` mount + após envio manual) | **Todos os envios de campanha leads** (potencialmente dezenas de milhares) | ETAPA 02 removeu full-scan total; ainda retorna subconjunto grande sem paginação |
| **A2** | `services/emailConfigService.ts` | 471–476 | Client SDK: `query(collection(db,'email_envios'), orderBy('enviadoEm','desc'))` + `getDocs` | *(nenhum)* | `enviadoEm desc` | **Não** | `getAllEnvios()` ← `getLeadsEmailStatus()` | **Full-scan client-side** (~157k+) | **Código morto em produção atual** — nenhum componente chama `getLeadsEmailStatus`; dashboard usa API A1. Risco se reativado |
| **A3** | `services/emailConfigService.ts` | 424–429 | Client SDK: `query(collection(db,'email_envios'), orderBy('enviadoEm','desc'))` + filtro `leadId` **em memória** | Filtro real: nenhum no Firestore | `enviadoEm desc` | **Não** | `getEnviosPorLead(leadId)` ← `verificarConversoes()` | **Full-scan por lead convertido** | **Código morto** — `verificarConversoes` sem callers ativos |

---

### 3.3 MÉDIO

| # | Arquivo | Linha | Query completa | Filtros | orderBy | limit | Gatilho | Reads/exec | Notas |
|---|---------|------:|----------------|---------|---------|------:|---------|----------:|-------|
| **M1** | `services/aplicacaoService.ts` | 296–301 | Client SDK: `where('emailTipo','in',['aplicacao_aplicacao_antes','aplicacao_aplicacao_dia'])` | `emailTipo in [2]` | — | **Não** | `verificarStatusEmails()` ← `buscarAplicacoesAgendadas()` ← `CalendarioAplicacoes` (metaadmingeral) | Todos envios de aplicação na coleção | Filtro no Firestore, mas sem `limit`; escopo = histórico inteiro de aplicações |
| **M2** | `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` | 247–256 | Duas queries paralelas: `.where('emailTipo','==','leads_nutri_email1').where('enviadoEm','>=',dataMinEnvio).get()` e idem `leads_personal_email1` | tipo + janela 180d (`CRON_LEADS_EMAIL_LOOKBACK_DAYS`) | — | **Não** | Cron `*/15` | Proporcional aos envios nutri/personal na janela | Otimizado na ETAPA 02; ainda sem `limit` |
| **M3** | `app/api/cron/send-email-aplicacao/route.ts` | 226–229 | `.where('leadId','==',id).where('emailTipo','in',['aplicacao_aplicacao_antes','aplicacao_aplicacao_dia']).get()` | `leadId` + `emailTipo in` | — | **Não** | Cron 3×/dia (08:00, 12:00, 16:00) × **N pacientes × M aplicações futuras** | Baixo por query; **multiplica** no loop outer (L195) | N+1 pattern; filtro assunto/data em memória |
| **M4** | `app/api/send-email-solicitado-medico/route.ts` | 80–84 | `.where('emailTipo','==','solicitado_medico_boas_vindas').where('solicitacaoId','==',id).where('status','==','enviado').get()` | 3 equalities | — | **Não** | POST dedup por solicitação | ~0–1 | Índice composto; resultado pequeno |
| **M5** | `app/api/send-email-solicitado-personal/route.ts` | 42 | `.where('emailTipo'…).where('solicitacaoId'…).where('status','==','enviado').get()` | 3 equalities | — | **Não** | POST dedup | ~0–1 | Idem M4 |
| **M6** | `app/api/send-email-solicitado-nutri/route.ts` | 44 | Idem M5 para nutri | 3 equalities | — | **Não** | POST dedup | ~0–1 | Idem M4 |

---

### 3.4 BAIXO

| # | Arquivo | Linha | Query completa | Filtros | orderBy | limit | Gatilho | Reads/exec |
|---|---------|------:|----------------|---------|---------|------:|---------|----------:|
| **B1** | `app/api/email-envios/route.ts` | 47–50 | `.orderBy('enviadoEm','desc').limit(250).get()` | — | `enviadoEm desc` | **250** | Aba "Caixa de Saída" em `EmailManagement` (click manual) | **250** |
| **B2** | `app/api/cron/send-email-conclusao-lembrete/route.ts` | 223–230 | `.where('leadId','==',id).where('emailTipo','==',EMAIL_DOC_ID).limit(25).get()` (+ fallback `.where('leadId').limit(40)`) | `leadId` + tipo | — | **25–40** | Cron 1×/dia (08:15) por paciente com conclusão hoje | ≤40 |
| **B3** | `services/emailConfigService.ts` | 513–514 | `getDoc(doc(db,'email_envios', envioId))` | doc ID | — | **1** | `atualizarStatusEnvio()` | **1** | Sem callers ativos identificados |

---

## 4. Inventário — ESCRITAS (referência, não geram full-scan)

Estas rotas **registram** envios (`add` / `set` / `create`) — impacto principal é **crescimento da coleção** (que amplifica C1), não reads diretos:

| Área | Arquivos (amostra) |
|------|-------------------|
| Crons | `send-automatic-emails`, `send-automatic-emails-leads-nutri-personal`, `send-email-aplicacao`, `send-email-agenda-*`, `send-email-aniversariante`, `send-email-conclusao-lembrete` |
| API manual | `send-email-lead`, `send-email-lead-avulso`, `send-email-bem-vindo*`, `send-email-aplicacao`, `send-email-novidades`, `send-email-plano-editado*`, `send-email-novo-lead-*`, `send-email-conclusao-tratamento`, `lead/route.ts`, etc. |
| Lock idempotente | `send-email-solicitado-medico` L164–180 (`create` doc lock, não query) |

**Total de arquivos ativos com write:** ~35 rotas em `app/api/`.

---

## 5. Mapa de consumidores (UI → API → Firestore)

```
vercel.json (*/15)
  └── /api/cron/send-automatic-emails ──► email_envios.get()  [CRÍTICO C1]

vercel.json (*/15)
  └── /api/cron/send-automatic-emails-leads-nutri-personal ──► 2× query filtrada [MÉDIO M2]

vercel.json (3×/dia)
  └── /api/cron/send-email-aplicacao ──► N× query por paciente [MÉDIO M3]

metaadmingeral/page.tsx
  └── EmailManagement
        ├── aba "Gestão Visual" → LeadsEmailDashboard → GET /api/leads-email-status [ALTO A1]
        └── aba "Caixa de Saída" → GET /api/email-envios limit 250 [BAIXO B1]
  └── CalendarioAplicacoes → AplicacaoService.verificarStatusEmails [MÉDIO M1]
```

**`EmailConfigService.getAllEnvios` / `getEnviosPorLead`:** presentes em `services/emailConfigService.ts`, **sem caller ativo** fora do próprio service (legado; dashboard migrou para API server-side).

---

## 6. Ranking consolidado

| Nível | ID | Local | Motivo |
|-------|-----|-------|--------|
| **CRÍTICO** | C1 | `cron/send-automatic-emails` L216 | Full-scan `.get()` sem filtros; ~157k–223k reads × ~250–290 exec/dia ≈ **1,29 bi/30d** |
| **ALTO** | A1 | `leads-email-status` L217–221 | Subconjunto filtrado mas **sem limit**; dashboard admin |
| **ALTO** | A2 | `emailConfigService.getAllEnvios` | Full-scan client; morto mas perigoso |
| **ALTO** | A3 | `emailConfigService.getEnviosPorLead` | Full-scan + filtro memória; morto |
| **MÉDIO** | M1 | `aplicacaoService.verificarStatusEmails` | Query filtrada sem limit; UI calendário |
| **MÉDIO** | M2 | `cron/send-automatic-emails-leads-nutri-personal` | 2 queries/janela; já parcialmente otimizado |
| **MÉDIO** | M3 | `cron/send-email-aplicacao` | N+1 por paciente/aplicação |
| **MÉDIO** | M4–M6 | rotas `send-email-solicitado-*` | Dedup pontual; baixo volume |
| **BAIXO** | B1 | `email-envios` limit 250 | Paginado corretamente |
| **BAIXO** | B2 | `send-email-conclusao-lembrete` | limit 25–40 |
| **BAIXO** | B3 | `atualizarStatusEnvio` getDoc | 1 read; sem uso ativo |

---

## 7. Estimativa de impacto por fonte (30 dias)

| Fonte | Execuções 30d (est.) | Reads/exec | Reads 30d (est.) | % do total |
|-------|---------------------:|-----------:|-----------------:|-----------:|
| **C1** cron `send-automatic-emails` | ~8.000–8.200 | ~157k–223k | **~1,25–1,30 bi** | **~97–99%** |
| A1 dashboard leads | ~50–200 (admin) | ~5k–50k* | ~0,5–10 M | <1% |
| M2 cron nutri/personal | ~8.000 | ~500–5k | ~4–40 M | <3% |
| M1 calendário aplicações | ~100–500 | ~10k–50k | ~1–25 M | <2% |
| M3 cron aplicação | ~90 | variável | ~0,5–5 M | <1% |
| Demais | esporádico | ≤100 | desprezível | ~0% |

\*Depende de quantos documentos existem com `emailTipo in [email1..email5]`.

**Validação cruzada Query Insights:**

```
8.194 exec × 157.434 docs ≈ 1.290.000.000 reads  ✓
253 exec × 222.729 docs ≈ 56.350.000 reads       ✓
```

Assinatura única: **consulta sem cláusula WHERE** varrendo ~tamanho total da coleção.

---

## 8. Suspeito principal — evidências

### 8.1 Código

```216:228:app/api/cron/send-automatic-emails/route.ts
    const enviosSnapshot = await db.collection('email_envios').get();
    const envios: any[] = enviosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      enviadoEm: doc.data().enviadoEm?.toDate(),
    }));
    const enviosPorLead = new Map<string, any[]>();
    envios.forEach(envio => {
      if (!enviosPorLead.has(envio.leadId)) {
        enviosPorLead.set(envio.leadId, []);
      }
      enviosPorLead.get(envio.leadId)!.push(envio);
    });
```

### 8.2 Schedule

```12:14:vercel.json
      "path": "/api/cron/send-automatic-emails",
      "schedule": "*/15 * * * *"
```

(Histórico: ETAPA 04.1 alterou de `*/5` → `*/15`; janela de 30d ainda reflete execuções mais frequentes.)

### 8.3 Por que não é A1 (leads-email-status)?

- A1 usa `where('emailTipo', 'in', [...])` — Query Insights mostraria filtros, não ~157k docs **sem filtro**.
- A1 dispara sob demanda (admin UI), não ~250×/dia de forma estável.
- Volume de A1 seria ordens de magnitude menor que 1,29 bi no período.

---

## 9. Suspeitos secundários

1. **A1 — `/api/leads-email-status`:** maior risco **fora do cron**; carrega todos envios email1–5 para montar status. Correção: paginação + cache ou doc agregado por lead.
2. **A2/A3 — `emailConfigService`:** dead code perigoso; remover ou reescrever antes de qualquer reuso.
3. **M1 — `aplicacaoService`:** client-side full subset de aplicações; impacto moderado quando admin abre calendário.
4. **M2 — cron nutri/personal:** já filtrado por janela; monitorar crescimento.
5. **M3 — cron aplicação:** padrão N+1; escala com pacientes ativos, não explica 1,29 bi sozinho.

---

## 10. Plano de correção (ETAPA 06 — não implementado)

Prioridade estrita: **eliminar C1 primeiro** (maior ROI imediato).

### 10.1 C1 — Cron `send-automatic-emails` (CRÍTICO)

**Opção recomendada (menor risco de negócio):**

Substituir full-scan por query **por lead apto** ou **batch por leadIds**:

```typescript
// Por lead elegível (uid):
db.collection('email_envios')
  .where('leadId', '==', uid)
  .where('emailTipo', 'in', ['email1','email2','email3','email4','email5'])
  .get();
```

- Reads por exec ≈ `leadsAptos × ~0–5` em vez de ~220k.
- Se muitos leads aptos: usar `where('leadId', 'in', batch)` (máx. 30 por query Admin SDK) ou **documento-resumo** `leads_email_state/{uid}` atualizado no write.

**Opção alternativa (mais trabalho, melhor longo prazo):**

- Coleção/materialização `leads_email_state/{leadId}` com flags `{ email1: true, … }` mantida no `set`/`add` de `email_envios`.
- Cron lê apenas leads aptos + doc de estado (1 read/lead).

**Quick win adicional:**

- Early return **antes** do full-scan se contagem de leads aptos (Auth filtrado) = 0.
- Manter gate produção + lock (ETAPA 04).

### 10.2 A1 — Dashboard leads (ALTO)

- Adicionar `limit` + paginação ou cursor.
- Cache HTTP 60–120s no route handler.
- Ideal: mesmo doc agregado de 10.1.

### 10.3 A2/A3 — Dead code (ALTO / preventivo)

- Deprecar `getAllEnvios`, `getEnviosPorLead`, `getLeadsEmailStatus` no client SDK ou reimplementar delegando à API server-side já existente.
- Remover `verificarConversoes` se confirmado morto.

### 10.4 M1 — Calendário aplicações (MÉDIO)

- Filtrar por `leadId in pacientesVisiveis` ou janela temporal (`enviadoEm >= inicioMes`).
- Preferir status vindo do cron/server em vez de client full-query.

### 10.5 M3 — Cron aplicação (MÉDIO)

- Pré-filtrar pacientes com aplicação hoje/amanhã **antes** do loop.
- Cache local de envios por `leadId` dentro da execução.
- Doc lock por `(leadId, numeroAplicacao, tipo)` em vez de re-query.

### 10.6 Monitoramento pós-correção

- Query Insights: docs/consulta em `email_envios` deve cair de ~157k para **<100** na query do cron.
- Meta: reads `email_envios` < **5 M/mês** (vs ~1,3 bi atual).

---

## 11. Checklist de verificação pós-deploy (futuro)

- [ ] Query Insights: execuções/dia do full-scan ≈ 0
- [ ] Cron `send-automatic-emails` ainda envia sequência email1–5 corretamente
- [ ] Dashboard "Gestão Visual" exibe status consistente
- [ ] Calendário de aplicações mantém badges de e-mail
- [ ] Crescimento de `email_envios` monitorado (TTL/archival opcional)

---

## 12. Arquivos auditados (leitura)

| Caminho | Tipo |
|---------|------|
| `app/api/cron/send-automatic-emails/route.ts` | READ CRÍTICO |
| `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` | READ |
| `app/api/cron/send-email-aplicacao/route.ts` | READ |
| `app/api/cron/send-email-conclusao-lembrete/route.ts` | READ |
| `app/api/leads-email-status/route.ts` | READ |
| `app/api/email-envios/route.ts` | READ |
| `app/api/send-email-solicitado-{medico,personal,nutri}/route.ts` | READ dedup |
| `services/emailConfigService.ts` | READ (client, legado) |
| `services/aplicacaoService.ts` | READ (client) |
| `components/EmailManagement.tsx` | consumidor API |
| `components/LeadsEmailDashboard.tsx` | consumidor API |
| `components/CalendarioAplicacoes.tsx` | consumidor service |
| `vercel.json` | schedule crons |

**Ignorado:** `app - Copia/**` (contém cópias antigas incluindo full-scan em `leads-email-status` L238 — não representa deploy atual).

---

## 13. Resposta à pergunta central

> **Quem está gerando os 1,29 bilhões de reads?**

**O cron `/api/cron/send-automatic-emails`**, linha 216, com `db.collection('email_envios').get()` sem filtros nem limit, executado centenas de vezes por dia (~8.194 vezes em 30 dias), lendo ~157k–223k documentos por execução.

Nenhuma outra consulta mapeada possui assinatura e frequência compatíveis com o volume reportado pelo Query Insights.

# ETAPA 04.1 — Correção residual de leads duplicados e crons antigos

**Data:** 2026-05-31  
**Escopo:** `loadLeadsMedico` em `/metaadmin`, proteção de ambiente/host nos crons, frequência de e-mail.

---

## A) /metaadmin — leads duplicados

### Onde `"Leads processados"` era logado

Único ponto: final de `loadLeadsMedico` em `app/metaadmin/page.tsx` (~linha 6015), após Fase 2 (sync solicitações → leads).

### Causa da triplicação na abertura

| # | Gatilho | Efeito |
|---|---------|--------|
| 1 | Menu padrão = `estatisticas` → `loadLeadsMedico()` no mount | 1ª execução completa |
| 2 | `useEffect` consolidado dependia de `medicoPerfil` (objeto) + callbacks (`loadPacientes`, etc.) | Reexecução quando referência do médico/callbacks mudava |
| 3 | Sem cache nem `loadingLeadsRef` | Cada reexecução refazia Firestore + processamento paralelo de ~119 solicitações |

**Chamadas mapeadas:**

- `useEffect` menu `estatisticas` (automático)
- `handleAceitarSolicitacao` / `handleRejeitarSolicitacao` (`force` após mutação)
- Botão Atualizar pipeline (`force`)
- Fluxos pós-conclusão de tratamento (`force`)

### Correções aplicadas

1. **`loadingLeadsRef`** — impede execuções concorrentes.
2. **Cache `metaadminSessionCache` — leads por `medicoId`:**
   - `getLeads` / `setLeads` / `hasLeads` / `invalidateLeads`
   - Bundle: `leadsMedico`, `leadsByStatus`, `loadedAt`
3. **`loadLeadsMedico({ force?: boolean })`:**
   - Cache hit → restaura estado, **0 reads**
   - `force: true` → invalida cache (botão Atualizar, mutações)
   - Solicitações reutilizadas do cache quando já carregadas por `loadSolicitacoesMedico`
   - Grava solicitações no cache se buscadas dentro de `loadLeadsMedico`
4. **`useEffect` separado para leads** — deps: `[user?.uid, medicoPerfil?.id, activeMenu]`; **não** depende de `loadPacientes`/`loadPagamentos`.
5. **Effect principal** usa `medicoPerfil?.id` em vez do objeto inteiro.
6. **`console.log('Leads processados')` → `devLog`** (suprimido em produção).

### Chamadas após correção (abertura típica em `estatisticas`)

| Evento | Chamadas `loadLeadsMedico` | Reads/processamento |
|--------|---------------------------|---------------------|
| 1ª abertura sessão | 1 (effect) | 1× leads + solicitações (ou cache solicitações) |
| Re-render médico/callbacks | 0 (cache ou `loadingLeadsRef`) | 0 |
| Trocar pacientes ↔ estatísticas | 0 | 0 (cache) |
| Botão Atualizar | 1 (`force: true`) | Recarga completa |

**Antes:** ~3× `"Leads processados: 119"`  
**Depois:** 1× (dev) ou 0 log em produção após cache

---

## B) Crons — ambiente, host e ZeptoMail

### `vercel.json`

- `send-automatic-emails`: `*/5` → **`*/15`**
- `send-automatic-emails-leads-nutri-personal`: `*/5` → **`*/15`**

Motivo: batch limit (`CRON_ZEPTO_MAX_SENDS_PER_RUN`, default 25) + lock já existente; */15 reduz invocações em ~66% sem perder fila (próxima rodada continua).

Demais crons: frequência inalterada.

### Novo: `lib/email/cronProductionGate.ts`

Ordem em **todas** as rotas `/api/cron/*`:

1. **`assertCronProductionEnvironment(request)`**
   - `VERCEL_ENV !== 'production'` → `{ skipped: true, reason: 'non_production_environment' }` (HTTP 200)
   - Host não está em `CRON_ALLOWED_HOSTS` (default: `www.oftware.com.br`, `oftware.com.br`) → `{ skipped: true, reason: 'unexpected_host' }`
2. **`assertCronZeptoConfigured()`** (rotas de e-mail) → **503** antes de Firebase/Auth
3. Firebase / lock / processamento

### Deployments antigos no painel Vercel

**Comportamento esperado:** Vercel Cron só agenda no **deployment de produção atual**. Logs de deployments antigos geralmente indicam:

- Preview/branch deployments sendo acessados manualmente ou por URL antiga
- Projeto duplicado ou ambiente preview com `vercel.json` herdado
- Invocações antes desta correção (sem gate de host)

**Ação manual recomendada no painel Vercel:**

1. **Settings → Cron Jobs** — confirmar que só o projeto de produção ativo lista os crons.
2. Remover/desativar **projetos duplicados** ou previews que não devem rodar cron.
3. Garantir domínio primário `www.oftware.com.br` como alvo de produção.
4. Se cron legítimo usar outro host, definir `CRON_ALLOWED_HOSTS` no env de produção.

Após deploy desta etapa, previews e deploys antigos retornam `skipped` sem Firestore/Auth/Zepto.

### ZeptoMail sem credencial

`/api/cron/send-automatic-emails`: gate Zepto é o **2º passo** (após env), **antes** de `getFirebaseAdmin()` — retorna **503** imediato, sem reads.

---

## C) Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/metaadmin/page.tsx` | Cache/guard leads, effect isolado, devLog |
| `lib/metaadmin/metaadminSessionCache.ts` | Cache leads por médico |
| `lib/email/cronProductionGate.ts` | **Novo** — gate produção/host |
| `vercel.json` | Crons e-mail */5 → */15 |
| `app/api/cron/send-automatic-emails/route.ts` | Env gate + ordem Zepto |
| `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` | Idem |
| `app/api/cron/atualizar-conversao/route.ts` | Env gate |
| `app/api/cron/daily-notifications/route.ts` | Env gate |
| `app/api/cron/send-email-*.ts` (5 rotas) | Env gate |

---

## Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Cron produção com host `*.vercel.app` bloqueado | Configurar `CRON_ALLOWED_HOSTS` se Vercel invocar por URL `.vercel.app` |
| Leads stale até refresh | Botão Atualizar e mutações usam `force: true` |
| */15 atraso máx. ~10 min extra por e-mail vs */5 | Batch limit já limitava; monitorar fila `email_envios` |
| Projeto Vercel duplicado fora do repo | Remoção manual no painel |
| `loadLeadsMedico` ainda faz writes em Fase 2 na 1ª carga | Comportamento de negócio preservado; cache evita repetir na sessão |

---

## Checklist ETAPA 04.1

- [x] Mapear `"Leads processados"`
- [x] Identificar chamadas duplicadas de `loadLeadsMedico`
- [x] 1 carga por sessão/médico (cache + guard)
- [x] `loadingLeadsRef`
- [x] Cache leads por `medicoId`
- [x] Effect isolado (sem dep de pacientes)
- [x] Reutilizar solicitações em cache
- [x] `devLog` no hot path
- [x] Atualizar com `force: true`
- [x] Gate `VERCEL_ENV` + host em todos os crons
- [x] Zepto 503 antes de Firebase em rotas de e-mail
- [x] */15 nos crons de e-mail automático
- [x] Relatório ETAPA_04_1

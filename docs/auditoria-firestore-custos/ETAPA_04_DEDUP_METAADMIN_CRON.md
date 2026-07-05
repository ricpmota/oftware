# ETAPA 04 — Deduplicação de carregamento da /metaadmin e controle de cron

**Data:** 2026-05-31  
**Escopo:** `app/metaadmin/page.tsx`, crons ZeptoMail (`*/5 * * * *`), cache de sessão e logs de produção.

---

## 1. Problemas identificados

| # | Problema | Causa raiz |
|---|----------|------------|
| 1 | Médico carregado 2–3× na abertura | Portão (`getMedicoByUserId`) + `loadMedicoPerfil` + `useEffect` por menu (`pacientes`, `meu-perfil`, `estatisticas`) |
| 2 | Pacientes recarregados ao trocar aba | `useEffect` separados em `pacientes`, `financeiro`, `estatisticas` sem cache |
| 3 | Solicitações duplicadas | Mesmo `useEffect` + `loadLeadsMedico` buscava solicitações de novo |
| 4 | Financeiro: pagamentos 2× para ~124 pacientes | `loadPacientes` chamava `loadPagamentos` + `useEffect` em `financeiro` após `loadingPacientes` |
| 5 | NPS: múltiplas verificações | `loadPacientes` (query batch) + `useEffect` NPS (re-loop pacientes + logs por paciente) |
| 6 | Mensagens refetch ao reentrar menu | `useEffect` em `mensagens` sem cache |
| 7 | Logs excessivos em produção | ~76 `console.log` em `page.tsx`, muitos em hot paths |
| 8 | Crons a cada 5 min com erro SMTP | `vercel.json` agenda `*/5`; execuções concorrentes sem lock; Zepto sem credencial gera 503 (já havia gate, mas lock faltava) |

---

## 2. Mapeamento de `useEffect` (metaadmin)

### Mantidos (UI/comportamento, sem fetch duplicado)

- Tema, mensagens toast, drag IMC, modais, fotos gráfico, depoimentos, check-ins por pasta, prescrições modal, OAuth Bry, depoimentos home, calendário interval (25s com `force`), lembretes, trocas/férias por menu.

### Consolidados / alterados

| Antes | Depois |
|-------|--------|
| 3× `useEffect` → `loadMedicoPerfil` por menu | 1× no portão `metaadminSouMedicoGate === 'sim'`; removidos reloads em `pacientes` / `meu-perfil` / `estatisticas` |
| 2× `useEffect` → `loadPacientes` (`estatisticas` + `pacientes/financeiro`) | 1× effect consolidado por menu com cache |
| 1× `useEffect` → `loadPagamentos` pós-`loadingPacientes` | **Removido** — pagamentos vêm de `loadPacientes` ou cache |
| NPS `useEffect` com loop + logs | 1 verificação `getRespostaPorUserId` por sessão; semana > 2 usa pacientes já carregados |

---

## 3. Implementações

### 3.1 Cache de sessão (`lib/metaadmin/metaadminSessionCache.ts`)

Cache em memória (por aba/navegador) para:

- Médico (por `userId`)
- Pacientes + bundle secundário (mensagens não lidas, fotos, NPS map, nutrição, `temPacienteSemana2`)
- Solicitações
- Pagamentos (com flag `hasPagamentos` para lista vazia válida)
- Mensagens admin

Invalidação em: logout/troca de conta, `{ force: true }` em mutações, fechar modal pagamento, intervalo calendário.

### 3.2 Guardas de carregamento (`useRef`)

- `loadingMedicoRef`, `loadingPacientesRef`, `loadingPagamentosRef`, `loadingSolicitacoesRef`, `loadingMensagensRef`
- `npsMedicoVerificadoRef` — evita re-query NPS do médico
- `loadPagamentosChamadoPorLoadPacientes` — mantido para compatibilidade

### 3.3 Logs (`lib/devLog.ts`)

`devLog` / `devDebug` suprimidos quando `NODE_ENV !== 'development'` e `NEXT_PUBLIC_VERCEL_ENV` não é `development`/`preview`. Aplicado nos hot paths de carga (médico, pacientes, financeiro, solicitações, leads).

### 3.4 Pagamentos — leitura direcionada

- Novo `PagamentoService.getPagamentosPorPacienteIds(ids)` — N reads (N = pacientes do médico)
- Substitui `getAllPagamentos()` + filtro client-side (full-scan da coleção)

### 3.5 Crons (`lib/email/cronExecutionLock.ts`)

- Lock Firestore `cron_locks/{id}` com TTL 4 min (transação)
- Aplicado em:
  - `/api/cron/send-automatic-emails`
  - `/api/cron/send-automatic-emails-leads-nutri-personal`
- ZeptoMail: gate **antes** do lock (`assertCronZeptoConfigured`) — retorna 503 sem credencial, sem lock desnecessário
- Execução concorrente → `{ skipped: true, message: 'Execução anterior ainda em andamento' }`

**Frequência (`vercel.json`):** mantida `*/5` — idempotência via lock + batch limit (`CRON_ZEPTO_MAX_SENDS_PER_RUN`, default 25). Reduz reprocessamento sem alterar cadência configurada.

---

## 4. Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/metaadmin/page.tsx` | Cache, guardas, consolidação useEffects, devLog, pagamentos direcionados |
| `lib/metaadmin/metaadminSessionCache.ts` | **Novo** — cache sessão |
| `lib/devLog.ts` | **Novo** — logs condicionais |
| `lib/email/cronExecutionLock.ts` | **Novo** — lock/idempotência cron |
| `services/pagamentoService.ts` | `getPagamentosPorPacienteIds` |
| `app/api/cron/send-automatic-emails/route.ts` | Gate Zepto antecipado + lock |
| `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts` | Gate Zepto antecipado + lock |

---

## 5. Chamadas duplicadas eliminadas (por sessão típica)

| Fluxo | Antes (estimativa) | Depois |
|-------|-------------------|--------|
| Abertura `/metaadmin` → pacientes | Médico 3×, pacientes 1×, solicitações 1× | Médico 1× (+ portão pode cachear), pacientes 1× |
| Troca pacientes ↔ financeiro | Pacientes 2×, pagamentos 2–3× (124+ full-scan) | 0 reads (cache) |
| Troca pacientes ↔ estatisticas | Pacientes 2×, leads+solicitações duplicadas | Pacientes 0×; leads 1×; solicitações cache |
| Menu mensagens (reentrada) | Fetch completo | Cache |
| NPS modal/notificação | Query batch + N logs + re-loop | 1× `getRespostaPorUserId` + dados de `loadPacientes` |
| Cron SMTP sem credencial | Tentativa + erro a cada 5 min | 503 imediato (sem lock/Firestore pesado) |
| Cron overlap 5 min | 2 execuções paralelas | 2ª skipped |

---

## 6. Impacto esperado em reads

### /metaadmin (médico com ~124 pacientes, 1 sessão, navegação entre 4 menus)

| Operação | Economia qualitativa |
|----------|---------------------|
| `getMedicoByUserId` | −2 reads/sessão (reloads por menu) |
| `getPacientesByMedico` | −2–4 reads/sessão (troca de abas) |
| `getSolicitacoesPorMedico` | −1–3 reads/sessão |
| `pagamentos_pacientes` | De **full collection** (~todos pagamentos) × 2 → **124 doc reads** × 1; cache evita 2ª rodada |
| NPS `getRespostaPorUserId` | −1+ reads (dedup verificação médico) |
| Mensagens admin | −1 read/reentrada menu |

**Ordem de grandeza:** dezenas a centenas de reads a menos por sessão de médico; maior ganho em **pagamentos** (eliminação de full-scan repetido).

### Crons

- Lock: evita dobrar reads Firestore + Auth list em overlap
- Gate Zepto: zero processamento quando SMTP ausente
- Batch limit já existente: continua limitando envios/execução

---

## 7. Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Dados stale na sessão até refresh | Botão "Atualizar" e mutações usam `{ force: true }`; modal pagamento invalida cache |
| Cache não compartilha entre abas | Comportamento esperado (sessão por aba) |
| `loadLeadsMedico` ainda faz fetch próprio de leads | Solicitações reutilizam cache; leads são independentes |
| Calendário: refresh 25s com `force` | Intencional (paciente preenche via link) |
| Lock cron TTL 4 min | Se execução > 4 min, nova rodada pode iniciar — monitorar logs `skipped` |
| ~70 `console.log` restantes em `page.tsx` | Fora dos hot paths; podem ser migrados gradualmente para `devLog` |
| Índice Firestore para `cron_locks` | Coleção pequena, baixo risco |

---

## 8. Checklist ETAPA 04

- [x] Mapear useEffects da /metaadmin
- [x] Identificar dependências que causam reexecução
- [x] Guardas useRef / estado de carregamento
- [x] Consolidar carga inicial (médico, pacientes, solicitações, financeiro, NPS, mensagens)
- [x] Menu/aba não refaz fetch se cache válido
- [x] Cache em memória por sessão
- [x] console.log condicionado (hot paths)
- [x] Auditar crons: frequência documentada, gate SMTP, lock/idempotência
- [x] Relatório ETAPA_04

---

## 9. Próximos passos sugeridos (ETAPA 05+)

1. Migrar `console.log` restantes em `page.tsx` para `devLog`
2. Cache TTL opcional (ex.: 5 min) com invalidação explícita
3. `loadLeadsMedico`: cache próprio de leads
4. Avaliar reduzir cron `*/5` → `*/15` se cadência de e-mail permitir
5. Contadores mensagens não lidas: query agregada server-side (reduz N queries por paciente)

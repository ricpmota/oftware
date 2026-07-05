# ETAPA 04.2 — Remover chamadas inúteis de user-photo e deduplicar lembretes

**Data:** 2026-05-31

---

## Tarefa A — `/api/user-photo`

### Onde era chamado

| Local | Uso |
|-------|-----|
| `app/metaadmin/page.tsx` → `loadPacientes` | `POST /api/user-photo` com todos os `userId` dos pacientes (~124 IDs) |
| **Outras telas** | Nenhuma chamada encontrada no projeto |

### Exibição na `/metaadmin`

- Estado `fotosPacientes` era populado e armazenado no cache de sessão.
- **Nenhum componente lia `fotosPacientes`** (grep confirma: só setState/cache).
- Fotos de paciente **não são exibidas** na UI atual da `/metaadmin`.

### Ação tomada

- **Removida** a chamada `fetch('/api/user-photo')` de `loadPacientes`.
- `fotosPacientes` permanece `{}` no bundle de cache (compatibilidade, zero custo).
- **Rota `/api/user-photo` preservada** para uso futuro ou outras telas.

### IDs inválidos (`email_timestamp`)

Logs Vercel: `tadrio1988@gmail.com_1768852689049` → não é UID Firebase Auth.

**Correções em `app/api/user-photo/route.ts`:**

1. Novo helper `lib/firebase/isValidAuthUid.ts`:
   - Rejeita `@`, sufixo `_<digits>` (padrão `email_timestamp`), tamanho inválido.
2. IDs inválidos → `photos[id] = null` **sem** `auth.getUser()`.
3. Erros de Auth → `null` silencioso (sem `console.error` por usuário).
4. Erro global da rota → log só em `NODE_ENV === 'development'`.

Testes: `lib/firebase/isValidAuthUid.spec.ts`.

---

## Tarefa B — Lembretes duplicados

### Onde `"[Lembretes] Carregados"` era logado

`loadLembretes` em `app/metaadmin/page.tsx` (~linha 6921).

### Causa da repetição (3–4×)

| # | Gatilho |
|---|---------|
| 1 | `useEffect` com `activeMenu === 'calendario'` e deps `user`, `medicoPerfil` (objeto) |
| 2 | Clique no menu Calendário → `refreshCalendarioDados()` → `loadLembretes()` |
| 3 | Re-render / nova referência de `medicoPerfil` reexecutava o effect |
| 4 | Sem cache nem guarda de concorrência |

### Correções

1. **`loadingLembretesRef`** — bloqueia execuções paralelas.
2. **Cache `metaadminSessionCache`** — `getLembretes` / `setLembretes` / `hasLembretes` / `invalidateLembretes` por `medicoId`.
3. **`loadLembretes({ force?: boolean })`** — cache na carga normal; `force: true` em refresh/mutações.
4. **`useEffect` isolado** — deps `[medicoPerfil?.id, activeMenu]` (sem objeto `medicoPerfil` inteiro).
5. **`refreshCalendarioDados`** — `loadLembretes({ force: true })` + `loadPacientes({ force: true })`.
6. Mutações (criar/toggle/deletar lembrete) → `loadLembretes({ force: true })`.
7. **`console.log` → `devLog`** (silencioso em produção).

### Chamadas após correção (Calendário, 1ª visita na sessão)

| Evento | Chamadas Firestore lembretes |
|--------|------------------------------|
| Abrir `/metaadmin` em estatísticas | **0** |
| 1º acesso ao Calendário (menu + effect) | **1** (2º bloqueado por guarda ou cache) |
| Reentrar Calendário na mesma sessão | **0** (cache) |
| Botão Atualizar / mutação | **1** (`force: true`) |

**Antes:** 3–4× log + 3–4× `getLembretesPorMedico`  
**Depois:** 1× por sessão (ou 1× por refresh explícito)

---

## Arquivos alterados

| Arquivo | Alteração |
|---------|-----------|
| `app/metaadmin/page.tsx` | Remove user-photo; cache/guard lembretes |
| `lib/metaadmin/metaadminSessionCache.ts` | Cache lembretes |
| `lib/firebase/isValidAuthUid.ts` | **Novo** — validação UID |
| `lib/firebase/isValidAuthUid.spec.ts` | **Novo** — testes |
| `app/api/user-photo/route.ts` | Validação UID + logs silenciosos |

---

## Impacto esperado

| Métrica | Antes (sessão metaadmin ~124 pacientes) | Depois |
|---------|----------------------------------------|--------|
| Chamadas `/api/user-photo` | 1× por `loadPacientes` (e repetida ao trocar abas) | **0** |
| Firebase Auth `getUser` (server) | ~124× por carga (muitos inválidos) | **0** na metaadmin |
| Logs Vercel erro Auth | Alto ruído | Eliminado na metaadmin; rota filtra IDs inválidos |
| `getLembretesPorMedico` | 3–4× ao abrir calendário | **1×** (+ refresh manual) |
| Latência `loadPacientes` | +1 round-trip HTTP batch fotos | Removido |
| Console produção | Logs lembretes/fotos | Suprimidos (`devLog`) |

---

## Riscos residuais

| Risco | Mitigação |
|-------|-----------|
| Futura UI de avatar na lista de pacientes | Reativar fetch só quando componente usar `fotosPacientes`; passar UIDs válidos |
| `refreshCalendarioDados` + `useEffect` no 1º Calendário | Guarda + cache garantem 1 read; refresh usa `force` |
| Rota user-photo ainda callable externamente | Validação UID reduz Auth errors; sem metaadmin não há volume |

---

## Checklist

- [x] Nenhum layout alterado
- [x] Nenhuma UI redesenhada
- [x] Rota `/api/user-photo` preservada
- [x] Nenhuma funcionalidade visível removida (fotos já não eram exibidas)
- [x] Apenas deduplicação e remoção de chamadas inúteis
- [x] Relatório ETAPA_04_2

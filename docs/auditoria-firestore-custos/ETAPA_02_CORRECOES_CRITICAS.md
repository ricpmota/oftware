# ETAPA 02 - Correções críticas de Firestore (risco mínimo)

## 1) Arquivos modificados

1. `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts`
2. `services/userService.ts`
3. `app/api/cron/send-email-agenda-semanal/route.ts`
4. `app/api/leads-email-status/route.ts`
5. `app/api/indicadores-plataforma/route.ts`
6. `app/metanutri/page.v2.tsx`
7. `services/solicitacaoVinculoNutriMedicoService.ts`

---

## 2) Antes/depois técnico

### `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts`

- **Antes**
  - Full-scan de `email_envios` (`.get()` sem filtro).
  - Full-scan de `nutricionistas` e `personal_trainers` para mapear anexos/docs.
  - Full-scan de `solicitacoes_medico` e `pacientes_completos`.
- **Depois**
  - `email_envios` filtrado por `emailTipo` + janela temporal (`enviadoEm >= dataMinEnvio`).
  - `nutricionistas`/`personal_trainers` carregados **sob demanda por lead** (doc por `leadId`) com cache em memo local da execução.
  - `solicitacoes_medico` filtrado por `pacienteEmail != null`.
  - `pacientes_completos` filtrado por `medicoResponsavelId != null`.

### `services/userService.ts`

- **Antes**
  - `getUserByUid` fazia query por campo (`where('uid' == uid)`) sem `limit`.
  - `getFeriasDoUsuario` fazia full-scan de `ferias` antes da query correta.
  - `getFeriasDoUsuarioAlternativo` e `testarFeriasAprovadas` faziam full-scan de `ferias`.
  - Fluxos de troca (`aprovar/rejeitar/reverter/validar`) liam `escalas` inteira para achar um ID.
- **Depois**
  - `getUserByUid`: tentativa direta por ID (`getDoc(doc(..., uid))`) + fallback com `limit(1)`.
  - `getFeriasDoUsuario`: removido full-scan; fica so query filtrada por `residenteEmail`.
  - `getFeriasDoUsuarioAlternativo`: delega para `getFeriasDoUsuario`.
  - `testarFeriasAprovadas`: query filtrada por `residenteEmail`.
  - Fluxos de troca usam `getDoc(doc(db,'escalas', escalaId))` em vez de `getDocs(collection('escalas'))`.

### `app/api/cron/send-email-agenda-semanal/route.ts`

- **Antes**
  - Full-scan de `pacientes_completos`.
  - Full-scan de `pagamentos_pacientes`.
  - Filtro por médico/status feito em memória.
- **Depois**
  - `pacientes_completos` filtrado por `statusTratamento == 'em_tratamento'`.
  - Organização em `pacientesPorMedico` para evitar varredura repetida.
  - `pagamentos_pacientes` carregado por `doc(pacienteId)` sob demanda, com cache local da execução.

### `app/api/leads-email-status/route.ts`

- **Antes**
  - Full-scan de `pacientes_completos`.
  - Full-scan de `medicos`.
  - Full-scan de `email_envios` (ordenado, mas sem filtro de tipo).
- **Depois**
  - `pacientes_completos` filtrado por `medicoResponsavelId != null`.
  - `medicos` carregados por IDs necessários (docs específicos), sem varrer coleção inteira.
  - `email_envios` filtrado por `emailTipo in ['email1','email2','email3','email4','email5']`.
  - Reuso do app admin já inicializado (`getFirestore(auth.app)`).

### `app/api/indicadores-plataforma/route.ts`

- **Antes**
  - Leitura de documento completo em `pacientes_completos` e `pacientes_abandono`.
- **Depois**
  - Mesmas coleções, porém com `select(...)` apenas dos campos usados no cálculo.
  - Mantido payload e formato da resposta para a UI.

### `app/metanutri/page.v2.tsx`

- **Antes**
  - Full-scan explícito de `solicitacoes_vinculo_nutri_medico` e filtro no cliente.
- **Depois**
  - Consultas filtradas no Firestore por:
    - `nutricionistaId == ...`
    - `status == pendente`
    - `solicitadoPor == medico`
  - Resultado consolidado com deduplicação em memória (sem varrer coleção inteira).

### `services/solicitacaoVinculoNutriMedicoService.ts`

- **Antes**
  - Verificação de duplicidade sem `limit`.
  - Método `listVinculoRequestsByNutri` fazia full-scan de toda coleção para debug.
- **Depois**
  - Verificações de existência com `limit(1)`.
  - Removido full-scan de debug; busca direta por `where('nutricionistaId'...)`.

---

## 3) Full-scans removidos

- `app/metanutri/page.v2.tsx`: removido full-scan de `COL_SOLICITACOES_VINCULO_NUTRI_MEDICO`.
- `services/solicitacaoVinculoNutriMedicoService.ts`: removido full-scan de debug em `listVinculoRequestsByNutri`.
- `services/userService.ts`: removidos full-scans de `ferias` em fluxos de usuário/debug.
- `services/userService.ts`: removidos full-scans de `escalas` em fluxos de troca por ID.
- `app/api/leads-email-status/route.ts`: removidos full-scans de `medicos` e `email_envios` geral.
- `app/api/cron/send-email-agenda-semanal/route.ts`: removido full-scan de `pagamentos_pacientes`.
- `app/api/cron/send-automatic-emails-leads-nutri-personal/route.ts`: removido full-scan de `email_envios` e de coleções completas de perfis (`nutricionistas`, `personal_trainers`).

---

## 4) Filtros que viraram `where()`

- `send-automatic-emails-leads-nutri-personal`:
  - `solicitacoes_medico` -> `where('pacienteEmail','!=',null)`
  - `pacientes_completos` -> `where('medicoResponsavelId','!=',null)`
  - `email_envios` -> `where('emailTipo','==',...)` + `where('enviadoEm','>=',...)`
- `send-email-agenda-semanal`:
  - `pacientes_completos` -> `where('statusTratamento','==','em_tratamento')`
- `leads-email-status`:
  - `pacientes_completos` -> `where('medicoResponsavelId','!=',null)`
  - `email_envios` -> `where('emailTipo','in',[...])`
- `metanutri/page.v2`:
  - `where('nutricionistaId'...)`, `where('status'...)`, `where('solicitadoPor'...)`

---

## 5) Onde `limit(1)` foi aplicado

- `services/solicitacaoVinculoNutriMedicoService.ts`
  - Verificação de solicitação pendente existente.
  - Verificação de vínculo aceito existente.
- `services/userService.ts`
  - Fallback da busca por UID (`where('uid' == uid)`) agora com `limit(1)`.

---

## 6) Leituras duplicadas eliminadas

- `userService`:
  - Fluxos de troca deixaram de carregar `escalas` inteira em pontos múltiplos.
  - Fluxos de férias deixaram de fazer query correta + full-scan redundante de debug.
- `send-email-agenda-semanal`:
  - Pagamentos agora com cache local por `pacienteId` na mesma execução.
- `send-automatic-emails-leads-nutri-personal`:
  - Perfis Nutri/Personal com cache por `leadId` sob demanda.

---

## 7) Índices Firestore necessários

> As queries foram mantidas otimizadas; se faltar índice em produção, **não** voltar para full-scan.

1. `email_envios`
   - `emailTipo ASC, enviadoEm DESC` (ou `ASC`) para:
     - `where('emailTipo','==',...)`
     - `where('enviadoEm','>=',...)`
2. `email_envios`
   - `emailTipo ASC, enviadoEm DESC` para:
     - `where('emailTipo','in',[...])`
     - `orderBy('enviadoEm','desc')`
3. `solicitacoes_vinculo_nutri_medico`
   - `nutricionistaId ASC, status ASC, solicitadoPor ASC`
4. `solicitacoes_vinculo_nutri_medico`
   - `nutricionistaId ASC, medicoId ASC, status ASC` (verificação de existência)

---

## 8) Riscos residuais

- Algumas rotas ainda dependem de leituras amplas por natureza da regra atual (sem mudar arquitetura/modelagem nesta etapa).
- `app/api/indicadores-plataforma/route.ts` ainda percorre os docs necessários para cálculo, mas com menor payload (`select`).
- `services/userService.ts` ainda possui métodos administrativos globais (`getAll*`) que permanecem por compatibilidade de fluxo; a remoção total depende da Etapa 03 (paginação/segmentação).

---

## 9) Ganho esperado qualitativo

- **Reads:** queda relevante nos piores caminhos (metanutri, vínculo, lead-status, rotinas cron de e-mail).
- **Egress:** queda alta em endpoints com `select(...)` e remoção de full-scan de coleções grandes.
- **Cron load:** menor pressão por execução, com menos varreduras completas e mais queries direcionadas.
- **Latência:** melhora em rotas administrativas com menos volume de dados retornados e menos pós-processamento em memória.

---

## Checklist final desta etapa

- [x] Nenhum layout alterado.
- [x] Nenhuma UI redesenhada.
- [x] Nenhuma rota renomeada.
- [x] Nenhuma funcionalidade removida.
- [x] Nenhuma mudança clínica.
- [x] Nenhuma migração de banco.
- [x] Apenas otimização de leitura Firestore.

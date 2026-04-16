# Oftware — /meta (Paciente) — Página Personal — SPEC v1 (MVP)

> Escopo **somente do Paciente** no `/meta`, página/aba **Personal**.  
> Fonte do catálogo: ExerciseDB via RapidAPI **via rotas internas do Oftware** (não expor chave no client).  
> MVP: registrar apenas **feito/pulado + observações** (sem log por série).  
> Regra: **Paciente pode publicar/editar** suas sessões no calendário.

---

## 0) Objetivo do MVP
Entregar uma única página no `/meta` chamada **Personal** onde o paciente:
1) vê o **Treino de Hoje** e marca como **Feito** ou **Pulou** + observações
2) usa o **mesmo calendário existente** (aplicações/pagamentos) com uma camada “Treinos”
3) cria e publica sessões no calendário usando o banco de exercícios (ExerciseDB)
4) consulta histórico e estatísticas simples de aderência

---

## 1) Segurança / arquitetura (obrigatório)
- A RapidAPI key **não pode** ir para o front-end.
- O front do `/meta` deve chamar **apenas** rotas internas do Oftware:
  - `GET /api/exercisedb/targets`
  - `GET /api/exercisedb/equipments`
  - `GET /api/exercisedb/bodyparts`
  - `GET /api/exercisedb/search?name=...`
  - `GET /api/exercisedb/byTarget?target=...&page=...`
  - `GET /api/exercisedb/byEquipment?equipment=...&page=...`
  - `GET /api/exercisedb/byBodyPart?bodyPart=...&page=...`
> Essas rotas podem ser implementadas depois; para a UI, assumir que existem.

---

## 2) UI/UX — Página única com abas internas (tabs)
### Estrutura da página
**Tabs (ordem):**
1. **Hoje**
2. **Cronograma**
3. **Criar Treino**
4. **Histórico**
5. **Estatísticas**
6. **Lembretes** (preferências)

**Componentes globais (topo da página)**
- Título: **Personal**
- Subtítulo/status:
  - “Treino de hoje: {nome ou ‘sem treino’}”
  - “Aderência 7 dias: {x%}” (se disponível)
- CTA rápido:
  - “Criar treino” (leva para tab Criar Treino)

---

## 3) Tab “Hoje” (MVP)
### Estado: existe sessão hoje
- Card “Treino de Hoje”
  - `title`
  - lista de exercícios em cards:
    - imagem/GIF (`gifUrl`) quando existir
    - `name`
    - tags: `target`, `equipment`, `bodyPart`
    - prescrição (se existir): `sets x reps` e `restSec`
- Ações:
  - Botão **Marcar como Feito**
  - Botão **Marcar como Pulou**
- Campo:
  - **Observações do paciente** (textarea)
- Persistência:
  - Atualizar `trainingSessions/{sessionId}`:
    - `status = done | skipped`
    - `patientNotes = <texto>`
    - `updatedAt`

### Estado: não existe sessão hoje
- Empty state:
  - Texto curto: “Você ainda não tem treino para hoje.”
  - Botões:
    - “Criar treino agora” (abre tab Criar Treino)
    - “Abrir cronograma” (abre tab Cronograma)

---

## 4) Tab “Cronograma” — usar calendário existente
### Requisito
- Reutilizar o **mesmo componente/calendário** já usado para aplicações/pagamentos.
- Adicionar uma camada/toggle: **Treinos**.

### Carregamento de eventos de treino
- Fonte: coleção `trainingSessions` filtrada por `patientId` e range de datas visível:
  - `scheduledDate` dentro do intervalo (ex.: mês atual)
- Cada evento de treino deve mostrar:
  - `title`
  - `status` (scheduled/done/skipped) com badge

### Clique em um dia / evento
- Abrir modal/drawer “Sessões do dia”
  - lista de sessões daquele dia
  - botão “Adicionar sessão”
  - editar sessão:
    - título
    - exercícios (ver Tab Criar Treino para UI de seleção)
    - prescrição por exercício (sets/reps/restSec)
  - botão “Salvar/Publicar” (no MVP, publicar é salvar)

---

## 5) Tab “Criar Treino” — construtor do paciente (MVP)
### Objetivo
Paciente monta uma sessão e publica no calendário.

### UI
**A) Filtros e busca**
- Search input (nome do exercício)
- Dropdowns:
  - `target` (ex.: biceps, quadriceps…)
  - `equipment` (ex.: dumbbell, barbell…)
  - `bodyPart` (ex.: legs, chest…)

**B) Lista de resultados**
- Cards com:
  - `gifUrl` (se existir)
  - `name`
  - tags: target/equipment/bodyPart
  - botão **Adicionar**

**C) Montagem da sessão**
- Campos da sessão:
  - `title` (ex.: “Treino A – Superior”)
  - `scheduledDate` (selecionar pelo calendário/modal)
- Lista de exercícios adicionados (ordenados)
- Para cada exercício:
  - `sets` (default 3)
  - `reps` (default 10)
  - `restSec` (default 60)
  - remover exercício

**D) Publicar**
- Botão “Publicar no calendário”
  - cria doc em `trainingSessions` com `status=scheduled`
  - cria subcollection `exercises` com metadados do exercício + prescrição

---

## 6) Tab “Histórico” (MVP)
- Lista agrupada por data (últimos 30–60 dias):
  - data
  - título da sessão
  - status (done/skipped/scheduled)
  - observações do paciente (se houver)
- Ao clicar:
  - abre modal de detalhe (read-only se sessão passada)
  - editar permitido somente para `patientNotes` (sessão done/skipped)

---

## 7) Tab “Estatísticas” (MVP simples)
- Aderência semanal: `done / (done + skipped + scheduled no período)` (definir no código)
- Aderência mensal idem
- Contagem de treinos feitos por semana (últimas 4 semanas)

---

## 8) Tab “Lembretes” (MVP)
- Preferência local do paciente:
  - toggle habilitar
  - horário (HH:mm)
  - dias da semana (seg-dom)
- Persistência:
  - `trainingReminderPrefs/{patientId}`

> Se ainda não existir notificação real, apenas salvar preferências.

---

## 9) Modelo de dados (Firestore)
### 9.1 Sessões no calendário
**Collection:** `trainingSessions/{sessionId}`
- `patientId`
- `createdBy`: `patient`
- `createdById`: uid
- `scheduledDate`: `YYYY-MM-DD`
- `title`
- `status`: `scheduled` | `done` | `skipped`
- `patientNotes`
- `trainerNotes` (pode existir, paciente só lê)
- `published`: boolean (true)
- `updatedAt`
- `createdAt`
- `revision`: number (pode existir, paciente só lê)

### 9.2 Exercícios da sessão
**Subcollection:** `trainingSessions/{sessionId}/exercises/{sessionExerciseId}`
- `source`: `exercisedb`
- `exerciseId`
- `name`, `bodyPart`, `target`, `equipment`, `gifUrl`
- `prescription`: `{ sets, reps, restSec }`
- `order`

### 9.3 Preferências de lembretes
**Collection:** `trainingReminderPrefs/{patientId}`
- `enabled`
- `time`
- `daysOfWeek`
- `channel` (opcional)
- `updatedAt`

---

## 10) Checklist de entrega do /meta (Paciente)
- [ ] Criar página Personal no `/meta` com tabs internas
- [ ] Integrar calendário existente (toggle “Treinos”)
- [ ] CRUD de `trainingSessions` (criar/editar/publicar)
- [ ] Marcar sessão como done/skipped + patientNotes
- [ ] Tela Criar Treino com busca/filtros consumindo `/api/exercisedb/*`
- [ ] Histórico + estatísticas simples
- [ ] Preferências de lembrete salvas no DB


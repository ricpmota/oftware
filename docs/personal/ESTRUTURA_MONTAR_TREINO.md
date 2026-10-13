# Estrutura de montar treino no Metapersonal

Documento de briefing para conversar com outro modelo (ChatGPT, Claude, etc.) sobre como o treino é montado, alterado e exibido no `/metapersonal`, e como a mesma tela aparece no desktop do **metaadmin**, **metanutri** e **metapersonal**.

**Fonte de verdade:** código atual do repositório (não docs de etapa, quando divergirem).  
**Página viva:** `app/meta/personal/page.tsx` (`PersonalPageContent`), embutida nos três hosts.  
**Data do mapeamento:** 2026-08-16.

---

## Como usar este arquivo

Cole este documento no ChatGPT e peça, por exemplo:

- “Explique o fluxo de montar um treino do clique até o Firestore.”
- “Quero redesenhar o modal de salvar treino sem quebrar GIFs.”
- “Quero separar o Criar Treino do arquivo gigante `page.tsx`.”
- “Como o GIF chega na tela e por que às vezes some?”
- “Como a tela Personal aparece no desktop do metaadmin vs metapersonal vs metanutri?”

Não existe um único objeto `planoTreino`. Há **dois sistemas** que convivem:

1. **Sistema operacional (o que o personal usa no dia a dia):** montar sessão na aba **+ Criar**, gravar em `trainingSessions`, o paciente executa.
2. **Motor determinístico (proposta gerada):** avaliação → índice → `WorkoutPlanDraft` → revisão → publicação. Não substitui o Criar.

Nenhum dos três painéis profissionais tem UI própria de treino. Todos embutem `PersonalPageContent` (ou, no metanutri na aba do modal, só um calendário legado).

---

## 1. Onde a tela Personal entra

O componente único é `PersonalPageContent`, exportado de `app/meta/personal/page.tsx`.

O **número da pasta no modal do paciente não é o mesmo** nos três apps:

| Host | Pasta no modal desktop | Nome no menu |
| --- | --- | --- |
| `/metaadmin` | `pastaAtiva === 11` | Personal |
| `/metapersonal` | `pastaAtiva === 9` | Personal Trainer |
| `/metanutri` | `pastaAtiva === 9` | Personal Trainer — **só calendário**, não a tela cheia |

### 1.1 Quem pode o quê

| Host | Props típicas | Mutar treino (criar/editar/apagar) | Marcar feito/pulado |
| --- | --- | --- | --- |
| Metapersonal | `fromMetapersonalEmbedded` | Sim (modo PT) | Não |
| Metaadmin | `fromMetaadminEmbedded` + `professionalReadOnly` + `viewerRole="doctor"` | Não | Não |
| Metanutri (atalho haltere) | igual metaadmin (read-only, `viewerRole="doctor"`) | Não | Não |
| Paciente `/meta/personal` | sem embed | Sim | Sim |

`blockProfessionalMutations = professionalReadOnly \|\| fromMetaadminEmbedded`. Por isso médico e nutri **nunca** gravam sessão por essa tela, mesmo vendo o botão Criar (a UI ainda mostra as abas; o save alerta e bloqueia).

### 1.2 Como o desktop decide o layout interno

Em `PersonalPageContent`:

```
fillParentShell =
  (embedded && !metaadminFullscreen)     // modal do paciente, aba Personal
  || (metaadminFullscreen && suppressAppHeader)  // overlay fullscreen com header do host

useEmbedDesktopNav = fillParentShell
```

Quando `useEmbedDesktopNav` é true **e** viewport `lg` (≥1024px):

- Some a grade 6 colunas (Hoje / Crono / Criar / …).
- Aparece um **menu lateral interno** (`aside` 208–224px, fundo `#071833`) com os mesmos 6 itens em texto: Hoje, Cronograma, + Criar, Histórico, Estatísticas, Configurações.
- A faixa Seg–Dom fica **acima do conteúdo**, não colada nas abas.
- O conteúdo tem `lg:max-w-5xl lg:mx-auto`.
- O shell **preenche o painel do modal** (`h-full min-h-[70dvh]`), não cobre a sidebar do app.

Quando `useEmbedDesktopNav` é false (atalho `view=personal` no metapersonal): o componente vira `fixed inset-0 z-[200]` e cobre o viewport inteiro, inclusive a sidebar do host. Aí as abas voltam a ser a grade de 6, como no mobile.

Breakpoint do menu interno: `hidden lg:flex` no aside; a grade 6 colunas leva `lg:hidden` só nesse modo embed.

### 1.3 Desktop — Metapersonal

Arquivo: `app/metapersonal/page.v2.tsx`.

Há **duas portas**. No desktop elas **não** parecem iguais.

**A) Modal Editar/Ver paciente → pasta 9 Personal Trainer (caminho “oficial” do desktop)**

O modal **não é overlay centralizado**. Comentário no código:

```
Desktop: preenche a área de conteúdo (ao lado da sidebar), sem overlay.
```

- `fixed inset-0` mas em `lg`: `lg:bg-transparent lg:p-0 lg:left-64` (ou `lg:left-16` se a sidebar do app estiver colapsada).
- Painel branco full-height à direita da sidebar do Metapersonal (`lg:border-l`).
- Header: `PacienteModalHeader` (foto, nome, status).
- Esquerda do modal: menu das pastas do paciente (Identificação, Anamnese, …, **Personal Trainer**, Financeiro) — `aside hidden lg:flex w-56`.
- Direita: conteúdo da pasta.

Na pasta 9:

```
<PersonalPageContent
  embedded
  fromMetapersonalEmbedded
  pacienteProp={pacienteVisualizando}
/>
```

O header rosa “Personal Trainer” (`lg:hidden`) **não aparece no desktop**. O `PersonalPageContent` já traz o menu lateral interno.

Esqueleto visual (desktop):

```
┌─────────────┬──────────────────────────────────────────────────────┐
│ Sidebar     │ PacienteModalHeader  (nome do aluno)                 │
│ Metapersonal│──────────────────────────────────────────────────────│
│ Home        │ Pastas     │  Personal Trainer (aside interno) │     │
│ Pacientes   │ Identif.   │  Hoje                             │     │
│ …           │ Anamnese   │  Cronograma                       │ GIF │
│             │ …          │  + Criar          ← ativo         │ /   │
│             │ Personal ← │  Histórico                        │ aba │
│             │ Financeiro │  Stats / Config                   │     │
│             │            ├───────────────────────────────────┤     │
│             │            │  Seg Ter Qua Qui Sex Sáb Dom      │     │
│             │            │  conteúdo da aba (max-w-5xl)      │     │
└─────────────┴────────────┴───────────────────────────────────┴─────┘
```

Mutação: **ligada**. O PT monta treino aqui.

**B) Ícone haltere no card do paciente → `?view=personal&pacienteId=`**

```
router.push(`/metapersonal?view=personal&pacienteId=${patientId}`)
```

Render: `<PersonalPageContent fromMetapersonalEmbedded />` **sem** `embedded`.

Isso ativa `isAppFullscreen` → `fixed inset-0 z-[200]`. No desktop **cobre a sidebar do Metapersonal**. Header do componente vira “Aluno: nome”. Abas em grade 6, não o aside interno. Header mobile e bottom nav do host ficam ocultos.

Use A para discutir “página Personal no desktop do modal”. Use B para o atalho fullscreen.

### 1.4 Desktop — Metaadmin

Arquivo: `app/metaadmin/page.tsx` + `components/metaadmin/paciente-modal/PersonalPacienteSharePanel.tsx`.

**A) Modal Editar Paciente → pasta 11 Personal (caminho desktop)**

Mesmo padrão de painel ao lado da sidebar (`lg:left-64` / `lg:left-16`). Pastas do médico são outras (ids diferentes):

```
1 Identificação · 2 Anamnese · 10 Prontuário · 3 Nutrologia
11 Personal · 4 Exames · 5 Plano Terapêutico · 6 Evolução
7 Bio · 8 Comunicação · 9 Prescrições · 12 Financeiro · 13 Contrato
```

Não confundir: no metaadmin **pasta 9 = Prescrições**, **pasta 11 = Personal**.

A pasta 11 renderiza:

```
<PersonalPacienteSharePanel
  paciente={pacienteEditando}
  medicoId={medicoPerfil.id}
  showCalendar
  onFeedback={setMessage}
/>
```

Defaults do painel no desktop: `embedded` (não fullscreen), `compact=false`.

O painel empilha:

1. **Faixa clara** (fundo cinza, borda): ícone haltere + status do vínculo (nome do PT, Aceito / Aguardando aceite / Buscar personal). O médico vincula/desvincula **aqui**, não dentro do `PersonalPageContent`.
2. **Retângulo com borda** preenchido pela tela escura `#0A1F44` do Personal (GIFs, abas, Criar).

Props do conteúdo:

```
embedded
fromMetaadminEmbedded
professionalReadOnly
professionalViewerRole="doctor"
pacienteProp={paciente}
```

`fillParentShell` true → no desktop, **mesmo aside interno** Hoje/Cronograma/+ Criar. O médico **vê** Criar, mas save/edição/delete são bloqueados.

Esqueleto visual (desktop):

```
┌─────────────┬──────────────────────────────────────────────────────────┐
│ Sidebar     │ PacienteModalHeader                                      │
│ Metaadmin   │──────────────────────────────────────────────────────────│
│ Pacientes   │ Pastas do médico │ Faixa: Personal  João PT  [Aceito]    │
│             │ Identificação    ├───────────────────────────────────────│
│             │ Anamnese         │ aside Personal │ Seg…Dom + conteúdo   │
│             │ Nutrologia       │ Hoje           │ (read-only)          │
│             │ Personal     ←   │ Cronograma     │                      │
│             │ Exames           │ + Criar        │                      │
│             │ …                │ …              │                      │
└─────────────┴──────────────────┴────────────────┴──────────────────────┘
```

Quirk de layout: o container da pasta 11 no metaadmin usa `overflow-y-auto p-6`, **não** `overflow-hidden` (Nutrologia/Prontuário/Exames sim). O Personal pode ganhar scroll duplo no desktop.

**B) Ícone haltere na lista → `showModalPersonal`**

Overlay `fixed inset-0 z-[200]`: `PacienteModalHeader` + faixa de vínculo (tema claro) + `PersonalPageContent` com `metaadminFullscreen` + `suppressAppHeader`. Ainda `fillParentShell`, então **no desktop o aside interno continua**. Cobre o metaadmin inteiro.

Anamnese e prévia do motor: `ProfessionalPersonalToolsBar` **dentro** do Personal (faixa compacta), não na pasta do modal.

### 1.5 Desktop — Metanutri

Arquivo: `app/metanutri/page.v2.tsx`.

**A) Modal do paciente → pasta 9 (desktop)**

O modal é o mesmo padrão ao lado da sidebar (`lg:left-64`). A pasta se chama Personal Trainer, mas **não embute `PersonalPageContent`**.

```
pastaAtiva === 9  →
  título "Treinos com Personal Trainer"
  <CalendarioTreinosPersonal patientId={userId} pacienteId={id} wideRange />
```

É o calendário legado (`components/CalendarioTreinosPersonal.tsx`), fundo claro do modal, sem GIFs, sem aba Criar, sem menu interno do Personal.

**B) Ícone haltere no card → `showModalPersonal` (é aqui que a tela Personal aparece)**

Mesmo overlay fullscreen do metaadmin (`fixed inset-0 z-[200]`), header do paciente, conteúdo:

```
<PersonalPageContent
  embedded={false}
  fromMetaadminEmbedded
  metaadminFullscreen
  suppressAppHeader
  professionalReadOnly
  professionalViewerRole="doctor"
  pacienteProp={...}
/>
```

No desktop: aside interno + tela escura, **somente leitura**. Comentário no código: “igual metaadmin para o médico”. O nutri **não** monta treino.

Resumo metanutri: pasta 9 do modal = calendário; tela completa = só o atalho haltere (overlay).

### 1.6 Tabela rápida desktop

| | Metapersonal | Metaadmin | Metanutri |
| --- | --- | --- | --- |
| Modal do paciente no desktop | Painel à direita da sidebar do app | Igual | Igual |
| Pasta Personal | 9, tela completa, PT edita | 11, tela completa + faixa de vínculo, médico só vê | 9, **só calendário legado** |
| Atalho haltere | `view=personal` fullscreen (cobre sidebar) | overlay fullscreen + vínculo | overlay fullscreen, read-only |
| Menu interno Hoje/Criar no `lg` | Sim (no modal A) | Sim (A e B) | Sim (só B) |
| Fundo da tela de treino | `#0A1F44` | `#0A1F44` (abaixo da faixa cinza) | `#0A1F44` no overlay; calendário da pasta 9 é branco |

### 1.7 Abas do Personal (dentro do componente)

Estado `activeTab`:

| Tab | Papel |
| --- | --- |
| `hoje` | Treino do dia selecionado (faixa Seg–Dom) |
| `cronograma` | Calendário + detalhe da sessão |
| `criar` | **Montar / editar treino** (foco deste doc) |
| `historico` | Sessões já feitas/puladas |
| `estatisticas` | Aderência 7d/30d |
| `config` | Timer + lembretes (paciente) |

Há também a barra profissional `ProfessionalPersonalToolsBar` (anamnese + prévia do motor), que **não compete** com as abas acima.

---

## 2. Modelo de dados operacional

O treino que o paciente vê no calendário **não é um plano**. São sessões.

```
Firestore
  trainingSessions/{sessionId}
    exercises/{exerciseDocId}
  trainingReminderPrefs/{patientId}
```

### 2.1 Sessão — `types/trainingSession.ts`

```ts
TrainingSession {
  id?: string
  patientId: string
  createdBy: 'patient' | 'trainer'   // no código o PT grava 'personal_trainer'
  createdById: string
  scheduledDate: string              // YYYY-MM-DD local (não UTC)
  title: string
  status: 'scheduled' | 'done' | 'skipped'
  patientNotes?: string
  trainerNotes?: string
  published: boolean                 // Criar grava sempre true
  recurrenceGroupId?: string         // liga as cópias de um treino recorrente
  revision?: number
  createdAt, updatedAt
}
```

### 2.2 Exercício da sessão

```ts
TrainingSessionExercise {
  id?: string                        // id do documento Firestore
  source: 'exercisedb'
  exerciseId: string                 // ID da ExerciseDB (ex.: "0025"), NÃO o id Firestore
  name: string                       // nome em inglês da API
  bodyPart: string
  target: string
  equipment: string
  gifUrl?: string                    // URL do nosso proxy, não a RapidAPI direta
  prescription: { sets, reps, restSec }
  order: number
  status?: 'done' | 'skipped'
  completedAt?: Date | string
}
```

CRUD: `services/trainingSessionService.ts`.

- `createSessionWithExercises` — batch: 1 doc de sessão + N docs na subcollection `exercises`.
- `getSessionsForDate` / intervalo — calendário e aba Hoje.
- `getSessionExercises` — lista ordenada.
- `deleteSession` — apaga sessão + exercícios.
- `markExercise` — só paciente.

**Prescrição operacional é só `sets / reps / restSec`.** Não há carga (kg), RPE, laterais, supersérie, drop-set no modelo de sessão.

---

## 3. Fluxo de montar um treino (aba + Criar)

Tudo vive em `PersonalPageContent`. Não há hook `useTraining` nem componente `CriarTreinoModal` extraído. O arquivo tem ~6.600 linhas.

### 3.1 Estado local da montagem

```
searchQuery, selectedBodyPart, selectedTarget, selectedEquipment
criarFiltroPastaAtiva: 'bodyPart' | 'target' | 'equipment'
targets[], equipments[], bodyParts[]          // listas da API
bodyPartCatalogExercises[]                    // catálogo da parte do corpo (para filtrar músculo/equip.)
exercisesResults[]                            // grid de busca (com gifUrl já resolvido)
selectedExercises[]                           // rascunho: Exercise + { sets, reps, restSec }
newSessionTitle, newSessionDate
sessionType: 'single' | 'recurring'
recurrenceFrequency: 'daily' | 'weekly' | 'custom'
weeksCount, timesPerWeek, selectedDaysOfWeek[]
criarTab: 'novo' | 'salvos'
criarTreinoSheetOpen                          // sheet/modal de revisão + salvar
editingSessionIds[], editingRecurrenceGroupId // modo edição
```

Defaults ao adicionar exercício: **3 séries, 10 reps, 60s descanso**.

### 3.2 Layout da aba Criar

Duas sub-abas:

1. **Novo Treino** — formulário + catálogo.
2. **Treinos Salvos** — grupos (único ou recorrente) para editar/excluir.

No **Novo Treino**, de cima para baixo:

1. Título.
2. Tipo: Único | Recorrente.
3. Data (ou data de início se recorrente).
4. Se recorrente: Diário / Semanal / Custom + slider de semanas (1–12) + dias da semana.
5. Seção **Adicionar**:
   - Pastas Corpo / Músculo / Equipamento.
   - Select da pasta ativa (labels em PT via `data/exerciseTranslations.ts`).
   - Busca por nome.
   - Grid 2 colunas de cards (GIF + nome traduzido). Toque adiciona.

O rascunho **não fica na mesma tela**. Fica no **FAB verde** (ícone Save) no canto inferior direito, via `createPortal(..., document.body)`, `z-[220]`.

### 3.3 Como a busca funciona

Ao abrir a aba `criar`:

- `GET /api/exercisedb/targets`
- `GET /api/exercisedb/equipments`
- `GET /api/exercisedb/bodyparts`
- Carrega treinos salvos.

Ao mudar filtro/busca: debounce **500 ms** → `searchExercises()`.

Prioridade da URL (um filtro “ganha” a chamada; os outros refinam no cliente):

1. Se tem texto → `/api/exercisedb/search?name=...&limit=300`
2. Senão se tem bodyPart → `/api/exercisedb/byBodyPart?...`
3. Senão se tem target → `/api/exercisedb/byTarget?...`
4. Senão se tem equipment → `/api/exercisedb/byEquipment?...`
5. Senão fallback legado `/api/exercises?limit=20`

Depois filtra de novo no cliente pelos 3 selects + nome. A API **não devolve `gifUrl`**. A UI injeta:

```
gifUrl = /api/exercisedb/image?exerciseId={id}&resolution=360
```

Há um segundo fetch: ao escolher bodyPart, carrega o catálogo daquela parte (`bodyPartCatalogExercises`) para **esconder músculos/equipamentos impossíveis** nos selects seguintes. Escolher Corpo avança a pasta para Músculo; escolher Músculo avança para Equipamento.

Limite: `EXERCISE_FETCH_LIMIT = 300`.

### 3.4 Adicionar / remover / ajustar (ainda em memória)

- `addExerciseToSession(exercise)` — ignora duplicata pelo `exercise.id` (id ExerciseDB). Resolve GIF. Empilha no array.
- `removeExerciseFromSession(id)` — tira do rascunho.
- `updateExercisePrescription(id, 'sets'|'reps'|'restSec', n)` — só o rascunho. Ainda não grava Firestore.

Não há drag-and-drop de ordem. A ordem é a ordem de clique (`order` = índice no batch).

### 3.5 Recorrência (gera N sessões)

`generateSessionDates(startDate)` devolve `YYYY-MM-DD[]` locais:

- **Único:** só a data.
- **Diário:** todos os dias por `weeksCount` semanas.
- **Semanal:** offsets fixos por `timesPerWeek` (ex.: 3x = dias 0, 2, 4 a partir do início).
- **Custom:** `selectedDaysOfWeek` (0=Dom … 6=Sáb) × `weeksCount`.

Todas as sessões da série compartilham o mesmo `recurrenceGroupId` (`rec_${timestamp}_${rand}`). Cada data é um documento `trainingSessions` **completo**, com cópia própria dos exercícios. Não é um template com expansão lazy.

---

## 4. O modal / sheet de salvar

Não é um `<dialog>` React separado. É um **bottom sheet portaled** para `document.body`.

### 4.1 Quando abre

Estado `criarTreinoSheetOpen`.

- FAB Save (`z-[220]`) abre o sheet.
- Badge vermelho no FAB = quantidade de exercícios no rascunho.
- Overlay `bg-black/50` fecha ao clicar fora.
- `isOverlayModalOpen = criarTreinoSheetOpen || (treino em execução)` trava scroll do `html/body` (`overflow: hidden`, `overscroll-behavior: none`, `touch-action: none`).

### 4.2 O que o sheet mostra

Mobile-first: `max-h-[min(82vh,640px)]`, `rounded-t-2xl`, fundo `#0A1F44`.

Para cada item de `selectedExercises`:

- Thumb GIF 4.5rem (lazy).
- Número de ordem no canto.
- Nome traduzido + músculo alvo.
- Botão lixeira (remove do rascunho).
- Três `PrescriptionStepper`: Séries, Reps, Descanso (step 5s).

Rodapé: botão **Salvar treino** / **Atualizar treino**, desabilitado se faltar título, data ou exercícios (e, no custom, se não houver dia da semana).

### 4.3 Persistência — `handleCreateSession`

1. `patientId` = `paciente.userId` || query || `user.uid`.
2. Bloqueia se `blockProfessionalMutations` (médico read-only).
3. Se está editando (`editingSessionIds.length > 0`), confirma: vai **substituir** N registros.
4. Mapeia exercícios:

```
source: 'exercisedb'
exerciseId: resolveExerciseDbId(ex)   // prioriza exerciseId; senão id numérico curto
name, bodyPart, target, equipment
prescription: { sets, reps, restSec }
gifUrl: /api/exercisedb/image?exerciseId=...&resolution=360
```

5. Para cada data gerada: `trainingSessionService.createSessionWithExercises(...)`.
6. Se edição: **apaga** os `editingSessionIds` antigos depois de criar os novos (não faz update in-place).
7. Limpa o formulário, fecha o sheet, vai para aba **Cronograma**.

`createdBy` no código: `'personal_trainer'` se modo PT / metapersonal, senão `'patient'`. O tipo TypeScript ainda diz `'trainer'` — divergência real.

`published: true` sempre, mesmo no Criar manual. Esse campo não é o `PublishedTrainingPlan` do motor.

---

## 5. Como o treino é alterado depois de salvo

### 5.1 Editar série (Treinos Salvos)

`handleEditSavedSession(session, allSessionsInGroup?)`:

1. Lê exercícios da primeira sessão do grupo.
2. Infere recorrência pelas datas (`inferRecurringConfigFromSessions`).
3. Recoloca título, data de início, tipo, dias, `selectedExercises` (com GIF resolvido de novo).
4. Guarda `editingSessionIds` (todos os docs do grupo) e `editingRecurrenceGroupId`.
5. Volta para sub-aba **Novo Treino**. O personal ajusta e salva de novo → cria novos docs e apaga os antigos.

Não edita um exercício isolado no Firestore pelo sheet. O sheet só mexe no rascunho; o save regrava a série.

### 5.2 Remover um exercício de uma sessão já gravada

`handleDeleteExercise(sessionId, exerciseDocId)` — `deleteDoc` na subcollection. Usado no detalhe do cronograma, não no sheet de montagem.

### 5.3 Cancelar sessão / série

- Uma sessão: `deleteSession`.
- Série recorrente: loop nos ids do grupo.

Evento `oftware:patient-training-calendar-changed` avisa outras UIs.

### 5.4 O que o personal não altera

- Status feito/pulado do exercício (paciente).
- Preferências de lembrete.
- Bioimpedância etc. estão em outras abas do modal do paciente, fora deste fluxo.

Paciente no `/meta/personal` **também** cria/edita/exclui treinos na mesma UI. Não há modo “só executar” para o aluno neste componente.

---

## 6. Como os GIFs aparecem

### 6.1 Princípio

A RapidAPI **não é chamada do browser**. Toda imagem passa pelo proxy Next:

```
GET /api/exercisedb/image?exerciseId={id}&resolution={180|360|720|1080}
```

Arquivo: `app/api/exercisedb/image/route.ts`.

- Env: `RAPIDAPI_KEY`, `RAPIDAPI_HOST` (default `exercisedb.p.rapidapi.com`), `EXERCISEDB_BASE_URL`.
- Upstream: `{base}/image?exerciseId=&resolution=`.
- Se a resolução pedida falhar, tenta as menores, depois as maiores.
- Sucesso: `Content-Type: image/gif`, cache `public, max-age=86400`, header `X-Exercise-Resolution`.
- Sem chave: 503. Sem `exerciseId`: 400. Todas as tentativas falharam: 502 JSON.

Resoluções na UI:

- Cards / execução: **360** (`EXERCISE_GIF_RESOLUTION`).
- Fallback onError na execução: **180** (`EXERCISE_GIF_THUMB_RESOLUTION`).
- Comentário no código: 1080 é ~1.7 MB/GIF e falha mais em rede lenta.

### 6.2 Resolução do ID (crítico)

Helpers no topo de `app/meta/personal/page.tsx`:

- `getExerciseGifUrl(id, resolution)` — monta a URL do proxy.
- `resolveExerciseDbId(ex)`:
  - usa `exerciseId` se existir;
  - senão `id` só se parecer ExerciseDB (numérico curto, ≤8 chars);
  - **não** usa id longo de documento Firestore.
- `resolveExerciseGifUrl(ex)`:
  - se tem id ExerciseDB → sempre proxy;
  - senão reaproveita `gifUrl` **somente** se já for `/api/exercisedb/image?...exerciseId=`;
  - URLs antigas da RapidAPI (se existirem no banco) são **ignoradas**.

Por isso GIF quebrado quase sempre é: `exerciseId` vazio, id Firestore no lugar do id da API, ou RapidAPI/key fora.

### 6.3 Onde o `<img>` é renderizado

Todos usam `<img>` nativo (não `next/image`), `object-cover` ou `object-contain`, `onError` esconde o elemento.

| Superfície | Resolução | Comportamento |
| --- | --- | --- |
| Grid da busca (Criar) | 360 | `exercise.gifUrl` já injetado na busca |
| Sheet de salvar | 360 | `resolveExerciseGifUrl` de novo |
| Cards Hoje / Cronograma / Histórico | gifUrl salvo | lazy; some no erro |
| Modal fullscreen de execução | 360 → fallback 180 | `object-contain` fundo branco, vinheta |
| Card do motor (`WorkoutDraftExerciseCard`) | proxy sem resolution (default 360 no route) | `imageUrl={gifProxyUrl(ex.exerciseId)}` |

### 6.4 Tradução ao lado do GIF

Nomes/grupos/equipamentos da API vêm em inglês. A UI traduz com dicionário estático:

- `data/exerciseTranslations.ts`
- `translateExerciseName`, `translateBodyPart`, `translateTarget`, `translateEquipment`

Instruções longas (execução): `GET /api/exercisedb/exercise?id=` e depois `POST /api/exercisedb/translate-details` (MyMemory EN→PT-BR, cache 24h). Cache em memória no cliente (`runExerciseDetailsCacheRef`).

### 6.5 Imagem de músculos (não é GIF)

Aba Hoje mostra silhueta dos grupos do treino:

- `lib/muscleGroupImage/exerciseDbMuscleMap.ts` mapeia `target`/`bodyPart` → ids da API Muscle Group Image Generator.
- Proxy: `GET /api/muscle-group/image?muscles=chest,triceps&color=4CCB7A&...`
- Env: `X_MUSCLE_GROUP_KEY` / `X_MUSCLE_GROUP_HOST`.

Isso é diagrama estático, não o GIF do exercício.

---

## 7. Catálogo ExerciseDB (APIs)

Pasta `app/api/exercisedb/`:

| Rota | Uso |
| --- | --- |
| `image` | GIF proxy |
| `search` | busca por nome |
| `byBodyPart` / `byTarget` / `byEquipment` | filtros |
| `bodyparts` / `targets` / `equipments` | listas dos selects |
| `exercise` | detalhe (instruções, description) |
| `translate-details` | PT-BR das instruções |

Há um proxy legado `app/api/exercises/*` e `services/exerciseDbService.ts`. O **Criar** chama `/api/exercisedb/*` direto. O motor usa `exerciseDbService` em `loadCatalogForTrainingEngine` (8 bodyParts × 40 itens, cache 10 min no cliente).

Tipo da API: `types/exercise.ts` — `id, name, bodyPart, target, equipment, secondaryMuscles, instructions, description?, difficulty?, category?, gifUrl?`.

---

## 8. Sistema 2 — motor determinístico (proposta, não o Criar)

Usado quando o profissional clica **Gerar prévia do treino** na barra `ProfessionalPersonalToolsBar` → overlay com `WorkoutPlanDraftPreview`.

Flag: `NEXT_PUBLIC_TRAINING_ENGINE_PREVIEW_ENABLED` (default ligado; `'false'`/`'0'` desliga).

### 8.1 Pipeline

```
Avaliação de atividade física (concluída)
  → TrainingPersonalizationIndex
  → normalizeExerciseCatalog
  → evaluateExerciseCompatibility (exclusões duras)
  → scoreExercise (determinístico, sem Math.random)
  → buildWeeklyStructure (dias + slots vazios)
  → selectExerciseForSlot (diversidade de padrão/músculo/equipamento)
  → WorkoutPlanDraft (técnico, NÃO publicado)
  → revisão profissional (substituir exercício)
  → approve (ainda não publica)
  → PublishedTrainingPlan (plano prescrito)
  → (opcional) materializeDraftToTrainingSessions → trainingSessions
```

Módulos: `lib/trainingEngine/*`. Tipos: `types/workoutPlanDraft.ts`.

Draft **não é** sessão. Status: `generated | blocked | unsupported_profile | unsupported_split | insufficient_catalog`.

Cada exercício selecionado tem `sets`, `repetitionRange {min,max}`, `restSeconds`, `targetRpe {min,max}` — mais rico que a sessão operacional.

### 8.2 Modal de substituir exercício (motor)

`components/trainingEngine/WorkoutExerciseReplaceModal.tsx`

- Overlay `z-[80]`, bottom-sheet no mobile, card no desktop.
- Lista candidatos de `listReplacementCandidates` (mesmo slot, mesmo índice, catálogo filtrado/pontuado).
- **Não mostra GIF** — só nome, músculos, equipamento, motivos.
- Aplicar: `replaceWorkoutDraftExercise` (função pura) + persistência via `workoutPlanDraftService`.
- Undo: `undoWorkoutDraftExerciseReplacement` a partir do `baseDraft`.

Card: `WorkoutDraftExerciseCard` — thumb via proxy, séries/reps/RPE, botão Substituir só se `canEdit` (draft não aprovado/descartado e não stale).

### 8.3 Publicação vs calendário

`PublishTrainingPlanModal` publica `PublishedTrainingPlan` (collection própria, versionado, `active | superseded | cancelled | completed`).

Isso **não cria** `trainingSessions` sozinho. A ponte para o calendário do Criar é `lib/trainingEngine/materializeDraftToTrainingSessions.ts`: agrupa focos (`upper_A`+`upper_B` → série “Superior”), gera datas e payloads no **mesmo contrato** da aba Criar (`recurrenceGroupId`, `sets/reps/restSec`).

Execução do plano publicado (outro domínio): `TrainingSessionExecution` — o que o paciente fez, sem mutar o plano prescrito. UI: `components/trainingPlan/TrainingSessionExecutionWorkspace.tsx`, rota `app/meta/personal/treino/[executionId]/page.tsx`.

---

## 9. Execução do treino montado (GIF em tela cheia)

Não é o sheet de montar. É o segundo portal `z-[230]`.

- Paciente toca Iniciar na aba Hoje.
- `isWorkoutRunning`, `activeRunSession`, `activeRunExerciseId`.
- Carrossel: GIF full-bleed `aspect-[5/4]`, setas, contador `i/N`.
- Marca feito → timer de descanso (`restSec` da prescrição, som opcional, prefs no `localStorage` `oftware_personal_timer_prefs`).
- Personal trainer **não** entra nesse fluxo de marcar.

---

## 10. Mapa de arquivos (para o ChatGPT navegar)

### UI hosts + Personal

| Arquivo | Papel |
| --- | --- |
| `app/meta/personal/page.tsx` | **Tudo:** busca, sheet, save, GIFs, execução; aside desktop quando `fillParentShell` |
| `app/metapersonal/page.v2.tsx` | Modal desktop pasta 9 + atalho `view=personal` |
| `app/metaadmin/page.tsx` | Modal desktop pasta **11** → `PersonalPacienteSharePanel`; atalho `showModalPersonal` |
| `app/metanutri/page.v2.tsx` | Modal desktop pasta 9 = `CalendarioTreinosPersonal`; atalho haltere = overlay read-only |
| `components/metaadmin/paciente-modal/PersonalPacienteSharePanel.tsx` | Faixa de vínculo + embed do Personal (metaadmin) |
| `components/avaliacaoAtividadeFisica/ProfessionalPersonalToolsBar.tsx` | Anamnese + overlay do motor |
| `components/trainingEngine/WorkoutPlanDraftPreview.tsx` | Prévia gerada |
| `components/trainingEngine/WorkoutDraftExerciseCard.tsx` | Card do draft + GIF |
| `components/trainingEngine/WorkoutExerciseReplaceModal.tsx` | Substituir no draft |
| `components/trainingPlan/PublishTrainingPlanModal.tsx` | Confirmar publicação |
| `components/trainingPlan/PublishedTrainingPlanView.tsx` | Ver plano publicado |
| `components/trainingPlan/TrainingSessionExecutionWorkspace.tsx` | Execução do plano publicado |
| `components/CalendarioTreinosPersonal.tsx` | Calendário legado; no metanutri é o que a pasta 9 do modal mostra no desktop |

### Tipos / serviços / motor

| Arquivo | Papel |
| --- | --- |
| `types/trainingSession.ts` | Sessão operacional |
| `types/exercise.ts` | Shape ExerciseDB |
| `types/workoutPlanDraft.ts` | Draft do motor |
| `types/reviewedWorkoutPlanDraft.ts` | Draft + revisão |
| `types/publishedTrainingPlan.ts` | Plano prescrito |
| `services/trainingSessionService.ts` | CRUD sessões |
| `services/workoutPlanDraftService.ts` | Gerar / aprovar / descartar draft |
| `services/publishedTrainingPlanService.ts` | Publicar plano |
| `services/exerciseDbService.ts` | Cliente legado `/api/exercises` |
| `lib/trainingEngine/index.ts` | Barrel do motor |
| `lib/trainingEngine/buildDeterministicWorkoutPlan.ts` | Orquestração |
| `lib/trainingEngine/selectExerciseForSlot.ts` | Escolha por slot |
| `lib/trainingEngine/replaceWorkoutDraftExercise.ts` | Troca pura |
| `lib/trainingEngine/materializeDraftToTrainingSessions.ts` | Draft → sessões do Criar |
| `data/exerciseTranslations.ts` | EN→PT nomes/grupos |
| `lib/muscleGroupImage/exerciseDbMuscleMap.ts` | Músculos → silhueta |

### Docs de etapa (mais profundos, se precisar)

Em `docs/metapersonal/`: ETAPA_10 motor, ETAPA_11 preview, ETAPA_12 publicação, ETAPA_13 execução, `AUDITORIA_PLANO_TREINO_META_METAPERSONAL.md`.

---

## 11. Fluxo mental resumido (colar no ChatGPT)

```
Desktop (≥1024px): modal do paciente = painel à direita da sidebar do app (não overlay).

Metapersonal
  pasta 9 → PersonalPageContent (embedded, PT edita, aside interno Hoje/Criar)
  haltere no card → view=personal (fullscreen z-200, cobre a sidebar)

Metaadmin
  pasta 11 → faixa vínculo + PersonalPageContent (read-only, aside interno)
  haltere → overlay fullscreen + mesma faixa de vínculo

Metanutri
  pasta 9 → só CalendarioTreinosPersonal (não é a tela de GIFs)
  haltere → overlay PersonalPageContent read-only (aside interno)

Dentro do PersonalPageContent (quando é a tela completa)
  aba Criar
    filtros → proxy ExerciseDB → grid com GIF 360
    clique → selectedExercises (memória)
    FAB Save → bottom sheet (GIF + séries/reps/descanso)
    Salvar → N docs trainingSessions + subcollection exercises
  aba Hoje / Cronograma → GIF salvo; paciente inicia → modal z-230
  barra profissional → WorkoutPlanDraft (outro domínio)
```

---

## 12. Pegadinhas úteis para discussão de redesign

1. **Um arquivo monolítico.** Qualquer mudança de modal/GIF/busca toca `app/meta/personal/page.tsx`. Extrair Criar+sheet é o refactor mais pedido e mais arriscado (estado compartilhado com Hoje/Cronograma).
2. **Dois conceitos de “plano”.** Sessão operacional vs draft/publicado. Misturar os dois na UI quebra o produto.
3. **Recorrência é cópia, não template.** Editar série = recriar + apagar. Histórico de carga por ocorrência se perde.
4. **GIF depende do ID ExerciseDB.** Nunca persistir id Firestore em `exerciseId`. Nunca apontar `<img>` para RapidAPI direto.
5. **Tradução é dicionário, não API.** Exercício novo na ExerciseDB pode ficar em inglês no card.
6. **Médico read-only, personal e paciente mutam.** Qualquer “só o PT monta treino” hoje é quase só UI.
7. **Prescrição pobre no operacional.** Motor tem RPE e faixa de reps; a sessão gravada achata para um `reps` único.
8. **`createPortal` + z-index.** FAB/sheet `220`, execução `230`, shell Personal `200`. Overlay novo precisa encaixar nessa pilha (o modal do paciente no metapersonal também é alto).
9. **Datas locais `YYYY-MM-DD`.** Não usar `toISOString().slice(0,10)` — fuso quebra o calendário.
10. **ExerciseReplaceModal do motor não mostra GIF.** Se o pedido for “ver o GIF ao trocar exercício”, isso ainda não existe nesse modal.
11. **Pasta 9 não é Personal no metaadmin.** Lá pasta 9 = Prescrições; Personal = 11. No metapersonal/metanutri pasta 9 = Personal Trainer.
12. **Metanutri pasta 9 ≠ tela Personal.** No desktop do modal o nutri vê só `CalendarioTreinosPersonal`. A tela com GIF/Criar só abre pelo haltere (overlay).
13. **Dois “menus laterais” no desktop.** O do app (Home/Pacientes) continua visível no modal embutido. O do Personal (Hoje/Criar) só existe se `fillParentShell` e `lg`. O atalho `view=personal` no metapersonal **esconde** o do app.
14. **Scroll duplo no metaadmin pasta 11.** O conteúdo da pasta não está em `overflow-hidden` (ao contrário de Nutrologia). O painel Personal (`h-full`) pode rolar junto com o `p-6` do modal.

---

## 13. Prompt sugerido para o ChatGPT

> Você é um engenheiro revisando o módulo de treino da Oftware. Li o arquivo `docs/personal/ESTRUTURA_MONTAR_TREINO.md`. Quero discutir [ASSUNTO] sem inventar arquivos. Se precisar de um caminho, use só os listados na seção 10. O treino operacional é `trainingSessions`; o motor é `WorkoutPlanDraft`. Não misture os dois a menos que eu peça a ponte `materializeDraftToTrainingSessions`. No desktop: modal do paciente preenche a área ao lado da sidebar; metaadmin Personal = pasta 11; metanutri pasta 9 é só calendário.

# ETAPA 02 — Experiência de Aprendizagem

## Objetivo

Transformar `/videosmentorados` de uma biblioteca de vídeos em uma plataforma profissional de treinamento da Oftware.

Hierarquia educacional:

```text
Central do Mentorado
  → Trilha
    → Módulo
      → Aula
```

Categorias da ETAPA 01 continuam existindo como **Explorar por tema** (consulta rápida). Não se confundem com trilha ou módulo.

Uma aula pode pertencer à categoria `aplicacao` e, ao mesmo tempo, à **Trilha Essencial → Módulo 4**.

Fora de escopo (não implementado): IA, transcrição, RAG, quizzes, certificados, comentários, favoritos, gamificação, drip/bloqueio ativo, download offline, analytics administrativo.

---

## Compatibilidade com ETAPA 01

### O que foi reaproveitado

- Controle de acesso: médico verificado (`isVerificado === true`) + gestores (`uploadMentor === true` ou e-mails principais).
- Collection `mentorContents`, upload assinado, player `VideoPlayerUrl`, busca local, categorias, modal de aula, rota `/videosmentorados/[slug]`.
- Helpers: `permissions.ts`, `categories.ts`, `slug.ts`, `sort.ts`, `requireMentorAccess.server.ts`, `storage.server.ts`, `mentorContent.server.ts`.
- UI: header, cards de categoria, cards de aula, skeletons, empty state, modal/form/upload.
- Permissão **Upload Mentor** em `/metaadmingeral` (inalterada).

### O que foi adaptado

- Home passou a carregar `GET /api/videosmentorados/home` (uma query consolidada) em vez de listar só conteúdos.
- Página de aula (`MentorContentDetailClient`) passou a aceitar contexto opcional de trilha; a rota antiga `[slug]` continua funcionando.
- Copy da interface: **aulas / módulos / trilhas / treinamentos** no lugar de “conteúdos”.
- `VideoPlayerUrl` ganhou `onPause` para persistir progresso sem reescrever o player.
- Exclusão de aula também remove vínculos em `mentorTrailLessons`.
- Slugs reservados: `trilhas`, `gerenciar`, `admin`, `aulas`.

### O que não foi quebrado

- Vídeos sem `trailId`/`moduleId` continuam visíveis em temas, busca e `/videosmentorados/[slug]`.
- Nenhuma migração destrutiva. Associação às trilhas é feita pelo administrador.
- `/meta`, `/metaadmin`, `/metaadmingeral`, `/metanutri` e `/metapersonal` não foram redesenhados.

### Migrações

Nenhuma. Collections novas são adicionais. Conteúdos antigos seguem válidos sem trilha.

---

## Arquitetura

Decisão de relacionamento (Firestore):

| Collection | Papel |
|---|---|
| `mentorContents` | Aula (ETAPA 01). Não duplicar o vídeo. |
| `mentorTrails` | Trilha. |
| `mentorModules` | Módulo (`trailId`, `order`). |
| `mentorTrailLessons` | Join many-to-many + ordem. Doc id = `{trailId}__{contentId}`. |
| `mentorUserProgress` | Progresso por médico + aula. Doc id = `{userId}__{contentId}`. |

**Por que join `mentorTrailLessons` em vez de `trailIds[]` no conteúdo?**

- Uma aula pode estar em várias trilhas.
- A ordem é por módulo, não global no conteúdo.
- Evita arrays gigantes e atualizações concorrentes no documento da aula.
- A mesma aula não entra duas vezes na **mesma** trilha (id determinístico).

Aula fora de trilha é válida (ex.: Novidades).

Campos futuros no schema, inativos:

- `requiresPreviousCompletion?: boolean` (default `false`) — drip.
- `required?: boolean` (default `false`) — conteúdo obrigatório.
- `MentorContentType` já inclui `protocol | document | article | checklist` (UI de badge pronta; comportamento focado em `video`).

---

## Schemas

```ts
interface MentorTrail {
  id: string;
  title: string;
  slug: string;
  description?: string;
  shortDescription?: string;
  coverUrl?: string;
  coverStoragePath?: string;
  status: 'draft' | 'published' | 'archived';
  order?: number;
  featured?: boolean;
  estimatedDurationMinutes?: number;
  requiresPreviousCompletion?: boolean; // default false
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: AuditUser;
  updatedBy?: AuditUser;
}

interface MentorModule {
  id: string;
  trailId: string;
  title: string;
  description?: string;
  order: number;
  status: 'draft' | 'published' | 'archived';
  requiresPreviousCompletion?: boolean;
  required?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface MentorTrailLesson {
  id: string; // `${trailId}__${contentId}`
  trailId: string;
  moduleId: string;
  contentId: string;
  order: number;
  createdAt: Timestamp;
}

interface MentorUserProgress {
  id: string; // `${userId}__${contentId}`
  userId: string;
  contentId: string;
  trailId?: string;
  moduleId?: string;
  status: 'not_started' | 'in_progress' | 'completed';
  watchedSeconds: number;
  lastPositionSeconds: number;
  watchedPercentage: number; // derivado de watchedSeconds / duration
  firstStartedAt?: Timestamp;
  lastWatchedAt?: Timestamp;
  completedAt?: Timestamp;
  updatedAt: Timestamp;
}
```

`MentorContent` da ETAPA 01 **não** passou a exigir trilha. Não persistimos `trailIds[]` no conteúdo.

---

## Rotas

| Rota | Função |
|---|---|
| `/videosmentorados` | Home da Central (jornada, trilhas, temas, novas aulas) |
| `/videosmentorados/[slug]` | Aula avulsa (compatibilidade ETAPA 01) |
| `/videosmentorados/trilhas/[slug]` | Página da trilha |
| `/videosmentorados/trilhas/[slug]/aulas/[lessonSlug]` | Aula **com** contexto de trilha |
| `/videosmentorados/gerenciar` | Administração de trilhas (Upload Mentor) |

Segmentos estáticos (`trilhas`, `gerenciar`) vencem `[slug]`.

A página de aula é **uma só**: `MentorContentDetailClient`. A rota só injeta `trailSlug`.

Links de busca/tema: se a aula tem placement, abre na URL contextual; senão, na rota avulsa.

---

## Progresso

### Onde salva

Collection `mentorUserProgress`, documento `{uid}__{contentId}`, via Admin SDK.

`POST /api/videosmentorados/progress` usa **sempre** `access.uid`. O cliente não escolhe o usuário.

Não é fonte de verdade: `localStorage`.

### Quando salva

- A cada ~12 segundos de reprodução (`PROGRESS_SAVE_INTERVAL_MS`).
- Ao pausar.
- Ao esconder a aba / `pagehide`.
- Ao desmontar a página.
- Ao marcar concluída / não concluída.
- Auto-conclusão em ≥ 90% de `watchedSeconds / duration`.

Não grava a cada segundo. Há fila simples para não perder flush enquanto outro write está em voo. O servidor faz `max(watchedSeconds existente, incoming)` para evitar regressão em corrida.

Falha de persistência **não** pausa o player nem abre modal.

### Como calcula

- `lastPositionSeconds`: posição atual do player.
- `watchedSeconds`: soma de deltas contínuos (`0,25s < delta ≤ 20s`). Seek grande **não** infla o tempo assistido.
- `watchedPercentage`: `watchedSeconds / durationSeconds`, independente da posição.

Limitação consciente: não há mapa de intervalos assistidos (A-B-C). É uma aproximação segura para a ETAPA 02. Quem pular o vídeo e voltar não “ganha” percentual; quem assistir de forma contínua acumula até 90% e conclui.

### Como retoma

`resumeAtSeconds = max(0, lastPositionSeconds - 5)`.

O card “Continue estudando” mostra o horário original (`Você parou em 04:21`). O player posiciona ~5s antes para contexto. O overlay nativo de `VideoPlayerUrl` usa o `startTime` já recuado.

Prioridade do card:

1. `status === in_progress` com `lastWatchedAt` mais recente, preferindo aula de trilha publicada.
2. Caso contrário, aula avulsa em andamento.

Se não há aula em andamento, o card some. “Sua jornada” / “Comece sua jornada” usa a primeira aula ainda não concluída da trilha featured (ou `trilha-essencial`).

### Como conclui

- Automático: `watchedPercentage >= 90`.
- Manual: **✓ Marcar como concluída** (prepara artigos/protocolos futuros).
- Desmarcar: ação discreta no menu (`Marcar como não concluída`).

Feedback: `✓ Aula concluída` — sem confete.

Progresso de módulo/trilha: `aulas concluídas / aulas publicadas visíveis`. Rascunhos, arquivados e invisíveis não entram. Médicos comuns não veem draft.

---

## Trilhas — como o administrador opera

1. **Gerenciar trilhas** (header, só gestores) → `/videosmentorados/gerenciar`.
2. **Criar trilha** — default rascunho. Título “Trilha Essencial do Mentorado” gera slug `trilha-essencial` e descrição oficial.
3. **Criar módulos** (ordem com ↑ ↓).
4. **+ Adicionar aula** — modal pesquisável nas aulas existentes. Não duplica o vídeo; cria `mentorTrailLessons`.
5. **Remover aula da trilha** — apaga o vínculo, não o `mentorContents`.
6. **Publicar / despublicar / arquivar**.
7. Médicos comuns só veem `published`. Gestores veem rascunho com badge **RASCUNHO**.

A primeira trilha criada pode ser marcada `featured` para o bloco “Sua jornada”.

---

## Home

Ordem:

1. Continue estudando **ou** Comece sua jornada  
2. Sua jornada (se já começou)  
3. Trilhas  
4. Explorar por tema  
5. Novas aulas  

Saudação: `Olá, {primeiroNome}` ou `Bem-vindo à Central do Mentorado`.

Busca: placeholder `Buscar aulas, treinamentos e temas...`. Resultados locais incluem título, categoria, trilha e módulo quando houver placement.

---

## Página da aula

Desktop: player 16:9 à esquerda (~70–75%), sidebar à direita (~300–320px) com acordeão de módulos.

Mobile: player em largura total; **Conteúdo da trilha** abre drawer/bottom sheet. Sem sidebar apertada.

Navegação anterior/próxima respeita ordem da aula → módulo → próximo módulo. Sem autoplay da próxima.

Após última aula do módulo: `✓ Módulo concluído`. Após a última da trilha: `✓ Trilha concluída`. Certificado **não** é emitido.

Abaixo do player há espaço livre para a ETAPA 03 (objetivo, resumo, POPs, etc.).

---

## Services

| Service | Funções |
|---|---|
| `mentorTrailService` | `getMentorHome`, `listMentorTrails`, `getMentorTrailBySlug`, CRUD trilha/módulo, add/remove aula, reorder |
| `mentorProgressService` | `saveMentorLessonProgress` |
| `mentorContentService` | ETAPA 01 + `getMentorContentBySlug(slug, trailSlug?)` |

Servidor:

- `curriculum.server.ts` — collections e CRUD
- `progress.server.ts` — upsert
- `assembleCurriculum.server.ts` — home, detalhe da trilha, contexto da aula (join em memória)

A home **não** faz 1 query por card. Carrega conteúdos + trilhas + módulos + joins + progresso do usuário em lote e monta DTOs no servidor.

---

## Componentes novos (além da ETAPA 01)

- `MentorProgressBar`
- `MentorContentTypeBadge`
- `MentorContinueCard`
- `MentorJourneyCard`
- `MentorTrailCard` / `MentorTrailGrid`
- `MentorLessonItem` / `MentorModuleAccordion`
- `MentorLessonSidebar` / `MentorTrailDrawer`
- `MentorLessonNavigation`
- `MentorTrailPageClient`
- `MentorTrailManager` (picker de aulas incluso)

Não foi adicionada dependência pesada de drag-and-drop. Ordenação usa ↑ ↓ (`@dnd-kit` já existe no projeto, mas a UI administrativa priorizou robustez).

---

## Segurança

Acesso para consumir: igual ETAPA 01.

Gestão de trilha/módulo/ordem: `requireMentorManager` (server-side). A UI esconde botões, mas a API valida.

Progresso: somente o `uid` autenticado. Não há endpoint para editar progresso de outro médico.

Firestore client SDK:

```
mentorContents, mentorTrails, mentorModules, mentorTrailLessons, mentorUserProgress
→ allow read, write: if false
```

Tudo passa pelo Admin SDK nas APIs. Sem isso, o catch-all autenticado do projeto permitiria escrita client-side nas collections novas.

Reorder valida se módulo/aula pertencem à trilha informada.

---

## Índices Firestore

Consultas desta etapa são:

- `mentorTrails.slug ==`
- `mentorModules.trailId ==`
- `mentorTrailLessons.trailId ==` / `moduleId ==` / `contentId ==`
- `mentorUserProgress.userId ==`
- get por id determinístico de progresso e de join

São igualdade em um único campo (índice automático). **Nenhum índice composto foi necessário.**

A montagem da home/trilha lista as collections de currículo (volume ainda pequeno) e filtra/ordena em memória. Se o catálogo crescer muito, a próxima etapa pode passar a `where('trailId','==')` por trilha em vez de listar tudo.

`firestore.indexes.json` não precisa de entrada nova agora.

---

## Performance

- Home: `Promise.all` de conteúdos + progresso; em seguida trilhas/módulos/joins.
- Writes de progresso: ~12s + eventos, com merge `max(watchedSeconds)`.
- URLs assinadas de capa de trilha ainda são resolvidas por trilha (capa é opcional e rara nesta etapa).
- Cache HTTP: `next.config` já aplica `no-store` em `/videosmentorados/:path*`.

---

## Analytics (preparação)

Timestamps em progresso já permitem, no futuro: aulas mais assistidas, taxa de conclusão, última atividade, trilhas concluídas.

Não foi criada infraestrutura nova de eventos (`mentor_trail_started`, etc.), porque o projeto não tem um coletor consolidado exclusivo da Central.

---

## Limitações / débitos para próximas etapas

- Sem mapa de intervalos realmente assistidos (apenas delta contínuo).
- Sem upload de capa da trilha na UI (campo `coverStoragePath` existe).
- Sem seed automático da Trilha Essencial — o admin cria (título padrão já vem preenchido).
- Ordenação admin por setas, não drag-and-drop.
- Overlay nativo do player mostra o tempo recuado (~5s), não o `lastPosition` original.
- Drip/bloqueio, certificado, quizzes, favoritos, comentários, offline: não ativados.
- `1h12 restantes` está calculado no DTO (`remainingSeconds`) mas não é o texto principal do card.
- Sem dashboard de analytics.

Preparação ETAPA 03: a página da aula não é um layout rígido; há bloco abaixo do player para objetivo, resumo, materiais, versão e revisão.

---

## Teste manual

Ver checklist na entrega da implementação (médico novo, em andamento, concluído, admin, desktop, mobile, multidispositivo).

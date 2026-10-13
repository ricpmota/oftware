# ETAPA 01 — Central do Mentorado

## Objetivo

Criar a base estrutural e funcional da **Central do Mentorado**, acessível em `/videosmentorados`.

Nesta etapa:

- médicos verificados consomem treinamentos em vídeo;
- médicos com `uploadMentor === true` (ou administradores principais) gerenciam conteúdos;
- a permissão é controlada em `/metaadmingeral`;
- o modelo de dados já admite evoluções (trilhas, progresso, documentos, IA).

## Arquivos criados

### Tipos e permissões

- `types/mentorContent.ts`
- `lib/mentorados/permissions.ts`
- `lib/mentorados/permissions.spec.ts`
- `lib/mentorados/categories.ts`
- `lib/mentorados/slug.ts`
- `lib/mentorados/slug.spec.ts`
- `lib/mentorados/sort.ts`
- `lib/mentorados/sort.spec.ts`

### Servidor

- `lib/mentorados/requireMentorAccess.server.ts`
- `lib/mentorados/storage.server.ts`
- `lib/mentorados/mentorContent.server.ts`

### APIs

- `app/api/videosmentorados/session/route.ts`
- `app/api/videosmentorados/contents/route.ts`
- `app/api/videosmentorados/contents/[id]/route.ts`
- `app/api/videosmentorados/upload-url/route.ts`
- `app/api/metaadmingeral/medicos/upload-mentor/route.ts`

### UI

- `app/videosmentorados/layout.tsx`
- `app/videosmentorados/page.tsx`
- `app/videosmentorados/[slug]/page.tsx`
- `components/mentorados/MentoradosHeader.tsx`
- `components/mentorados/MentorSearch.tsx`
- `components/mentorados/MentorCategoryCard.tsx`
- `components/mentorados/MentorCategoryGrid.tsx`
- `components/mentorados/MentorContentCard.tsx`
- `components/mentorados/MentorContentGrid.tsx`
- `components/mentorados/MentorContentPlayer.tsx`
- `components/mentorados/MentorContentModal.tsx`
- `components/mentorados/MentorContentForm.tsx`
- `components/mentorados/MentorUploadField.tsx`
- `components/mentorados/MentorStatusBadge.tsx`
- `components/mentorados/MentorEmptyState.tsx`
- `components/mentorados/MentorSkeletons.tsx`
- `components/mentorados/MentorConfirmDialog.tsx`
- `components/mentorados/MentoradosAccessGate.tsx`
- `components/mentorados/MentoradosPageClient.tsx`
- `components/mentorados/MentorContentDetailClient.tsx`
- `services/mentorContentService.ts`

## Arquivos modificados

- `types/medico.ts` — campo `uploadMentor?: boolean`
- `services/medicoService.ts` — `uploadMentor` não pode ser gravado pelo cadastro comum do médico
- `app/metaadmingeral/page.tsx` — coluna **Upload Mentor** + toggle
- `firestore.rules` — `mentorContents` bloqueado no client SDK
- `next.config.ts` — `Cache-Control: no-store` em `/videosmentorados`

## Estrutura do Firestore

Collection: `mentorContents`

```ts
{
  id: string;
  type: "video"; // futuro: document | protocol | checklist | article
  title: string;
  slug: string;
  description?: string;
  category: "medicacao" | "aplicacao" | "envio_medicacao" | "atendimento" | "sistema" | "novidades" | "configuracoes";
  tags?: string[];
  videoUrl: string;           // persistido vazio; a API devolve URL assinada
  videoStoragePath?: string;
  thumbnailUrl?: string;      // persistido vazio; a API devolve URL assinada
  thumbnailStoragePath?: string;
  durationSeconds?: number;
  order?: number;
  status: "draft" | "published" | "archived";
  featured?: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: { uid, name?, email? };
  updatedBy?: { uid, name?, email? };
  version?: number;           // inicia em 1
  lastReviewedAt?: Timestamp;
}
```

Regras: `allow read, write: if false` — todo acesso passa pelas APIs com Admin SDK.

## Estrutura do Storage

Bucket Firebase Storage já usado pela Oftware.

```text
mentorados/videos/{contentId}/{timestamp}_{filename}.mp4
mentorados/thumbnails/{contentId}/{timestamp}_{filename}.jpg
```

Arquivos **não** são públicos. A API gera URLs assinadas (v4, leitura, ~2h) somente depois de validar médico verificado.

Escrita: URL assinada (PUT) emitida só para `canManageMentorContent`.

## Campo `uploadMentor`

No documento `medicos/{id}`:

```ts
uploadMentor?: boolean  // default efetivo: false
```

Ausência do campo **não** é tratada como `true`.

Persistência exclusiva via:

```text
POST /api/metaadmingeral/medicos/upload-mentor
{ medicoId, ativo: boolean }
```

`MedicoService.createOrUpdateMedico` ignora `uploadMentor`, impedindo auto-concessão pelo perfil do médico.

## Regras de acesso

```text
Acesso (consumir):
  autenticado
  + médico verificado (mesmo isVerificado do selo)
  OU e-mail de administrador principal

Gestão (criar/editar/excluir/upload):
  uploadMentor === true
  OU e-mail de administrador principal
```

Administradores principais:

- `ricpmota.med@gmail.com`
- `pedrok.carneiro1@gmail.com`

Helpers:

```ts
canAccessMentorCenter(user)
canManageMentorContent(user)
```

em `lib/mentorados/permissions.ts`.

## Fluxo de upload

1. Médico autorizado abre **+ Novo conteúdo**.
2. `POST /api/videosmentorados/upload-url` valida permissão e MIME, gera `contentId` + URL assinada de escrita.
3. O browser faz PUT direto no Storage (progresso real via XHR).
4. `POST /api/videosmentorados/contents` cria o documento com `videoStoragePath` (e thumbnail, se houver).
5. O caminho de storage é validado para pertencer a `mentorados/{videos|thumbnails}/{contentId}/`.

## Fluxo de edição

1. Menu `•••` na página `/videosmentorados/[slug]` (somente gestores).
2. Modal reutiliza o formulário.
3. `PATCH /api/videosmentorados/contents/[id]` atualiza campos, `updatedBy` e `updatedAt`.
4. Troca de título regenera slug único.
5. Troca de arquivo remove o objeto antigo no Storage.

## Fluxo de exclusão

1. Confirmação: `Excluir conteúdo?`
2. `DELETE /api/videosmentorados/contents/[id]`
3. Remove documento + vídeo + thumbnail.

## Segurança

- Autorização conferida no servidor (Bearer token Firebase).
- Médico não verificado recebe 403 **sem** URLs de vídeo.
- Rascunhos e arquivados não são devolvidos para mentorados comuns.
- Storage rules do projeto já bloqueiam escrita client-side (exceto banners).
- `uploadMentor` não é gravável pela Central do Mentorado.

## Decisões técnicas

- Conceito genérico `MentorContent` (`type: "video"` agora).
- Player reutiliza `VideoPlayerUrl` (HTML5, sem autoplay).
- Busca da Etapa 01 é client-side (título, descrição, tags).
- Badge **NOVO** calculado (`createdAt` ≤ 15 dias), não persistido.
- Ordenação por categoria: `featured` → `order` crescente → `createdAt` decrescente.
- Categoria futura “Protocolos e Documentos” não entra na UI desta etapa.

## Limitações atuais

- Sem trilhas, progresso, favoritos, documentos, transcrição, capítulos, busca semântica, RAG ou analytics.
- Upload via URL assinada exige CORS do bucket permitindo PUT a partir do domínio da Oftware. Se o PUT falhar no browser, configurar CORS no bucket Firebase Storage.
- Limite de vídeo: 512 MB. Thumbnail: 6 MB.
- Sem aba administrativa de arquivados; gestores podem reabrir pelo slug e alterar status.

## Preparação para próximas etapas

O documento já tem `type`, `tags`, `version`, `lastReviewedAt`, `featured`, `order` e `createdBy`/`updatedBy`.

A busca está isolada em `MentorSearch` para receber busca avançada/IA depois.

A collection é genérica (`mentorContents`), não `mentorVideos`.

Rotas e helpers de permissão estão centralizados para trilhas, progresso e favoritos nas etapas 02–10.

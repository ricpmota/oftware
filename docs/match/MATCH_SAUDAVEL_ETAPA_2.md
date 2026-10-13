# Match Saudável — Etapa 2

Identidade social, interesses, intenções e privacidade.

Esta etapa não implementa Discovery, swipe, like, match, chat, grupos, eventos, ranking ou algoritmo.

## 1. Objetivo

Criar a identidade social de quem entra no Match Saudável: quem a pessoa é para as outras, o que gosta, o que quer viver com alguém, que conexões fazem sentido, quando tem tempo e o que aceita mostrar.

O produto continua sendo conexão por interesses, atividades e momento de vida. Relacionamento é uma opção entre outras, com o mesmo peso visual.

## 2. Auditoria antes da implementação

### Autenticação do `/meta`

`app/meta/page.tsx` escuta `onAuthStateChanged` do Firebase Auth (`lib/firebase.ts`). Sem usuário, redireciona para `/`. As rotas irmãs (`/meta/match`) não passam por esse efeito: a landing continua visível sem sessão. Onboarding, perfil e edição exigem sessão e, sem ela, voltam para `/`.

### UID usado pelo Match

O documento é `match_profiles/{auth.uid}`.

O UID é o do Firebase Auth (`request.auth.uid` / `auth.currentUser.uid`), validado por `isValidFirebaseAuthUid` em `lib/firebase/isValidAuthUid.ts`. Nome, telefone e e-mail não são ID.

### Como o paciente é identificado

`pacientes_completos` é outro documento. O ID do prontuário é `paciente.id`. O campo `userId` guarda o UID de autenticação, preenchido em `loadPaciente` quando o valor antigo não é um UID válido. A busca usa e-mail (`getPacienteByEmail`) e, em outros fluxos, `userId`.

O Match não usa esse ID como chave. Não há referência obrigatória ao prontuário. Uma pessoa sem `pacientes_completos` pode ter perfil no futuro, desde que tenha Firebase Auth.

O primeiro nome sugerido vem só de `auth.currentUser.displayName` (primeiro token). Cidade e data de nascimento não são copiadas do prontuário: o endereço clínico é residencial, e a data de nascimento do cadastro não deve entrar sozinha no perfil social.

### Onde ficam as rules

- `firestore.rules`
- `storage.rules`

Elas só passam a valer depois do deploy. O arquivo no repositório não altera o projeto Firebase sozinho.

### Uploads existentes

O Storage do cliente está fechado, exceto `banners/`. Fotos clínicas e de evolução sobem por API com Admin SDK (`app/api/meta/progress-photos`, `exercise-gym-media` e similares) e não usam `uploadBytes` no app do paciente.

As fotos do Match não reutilizam esses caminhos. O cliente envia direto para `match-profiles/{uid}/photos/{id}.jpg|png|webp`, com regra própria de dono. O Admin SDK não é necessário aqui porque a pasta social deixa de cair no bloqueio geral.

### Timestamps

O padrão do projeto é `serverTimestamp()` do Firestore (`createdAt` / `updatedAt`). O perfil social segue isso no documento. Itens de jornada guardam `createdAt` em ISO no próprio item, porque são escolhas manuais gravadas junto com o rascunho, não um segundo write.

## 3. Arquitetura social

Coleção nova, separada da camada clínica:

`match_profiles/{uid}`

Não há campos sociais em `pacientes_completos`. O serviço só grava o documento do UID autenticado (`services/matchProfileService.ts`). Não existe método para escrever o perfil de outra pessoa.

## 4. Schema final

```ts
match_profiles/{uid} {
  version: 1,
  status: "draft" | "active" | "paused",
  onboardingCompleted: boolean,
  onboardingStep: number, // 0–12, para retomar o rascunho

  identity: {
    displayName: string,      // até 40
    birthDate?: "YYYY-MM-DD", // só se a pessoa informar
    ageVisibility: "show" | "hide", // espelha sharing.showAge
    city?: string,
    state?: string,
    bio?: string              // até 160
  },

  photos: [{
    id, url, storagePath, order, isPrimary
  }], // no máximo 6

  interests: string[],          // ids da taxonomia
  activities: string[],         // intenções, separadas dos interesses
  connectionGoals: string[],

  availability: {
    days: string[],
    periods: string[],
    planningStyle?: "planned" | "spontaneous" | "either"
  },

  lifestyle: {
    activityLevel?: "starting" | "moving" | "active"
  },

  discoveryPreferences: {
    locationMode?: "my_city" | "nearby" | "anywhere",
    radiusKm?: 5 | 10 | 25 | 50 | 100,
    ageMin?: number,
    ageMax?: number,
    showMe: string[],           // men | women | all — escolha explícita
    connectionGoals: string[],
    preferSharedActivities: boolean
  },

  sharing: {
    showAge: boolean,           // padrão ON
    showCity: boolean,          // padrão ON
    showDistance: boolean,      // padrão OFF
    showInterests: boolean,     // padrão ON
    showAvailability: boolean,  // padrão ON
    showJourney: boolean        // padrão OFF
  },

  journeyHighlights: [{
    id, type, label, visibility: "public", createdAt
  }],

  createdAt, // server timestamp na criação
  updatedAt  // server timestamp em cada gravação
}
```

Adaptações em relação ao esboço inicial:

- `onboardingStep` existe para o rascunho retomar a etapa.
- `planningStyle` ficou em `availability` (planejadas, espontâneas, tanto faz).
- `activityLevel` ficou em `lifestyle`. Não há IMC, peso ou exame.
- `locationMode` e o raio ficaram em `discoveryPreferences`. Não há GPS nem endereço.
- `sharing` ganhou `showInterests` e `showAvailability`, porque a etapa de privacidade pede esses controles.
- `preferredEnvironments` e `socialStyle` não foram criados vazios. O modo de lugar e o estilo de planejamento cobrem o que esta etapa pergunta.

`sanitizeMatchProfile` regrava só a lista branca. Diagnóstico, medicamento, prontuário, exame e qualquer outro campo extra são descartados antes do `setDoc`.

## 5. Separação social × clínico

O Match não lê subcoleções clínicas, não copia anamnese, prescrição, bioimpedância, laudo, documento ou foto de evolução. A data de nascimento do perfil, se existir, foi digitada na identidade social.

Fotos aceitas precisam ter `storagePath` em `match-profiles/{uid}/photos/`. Caminho de paciente, evolução ou documento é ignorado.

## 6. Dados públicos

Sempre candidatos a aparecer para outra pessoa, nesta etapa só na prévia e em Meu perfil (ainda não há leitura cruzada):

- `displayName`
- `bio`
- `photos`
- `activities`
- `connectionGoals`

## 7. Dados controlados pelo usuário

Aparecem na visão pública só com o interruptor ligado:

| Dado | Campo | Padrão |
| --- | --- | --- |
| Idade | `sharing.showAge` | ON |
| Cidade | `sharing.showCity` | ON |
| Distância | `sharing.showDistance` | OFF |
| Interesses | `sharing.showInterests` | ON |
| Disponibilidade | `sharing.showAvailability` | ON |
| Jornada | `sharing.showJourney` | OFF |

Distância não é desenhada no card desta etapa: não há coordenada. O interruptor fica gravado para o Discovery futuro.

Preferências de Discovery (`showMe`, faixa etária, raio, conexões desejadas) não entram no card. São o que a pessoa procura, não o que ela mostra.

## 8. Dados sempre privados no Match

Não há campo e não há interruptor para:

diagnóstico, medicamentos, exames, prontuário, anamnese, bioimpedância completa, documentos, prescrição e qualquer dado clínico que não tenha sido transformado, de propósito, num highlight social.

Nesta etapa nenhum highlight é gerado a partir do prontuário.

## 9. Taxonomy

`lib/match/matchTaxonomy.ts`

IDs estáveis, rótulos só na interface:

- `MATCH_INTERESTS` — movimento, ao ar livre, experiências, estilo de vida. `hiking` (Trilhas) aparece nas duas primeiras categorias com o mesmo id.
- `MATCH_ACTIVITIES` — o que a pessoa quer viver com alguém (`train`, `cycle`, `grab_coffee`, …).
- `MATCH_CONNECTION_GOALS` — Atividades primeiro, Relacionamento por último.
- `MATCH_DAYS`, `MATCH_PERIODS`, `MATCH_PLANNING_STYLES`
- `MATCH_ACTIVITY_LEVELS`
- `MATCH_LOCATION_MODES`, `MATCH_RADIUS_OPTIONS`
- `MATCH_SHOW_ME`
- `MATCH_JOURNEY_PRESETS`

Ids desconhecidos são descartados na gravação.

## 10. Onboarding

Rota: `/meta/match/onboarding`

13 etapas, uma pergunta principal por tela, fundo branco, texto `#0A1F44`, seleção em verde suave `#E8F8EE`, CTA no degradê já usado na landing.

1. Vamos criar seu perfil.
2. Como você quer aparecer? Nome público, data opcional, bio com contador 160.
3. Mostre quem você é. Até 6 fotos.
4. O que faz parte da sua vida? Categorias em abas, seleção múltipla.
5. O que você gostaria de compartilhar com alguém?
6. Que tipo de conexão faz sentido para você?
7. Quando você costuma ter tempo? Dias, períodos e planejadas / espontâneas / tanto faz.
8. Qual combina mais com seu momento?
9. Onde você quer criar conexões? Cidade, perto (com raio) ou qualquer lugar.
10. Sua jornada é sua. Interruptor começa desligado.
11. Você está no controle.
12. Quem você gostaria de encontrar?
13. Prévia do card e “Vocês poderão se conectar por...”.

Nome público com menos de 2 letras bloqueia a saída da etapa 2. O restante pode seguir sem seleção.

“Editar perfil” na prévia volta para a etapa do nome, sem concluir.

Coluna central de 480px. O miolo rola; o CTA fica fixo, com `safe-area-inset-bottom`.

## 11. Fotos

- Pasta: `match-profiles/{uid}/photos/{id}.jpg|png|webp`
- Até 6, até 5 MB, JPEG, PNG ou WebP
- Uma principal (`isPrimary`)
- Reordenar e marcar capa na própria etapa
- Upload na hora em que a pessoa escolhe o arquivo; a lista entra no documento ao tocar em Continuar
- Sem moderação automática
- Sem reaproveitar foto clínica

## 12. Storage

`storage.rules`: leitura, criação, atualização e exclusão só se `request.auth.uid == userId` na pasta `match-profiles/{userId}/photos/{fileName}`.

Criação e atualização também exigem tamanho menor que 5 MB e tipo JPEG, PNG ou WebP.

O restante do bucket continua bloqueado para o cliente, fora de `banners/`.

## 13. Firestore

`match_profiles/{uid}`: ler, criar, atualizar e apagar somente se `request.auth.uid == uid`.

O fallback `match /{document=**}` hoje libera qualquer usuário autenticado. Por isso `match_profiles` foi excluído desse fallback (`isMatchProfilePath`). Sem essa exclusão, a regra do dono não restringiria nada: no Firestore, um `allow` verdadeiro em qualquer matcher concede o acesso.

Não há leitura para outros usuários. Discovery ainda não existe.

## 14. Segurança

- Dono: lê e escreve o próprio documento e a própria pasta de fotos.
- Outra pessoa autenticada: não lê e não escreve.
- Anônimo: não lê e não escreve.
- O cliente não recebe um UID de destino. `requireOwnUid()` usa só a sessão atual.
- A sanitização recusa foto cujo caminho não pertence ao UID.

As rules do repositório precisam ser publicadas para valer no projeto `oftware-9201e`. Até o deploy, o fallback antigo ainda permite que um usuário autenticado alcance documentos fora das regras novas.

## 15. Rotas

| Rota | Papel |
| --- | --- |
| `/meta/match` | Landing. Sem perfil ou com rascunho, permanece. Perfil concluído redireciona para Meu perfil. |
| `/meta/match/onboarding` | Criação em etapas. |
| `/meta/match/profile` | Meu perfil, só o que outra pessoa veria. |
| `/meta/match/profile/edit` | Edição sem refazer o onboarding. |

O botão da landing:

- sem sessão → `/` (login já existente)
- sem perfil → “Quero fazer parte” → onboarding
- rascunho → “Continuar meu perfil” → onboarding na etapa salva
- concluído → Meu perfil

A landing segue em uma tela, sem scroll vertical.

## 16. Autosave e rascunho

Grava ao tocar em Continuar, Começar ou Entrar no Match Saudável. Chip, foto isolada no rascunho local e interruptor não disparam write sozinhos. A foto em si sobe no Storage ao ser escolhida, para não segurar o arquivo só na memória.

Até a última etapa: `status: "draft"` e `onboardingCompleted: false`. `onboardingStep` aponta a próxima etapa. Fechar e voltar continua dali.

## 17. Conclusão

Na prévia, “Entrar no Match Saudável” grava:

- `onboardingCompleted: true`
- `status: "active"`
- `updatedAt: serverTimestamp()`

Depois: `router.push("/meta/match/profile")`.

Não abre Discovery.

## 18. Meu perfil

`/meta/match/profile` mostra o card público: foto principal, nome, idade se permitida, cidade se permitida, bio, interesses, atividades, conexão, disponibilidade e highlights. A frase “É assim que outras pessoas verão seu perfil.” substitui um segundo modo de visualização.

Voltar leva a `/meta`, não à landing: a landing de um perfil ativo redireciona de volta para cá.

## 19. Edição

`/meta/match/profile/edit` reúne as mesmas etapas, menos a introdução e a prévia, e salva o documento inteiro mantendo `status: "active"` e `onboardingCompleted: true`.

## 20. Preparação para Discovery

Os dados já estão em ids, não em texto livre:

- interesses em comum
- atividade que a pessoa quer viver com alguém
- tipo de conexão
- cidade e modo de lugar
- raio, ainda sem coordenada
- dias e períodos
- ritmo (`activityLevel`)
- faixa etária e `showMe` explícito

O bloco “Vocês poderão se conectar por...” usa atividades e interesses escolhidos. Não há `compatibilityScore`.

`showMe` não é inferido do sexo do prontuário nem de orientação.

## 21. Fora desta etapa

Discovery, feed, stories, swipe, likes, match mútuo, chat, grupos funcionais, eventos funcionais, notificações sociais, algoritmo, IA, ranking, gamificação, moderação automática de foto, GPS e leitura de exames.

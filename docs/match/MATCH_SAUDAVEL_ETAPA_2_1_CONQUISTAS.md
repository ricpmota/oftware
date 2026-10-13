# Match Saudável — Etapa 2.1

Conquistas e objetivos no perfil social.

Esta etapa não implementa Discovery, ranking, pontuação, leaderboard nem integração com Strava, Garmin, Apple Health, Google Health Connect ou provas.

## Conceito

Quatro ideias continuam separadas:

| Camada | Significado | Exemplo |
| --- | --- | --- |
| Interesse | Do que a pessoa gosta | corrida, ciclismo, praia |
| Atividade desejada | O que quer fazer com outras pessoas | correr junto, pedalar junto |
| Conquista | O que já realizou | completou 10K |
| Objetivo | O que pretende realizar | quer correr os primeiros 21K |

Uma medalha de 5K tem o mesmo peso de produto que uma maratona. Não existe nível do usuário.

## Taxonomy

`lib/match/matchAchievements.ts`

IDs estáveis. O rótulo não é a chave. O mesmo catálogo serve para conquista e objetivo.

Distância:

- Corrida: `running_5k`, `running_10k`, `running_21k`, `running_42k`
- Ciclismo: `cycling_25k`, `cycling_50k`, `cycling_100k`, `cycling_200k`
- Natação: `swimming_500m`, `swimming_1k`, `swimming_2k`, `swimming_5k`
- Trilha: `hiking_5k`, `hiking_10k`, `hiking_25k`, `hiking_50k`
- Caminhada: `walking_5k`, `walking_10k`, `walking_21k`

Jornada, só declaração manual, sem cálculo:

- `first_activity` — Primeiro passo
- `active_30_days` — 30 dias em movimento
- `active_90_days` — 90 dias em movimento
- `training_100` — 100 treinos

Cada item tem `label`, `title`, `story`, `goalLine`, `category`, `iconType: "medal"` e, quando cabe, `distance` e `unit`.

## Schema

Em `match_profiles/{uid}`, além do que a Etapa 2 já gravava:

```ts
achievements: {
  id: string
  achievementId: string
  category: string
  achievedAt?: "YYYY-MM-DD"
  verification: { status: "self_declared" | "verified"; source?: string }
  visibility: "public" | "private"
  createdAt: string
}[]

goals: {
  id: string
  goalId: string
  category: string
  targetDate?: "YYYY-MM-DD"
  status: "active" | "completed" | "paused"
  visibility: "public" | "private"
  createdAt: string
  completedAt?: "YYYY-MM-DD"
}[]
```

Não há `achievementIds` nem `goalIds` gravados. A lista pequena é a fonte. `publicAchievementIds` e `publicGoalIds` derivam a ordem pública na hora da leitura. Um índice futuro pode copiar esses helpers; não há segunda escrita para dessincronizar.

Perfil antigo sem os campos vira `[]` em `sanitizeMatchProfile`. Nada é apagado do documento só por não ter medalha.

O que a pessoa adiciona na interface nasce `self_declared`, visibilidade `public` e sem `source`. Data é opcional. `verified` só permanece se já estiver no documento, com `source` opcional. A tela não marca nada como verificado.

## Medalhas

`MatchAchievementBadge` é CSS e Lucide. Não há PNG por medalha.

Círculo, Deep Blue `#0A1F44`, anel Vital Green `#4CCB7A`. No centro, o rótulo curto (`5K`, `10K`, `21K`, `42K`). Em cima, o símbolo da modalidade: corrida, bike, ondas, montanha, caminhada ou jornada.

Conquista é medalha sólida. Objetivo é o mesmo desenho em contorno, com o texto “Meu próximo objetivo”.

Verificada: um ✓ verde e o rótulo “Conquista verificada”. Autodeclarada não escreve “não verificada”. O detalhe diz “Conquista informada pelo usuário.”

## Perfil

Sobre a parte de baixo da foto, no máximo 4 medalhas públicas. Se houver mais, um `+N` abre a aba Conquistas. Medalha privada não entra nessa faixa. O nome fica na faixa azul, abaixo das medalhas.

A aba Conquistas, ao lado de Sobre, mostra a grade e os próximos objetivos. A barra continua horizontal. Quem visita e não tem item público não vê a aba. No próprio perfil, a seção vazia diz para adicionar conquistas da própria história, sem moldura vazia de medalha.

O toque abre um bottom sheet com título, frase, data se existir, e o estado de verificação.

## Onboarding e edição

O fluxo passou de 14 para 16 passos. As etapas novas ficam antes da prévia, nos índices 13 e 14, para não deslocar os passos 0 a 12 de um rascunho já salvo. Quem estava na prévia (passo 13) vê as conquistas e pode pular.

As duas etapas são opcionais, com “Pular por enquanto”. A edição do perfil inclui as mesmas escolhas depois das atividades: incluir, tirar, visibilidade, data e status do objetivo.

## Privacidade e clínica

Cada item tem `public` ou `private`. O padrão ao adicionar é público, com o controle “Mostrar no meu perfil”.

Nada é lido de peso, bioimpedância, prontuário, exame, medicamento ou diagnóstico. `pacientes_completos` não entra nesta etapa.

## Consultas futuras

Ainda sem algoritmo. Os motivos previstos:

- `SAME_ACHIEVEMENT` — vocês dois completaram 10K
- `SAME_GOAL` — vocês estão treinando para 21K
- `MENTORSHIP_COMPATIBILITY` — uma pessoa quer o que a outra já fez
- `SAME_ACTIVITY` — os dois praticam ciclismo

`verification.source` aceita, no futuro, Strava, Garmin, Apple Health, Google Health Connect ou uma prova. Nenhuma dessas fontes está ligada.

## Segurança

`firestore.rules` já limita `match_profiles/{uid}` a leitura e escrita do próprio `request.auth.uid`, e o fallback ignora esse caminho. A etapa não abriu a coleção. As regras não foram alteradas.

## Compatibilidade

Documento sem `achievements` ou `goals` continua válido. Ids fora do catálogo e datas inválidas são descartados. Interesse `running` não cria a medalha `running_5k`.

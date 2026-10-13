# Modelo de dados — 50 KG DEPOIS

Integração com **Patrimônio Global** via coleção `global_heritage`.

## Firestore

```
global_heritage/
  50kg_depois/                    # documento do projeto
    participants/
      antonio/                    # documento do participante
        answers/
          {questionId}/           # uma resposta por pergunta
        memories/
          {memoryId}/             # memórias livres
```

## Documento do projeto (`global_heritage/50kg_depois`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `bookProject` | string | `50kg_depois` |
| `title` | string | `50 KG DEPOIS` |
| `editorialMeta` | object | Reservado para camada editorial futura |
| `createdAt` | timestamp | Criação |
| `updatedAt` | timestamp | Atualização |

## Documento do participante

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `participantId` | string | ex.: `antonio` |
| `participantName` | string | ex.: `Antônio` |
| `bookProject` | string | `50kg_depois` |
| `weightJourneyLabel` | string | `153 kg → 103 kg` |
| `startedAt` | timestamp \| null | Início da entrevista |
| `updatedAt` | timestamp | Última alteração |
| `completedAt` | timestamp \| null | Conclusão |
| `currentChapterIndex` | number | Índice 0-based do capítulo |
| `currentPhase` | string | `intro`, `consent`, `interview`, `memories`, `complete`, `review` |
| `progressPercent` | number | 0–100 |
| `status` | string | `NOT_STARTED`, `IN_PROGRESS`, `COMPLETED` |
| `consentAccepted` | boolean | Consentimento desta etapa |
| `consentAcceptedAt` | timestamp \| null | Data do consentimento |
| `consentVersion` | string | Versão do texto de consentimento |
| `skippedQuestionIds` | string[] | Perguntas marcadas "responder depois" |
| `editorialMeta` | object | Reservado (IA, cenas, anexos, etc.) |

## Documento de resposta (`answers/{questionId}`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `chapterId` | string | ID do capítulo |
| `questionId` | string | ID estável da pergunta |
| `questionText` | string | Texto da pergunta no momento do save |
| `answer` | string | Resposta literal do participante |
| `skipped` | boolean | Marcada para responder depois |
| `updatedAt` | timestamp | Servidor |

## Documento de memória (`memories/{memoryId}`)

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `title` | string | Opcional |
| `text` | string | Conteúdo |
| `approxDate` | string | Opcional |
| `lifePhase` | string | Opcional |
| `updatedAt` | timestamp | Servidor |

## Índices Firestore

Nenhum índice composto adicional foi necessário nesta etapa:

- leituras por documento ID
- listagem de participantes por subcoleção direta
- respostas e memórias por subcoleção do participante

## Variáveis de ambiente

Nenhuma variável específica é necessária — usa autenticação Firebase já configurada no projeto.

## Serviço

Lógica central em `services/cinquentaKgDepoisService.ts`.

## Segurança

- Firestore acessado apenas via Firebase Admin no servidor
- Rotas exigem login Firebase (`Authorization: Bearer`)
- Respostas não são legíveis sem autenticação
- Link discreto + `noindex` (não indexado em buscadores)

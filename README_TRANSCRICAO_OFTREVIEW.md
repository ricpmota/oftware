# Pipeline de Transcrição OFTREVIEW

Pipeline para transcrever todos os vídeos do curso "OFTREVIEW 2023" no Google Cloud Storage usando Speech-to-Text v2.

## Pré-requisitos

- Next.js (App Router)
- Bucket GCS `oftware` com vídeos em `OFTREVIEW 2023/`
- Service Account GCP com permissões necessárias

## Variáveis de Ambiente

| Variável | Obrigatório | Descrição |
|----------|-------------|-----------|
| `GCP_SA_JSON_BASE64` | Sim* | Base64 do JSON da Service Account (prioridade) |
| `GOOGLE_APPLICATION_CREDENTIALS_JSON` | Sim* | JSON da chave (fallback se GCP_SA_JSON_BASE64 não estiver definido) |
| `GCP_PROJECT_ID` | Sim | ID do projeto GCP |
| `GCS_BUCKET` | Sim | Nome do bucket (ex: `oftware`) |
| `GCS_COURSE_PREFIX` | Não | Prefix fixo do curso (default: `OFTREVIEW 2023/`) |
| `TRANSCRIPTS_PREFIX` | Não | Prefix para TXT/JSON (default: `transcripts/OFTREVIEW 2023/`) |
| `TRANSCRIPTS_AUDIO_PREFIX` | Não | Prefix para WAV (default: `transcripts-audio/OFTREVIEW 2023/`) |
| `TRANSCRIBE_MANIFEST_PREFIX` | Não | Prefix para manifests (default: `transcribe-manifests/oftreview/`) |
| `TRANSCRIBE_WORKER_URL` | Sim | URL do worker Cloud Run (ex: `https://transcribe-worker-xxx.run.app`) |
| `DEFAULT_LANGUAGE` | Não | Código de idioma (default: `pt-BR`) |

## Gerar GCP_SA_JSON_BASE64

1. Crie uma Service Account no [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts)
2. Baixe o JSON da chave
3. Encode em base64:

```bash
# Linux/macOS
base64 -w 0 key.json | pbcopy  # ou salve em .env

# PowerShell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("key.json"))
```

4. Defina no `.env.local` ou na Vercel:

```
GCP_SA_JSON_BASE64=<saída do comando acima>
```

## IAM Mínimo

A Service Account precisa:

- **Storage Object Admin** (`roles/storage.objectAdmin`) no bucket — para listar, ler e gravar objetos
- **Speech-to-Text User** (`roles/speech.client`) — para usar a API de transcrição

```bash
# Bucket (ajuste BUCKET_NAME e SA_EMAIL)
gsutil iam ch serviceAccount:SA_EMAIL:objectAdmin gs://BUCKET_NAME

# Speech-to-Text (projeto)
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/speech.client"
```

## Endpoints

### 1. POST /api/transcribe-oftreview/start

Inicia um novo batch, lista vídeos e cria manifest.

**Body (opcional):**
```json
{
  "maxFiles": 500,
  "force": false
}
```

**Resposta:**
```json
{
  "ok": true,
  "batchId": "uuid",
  "totalFound": 150,
  "queued": 120,
  "skippedExisting": 30,
  "manifestGcsUri": "gs://oftware/transcribe-manifests/oftreview/uuid.json"
}
```

**cURL:**
```bash
curl -X POST https://seu-dominio.vercel.app/api/transcribe-oftreview/start \
  -H "Content-Type: application/json" \
  -d '{"maxFiles": 500, "force": false}'
```

### 2. POST /api/transcribe-oftreview/continue

Processa mais itens do batch (baixa vídeo, extrai áudio, inicia STT).

**Body:**
```json
{
  "batchId": "uuid-do-start",
  "maxToProcess": 3,
  "concurrency": 2,
  "force": false
}
```

**Resposta:**
```json
{
  "ok": true,
  "batchId": "uuid",
  "started": 3,
  "skipped": 0,
  "manifestGcsUri": "gs://oftware/transcribe-manifests/oftreview/uuid.json"
}
```

**cURL:**
```bash
curl -X POST https://seu-dominio.vercel.app/api/transcribe-oftreview/continue \
  -H "Content-Type: application/json" \
  -d '{"batchId":"SEU-BATCH-ID","maxToProcess":3,"concurrency":2}'
```

### 3. GET /api/transcribe-oftreview/status?batchId=...

Consulta status, chama o worker para itens `running` com `operationName`, finaliza operações concluídas e salva TXT/JSON no GCS.

Requer `TRANSCRIBE_WORKER_URL` configurado. Para cada item em `running`:
- Chama `GET ${TRANSCRIBE_WORKER_URL}/result?operationName=...`
- Se `done:false`: mantém running
- Se `done:true`: grava TXT/JSON via `lib/transcribe/paths.ts` e marca `done`
- Se `ok:false`: marca `failed` e salva error

**Resposta:**
```json
{
  "ok": true,
  "batchId": "uuid",
  "progress": {
    "total": 150,
    "done": 45,
    "running": 3,
    "queued": 99,
    "skipped": 0,
    "failed": 3
  },
  "done": false,
  "manifestGcsUri": "gs://oftware/transcribe-manifests/oftreview/uuid.json",
  "samplePreview": "Primeiros 200 caracteres de uma transcrição..."
}
```

**cURL:**
```bash
# Substitua SEU-BATCH-ID pelo batchId retornado no POST /start
curl "https://seu-dominio.vercel.app/api/transcribe-oftreview/status?batchId=SEU-BATCH-ID"
```

**Exemplo de progress:**
```json
{
  "progress": {
    "total": 150,
    "done": 45,
    "running": 3,
    "queued": 99,
    "skipped": 0,
    "failed": 3
  }
}
```

## Fluxo de Uso

1. **Start:** `POST /start` → obter `batchId`
2. **Continue (repetir):** `POST /continue` com `batchId` até processar tudo
3. **Status (repetir):** `GET /status?batchId=...` para concluir operações e ver progresso

### Modo Auto (card Status de Transcrição em /metaadmingeral)

No painel OftPay de `/metaadmingeral`, após o card "Transcrição OFTREVIEW (Dev)", há o card **Status de Transcrição** com modo automático:

1. **Iniciar Auto:** A cada 10 segundos chama `status` e, se `queued > 0` e `running < 2`, chama `continue` com `maxToProcess: 2 - running`.
2. **Pausar:** Interrompe o ciclo automático.
3. **Atualizar agora:** Executa um ciclo manual (status + continue, se aplicável).
4. O **batchId** é compartilhado com o card acima ou pode ser colado manualmente.
5. Ao concluir (`done + skipped + failed == total`), o Auto pausa automaticamente. Em erro de API, mostra alerta e pausa.

Exemplo em script:

```bash
BATCH=$(curl -s -X POST .../start -d '{}' | jq -r '.batchId')
while true; do
  curl -s -X POST .../continue -d "{\"batchId\":\"$BATCH\"}" | jq .
  R=$(curl -s ".../status?batchId=$BATCH" | jq -r '.done')
  [ "$R" = "true" ] && break
  sleep 60
done
```

## Timeouts e Robustez

- **Worker Cloud Run:** O download de vídeo + ffmpeg roda no worker (`worker/transcribe-run`), evitando ENOSPC no Vercel. Veja `worker/transcribe-run/README_CLOUD_RUN_WORKER.md` para deploy.
- **Vercel:** O `continue` apenas chama o worker via HTTP; o processamento pesado ocorre no Cloud Run (timeout configurável, mais memória).

## Estrutura de Saída

- **Vídeo (entrada):** `gs://oftware/OFTREVIEW 2023/<subpath>/<name>.<ext>`
- **TXT (saída):** `gs://oftware/transcripts/OFTREVIEW 2023/<subpath>/<name>.txt`
- **JSON (saída):** `gs://oftware/transcripts/OFTREVIEW 2023/<subpath>/<name>.json`
- **Áudio (opcional):** `gs://oftware/transcripts-audio/OFTREVIEW 2023/<subpath>/<name>.wav`

## Idempotência

Se o TXT de saída já existir e `force=false`, o item é marcado como `skipped`.

## Segurança

- Prefix do curso **nunca** vem do cliente; é fixo via `GCS_COURSE_PREFIX`
- Somente objetos com prefix `OFTREVIEW 2023/` são listados/processados
- Somente o bucket configurado é utilizado

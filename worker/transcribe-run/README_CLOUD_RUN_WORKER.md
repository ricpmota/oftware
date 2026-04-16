# Cloud Run Worker — Transcrição OFTREVIEW

Worker que processa vídeos: download do GCS, conversão para WAV via ffmpeg, upload e início do Speech-to-Text.

## Autenticação (ADC recomendado)

O worker usa **Application Default Credentials (ADC)** no Cloud Run. Não é necessário passar chave JSON no env.

1. **Service Account do Cloud Run** — configure com:
   - `roles/storage.objectAdmin` no bucket (ou `storage.objects.get` + `storage.objects.create`)
   - `roles/speech.client` no projeto

2. **GCP_PROJECT_ID** — obrigatório. Use `--set-env-vars "GCP_PROJECT_ID=seu-projeto"` no deploy.

**GCP_SA_JSON_BASE64** é opcional — só para rodar localmente. No Cloud Run, prefira ADC.

## Build e Deploy

```bash
cd worker/transcribe-run

# Rebuild
npm run build

# Build da imagem
gcloud builds submit --tag gcr.io/gen-lang-client-0723351594/transcribe-worker .

# Deploy (ADC, sem chave no env)
gcloud run deploy transcribe-worker \
  --image gcr.io/gen-lang-client-0723351594/transcribe-worker \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 2Gi \
  --cpu 2 \
  --timeout 600 \
  --set-env-vars "GCP_PROJECT_ID=gen-lang-client-0723351594" \
  --service-account SUA_SA@gen-lang-client-0723351594.iam.gserviceaccount.com
```

## Conceder permissões à Service Account

```bash
# Storage no bucket oftware
gsutil iam ch serviceAccount:SUA_SA@gen-lang-client-0723351594.iam.gserviceaccount.com:objectAdmin gs://oftware

# Speech-to-Text
gcloud projects add-iam-policy-binding gen-lang-client-0723351594 \
  --member="serviceAccount:SUA_SA@gen-lang-client-0723351594.iam.gserviceaccount.com" \
  --role="roles/speech.client"
```

## Endpoint

**POST /process**

Body:
```json
{
  "bucket": "oftware",
  "objectName": "OFTREVIEW 2023/modulo-01/aula.mp4",
  "audioGcsUri": "gs://oftware/transcripts-audio/OFTREVIEW 2023/modulo-01/aula.wav",
  "language": "pt-BR"
}
```

Response (sucesso):
```json
{
  "ok": true,
  "operationName": "projects/gen-lang-client-0723351594/locations/global/operations/...",
  "audioGcsUri": "gs://oftware/transcripts-audio/OFTREVIEW 2023/modulo-01/aula.wav"
}
```

## Teste curl

```bash
# Substitua WORKER_URL pela URL do Cloud Run
curl -X POST "https://transcribe-worker-xxxxx-uc.a.run.app/process" \
  -H "Content-Type: application/json" \
  -d '{
    "bucket": "oftware",
    "objectName": "OFTREVIEW 2023/SEU_SUBPATH/arquivo.mp4",
    "audioGcsUri": "gs://oftware/transcripts-audio/OFTREVIEW 2023/SEU_SUBPATH/arquivo.wav",
    "language": "pt-BR"
  }'
```

**Esperado:** `{"ok":true,"operationName":"projects/.../operations/...","audioGcsUri":"gs://..."}`

## GET /result

Consulta o resultado da operação longRunningRecognize (v1p1beta1). Polling do Speech-to-Text.

```bash
# Substitua <service> pela URL do Cloud Run
curl -s "https://<service>/result?operationName=..."
```

**Em andamento:**
```json
{"ok":true,"done":false}
```

**Concluído:**
```json
{"ok":true,"done":true,"transcriptText":"...","raw":{...}}
```

**Erro:**
```json
{"ok":false,"error":"...","details":"..."}
```

## Checklist pré-deploy

- [ ] GCP_PROJECT_ID definido no Cloud Run
- [ ] Service Account com storage.objectAdmin no bucket oftware
- [ ] Service Account com roles/speech.client no projeto
- [ ] Imagem buildada e publicada no GCR/Artifact Registry
- [ ] Port 8080 exposta (Cloud Run usa PORT)

## Next.js (Vercel)

```
TRANSCRIBE_WORKER_URL=https://transcribe-worker-xxxxx-uc.a.run.app
```

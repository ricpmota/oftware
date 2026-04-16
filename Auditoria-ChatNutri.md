# Auditoria-ChatNutri

## PRÉ-AUDITORIA — Integração atual com Google Cloud (Storage + Vertex) no projeto

**Objetivo:** Antes de implementar o ChatNutri Etapa 2 (upload de imagens + Gemini Vision), analisar a base atual do projeto e mapear como o Google Cloud já está configurado e sendo utilizado.

**Data:** 2026-03-01  
**Projeto:** oftware (Next.js)

---

## 1) CLOUD STORAGE

### Uso atual de Storage

| Local | SDK / Helper | Bucket | Funções principais |
|-------|--------------|--------|--------------------|
| `lib/gcp/storage.ts` | `@google-cloud/storage` | `GCS_BUCKET` (env) ou `'oftware'` | `uploadFromBuffer`, `uploadFromFile`, `downloadToBuffer`, `downloadToFile`, `getFile`, `listObjects` |
| `worker/transcribe-run/src/gcp/storage.ts` | `@google-cloud/storage` | passado como parâmetro | `uploadFromFile`, `uploadFromBuffer`, `downloadToFile`, `checkIfAlreadyProcessed` |
| `app/api/upload-banner/route.ts` | `firebase-admin/storage` | `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Upload via `admin.storage()`, bucket Firebase, `makePublic()` |
| `app/api/oftpay/apostila-signed-url` | `@google-cloud/storage` | `OFTPAY_GCS_BUCKET` | `getSignedUrl({ action: 'read', expires })` |

### Credenciais GCS

- **lib/gcp/auth.ts:** `GCP_SA_JSON_BASE64` > `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **oftpay:** `GOOGLE_APPLICATION_CREDENTIALS_JSON` ou `GOOGLE_APPLICATION_CREDENTIALS` (path)
- **upload-banner:** Firebase Admin (`FIREBASE_*`) — bucket do Firebase Storage, não GCS puro

### Padrão de path

- **lib/gcp:** objeto por nome (`name`), ex: `prefix/file.json`
- **oftpay:** `{courseId}/APOSTILAS/` ou `PROPEDEUTICS/`, `OFTREVIEW 2023/APOSTILAS/`
- **upload-banner:** `banners/{timestamp}_{random}.{ext}` (Firebase Storage)

### Signed URL

- ✅ Usada em `app/api/oftpay/apostila-signed-url/route.ts`: `file.getSignedUrl({ action: 'read', expires })`
- Não há helper compartilhado para signed URL; cada rota implementa localmente

---

## 2) VERTEX AI / GEMINI

### Uso atual

| Local | Chamada | Modelo | Entrada |
|-------|---------|--------|---------|
| `app/api/chat/route.ts` | REST API (`fetch`) | `GEMINI_MODEL_ID` ou `gemini-2.0-flash-001` | **Apenas texto** |

### Implementação

- **SDK:** Nenhum `@google-cloud/vertexai` nem `GoogleGenerativeAI`; usa **REST direto**:
  ```
  https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/${model}:generateContent
  ```
- **Credenciais:** JWT via `google-auth-library` (`client_email`, `private_key`), obtidas de:
  - `GOOGLE_VERTEX_CREDENTIALS_JSON`, ou
  - `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`
- **Variáveis:** `VERTEX_AI_LOCATION` (default `us-central1`), `GEMINI_MODEL_ID` (default `gemini-2.0-flash-001`)
- **Payload:** `systemInstruction`, `contents` (texto), `generationConfig`

### Observação

- Gemini atual só recebe **texto**; não há uso de partes de imagem (`inlineData` ou URLs) no `generateContent`.

---

## 3) CREDENCIAIS E AUTH

### firebase-admin

- ✅ Usado em várias API routes (chatNutri, send-email, relatorio-paciente, oftpay, etc.)
- Variáveis: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` (ou `FIREBASE_ADMIN_*`)
- `cert()` do `firebase-admin/app` para inicialização

### GCP Service Account (Storage / Vertex)

- **lib/gcp/auth.ts:** `GCP_SA_JSON_BASE64` > `GOOGLE_APPLICATION_CREDENTIALS_JSON`
- **oftpay:** `GOOGLE_APPLICATION_CREDENTIALS_JSON` ou path `GOOGLE_APPLICATION_CREDENTIALS`
- **app/api/chat (Vertex):** `GOOGLE_VERTEX_CREDENTIALS_JSON` ou `GOOGLE_PROJECT_ID` + `GOOGLE_CLIENT_EMAIL` + `GOOGLE_PRIVATE_KEY`
- **worker/transcribe-run:** `GCP_SA_JSON_BASE64` > `GOOGLE_APPLICATION_CREDENTIALS_JSON` > ADC (Cloud Run)

### Application Default Credentials (ADC)

- worker no Cloud Run usa ADC quando não há JSON em env
- Next.js/Vercel: JSON em variável de ambiente (não ADC por padrão)

### Configuração por ambiente

- Não há `.env` versionado; env vars via Vercel / Cloud Run
- Projeto ID default: `oftware-9201e`

---

## 4) NEXT.JS / RUNTIME

- **App Router:** ✅ Sim (`app/` folder)
- **Endpoints multipart/form-data:** ✅ `app/api/upload-banner/route.ts` usa `request.formData()`, valida imagem (5MB, `image/*`)
- **Runtime:** `app/api/chat` declara `export const runtime = 'nodejs'`; demais rotas usam Node.js por padrão
- **Limitações:** body size padrão do Next.js; `upload-banner` limita 5MB

---

## 5) BUCKET CONFIG

| Variável | Uso | Default / Observação |
|----------|-----|----------------------|
| `GCS_BUCKET` | lib/gcp, transcribe-oftreview | `'oftware'` |
| `OFTPAY_GCS_BUCKET` | oftpay (apostilas, vídeos) | Obrigatório, sem default |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage (upload-banner) | `oftware-9201e.firebasestorage.app` ou `.appspot.com` |

- Região do bucket não aparece nos env
- Vertex AI: `VERTEX_AI_LOCATION` = `us-central1`

---

## RESUMO EXECUTIVO

### ✅ O que já existe e pode ser reutilizado

1. **Upload de imagens:**  
   `app/api/upload-banner` já faz upload de imagem via `formData`, valida tipo e tamanho (5MB) e usa `firebase-admin/storage` no bucket Firebase.  
   Pode ser referência para o fluxo multipart do ChatNutri.

2. **Credenciais Firebase Admin:**  
   Padrão consolidado (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).  
   ChatNutri já usa `chatNutriServerService` com firebase-admin.

3. **Vertex AI (Gemini):**  
   `app/api/chat` já chama o endpoint `generateContent` via REST com JWT.  
   Mesmo padrão de credenciais e URL pode ser reutilizado para Gemini Vision.

4. **Signed URL (GCS):**  
   `app/api/oftpay/apostila-signed-url` usa `getSignedUrl`; padrão replicável para links de imagens no GCS.

5. **Storage GCS (lib/gcp):**  
   `uploadFromBuffer` e `uploadFromFile` podem ser usados se o ChatNutri gravar imagens no GCS em vez do Firebase Storage.

### ⚠️ Pontos de atenção

1. **Dois mundos de Storage:**  
   - Firebase Storage (upload-banner) vs GCS puro (lib/gcp, oftpay).  
   ChatNutri precisa decidir: Firebase Storage ou GCS?

2. **Credenciais distintas:**  
   - Firebase Admin: FIREBASE_*  
   - Vertex: GOOGLE_VERTEX_CREDENTIALS_JSON ou GOOGLE_*  
   - GCS (lib/gcp, oftpay): GCP_SA_JSON_BASE64 ou GOOGLE_APPLICATION_CREDENTIALS_JSON  

   Mesma service account pode atender Firebase + Vertex + GCS se tiver as permissões corretas.

3. **Gemini Vision:**  
   O `generateContent` atual só envia texto. Para imagens é necessário incluir `inlineData` (base64) ou URL pública no payload.

4. **Tamanho de body:**  
   Next.js pode limitar body (ex.: 4MB). Upload de imagens grandes pode exigir configuração (`bodyParser`) ou estratégia alternativa.

### ❌ O que está faltando para o ChatNutri Etapa 2

1. **Endpoint multipart para ChatNutri:**  
   Não existe ainda rota que receba `multipart/form-data` com imagem para o ChatNutri.  
   O `/api/chatnutri/meal` atualmente aceita apenas JSON com placeholder.

2. **Upload real de imagem:**  
   Fluxo atual é placeholder; falta:
   - Receber arquivo
   - Validar (tipo, tamanho)
   - Fazer upload (GCS ou Firebase Storage)
   - Obter URL (pública ou assinada)

3. **Integração Gemini Vision:**  
   Falta adaptar o payload do `generateContent` para incluir a imagem e o prompt nutricional.

4. **Helper de signed URL para imagens ChatNutri:**  
   Se usar GCS privado, é preciso gerar signed URLs para exibir as imagens no frontend.

5. **Bucket/prefix para ChatNutri:**  
   Definir bucket e padrão de path, por exemplo:  
   `chatnutri/{patientId}/{dateKey}/{messageId}.{ext}` ou equivalente no Firebase Storage.

### 🎯 Recomendação final

- **Storage:**  
  - **Opção A (recomendada):** usar o **Firebase Storage** (como em `upload-banner`) para simplificar credenciais e manter tudo no ecossistema Firebase.  
  - **Opção B:** usar GCS via `lib/gcp/storage` e criar helper de signed URL para leitura de imagens.

- **Upload:**  
  Reutilizar o fluxo de `upload-banner` (formData, validação, buffer) e adaptar para o contrato do ChatNutri (patientId, dateKey, messageId).

- **Gemini Vision:**  
  Reutilizar o padrão de `app/api/chat` (REST + JWT) e estender o payload com `inlineData` ou URL da imagem para o modelo multimodal.

- **Credenciais:**  
  Usar Firebase Admin para Firestore + Firebase Storage; para Vertex AI, manter `GOOGLE_VERTEX_CREDENTIALS_JSON` (ou a mesma service account com permissões de Vertex AI).

---

*Documento gerado para suporte à implementação da Etapa 2 do ChatNutri. Não implementar nem modificar código nesta fase.*

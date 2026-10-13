# ETAPA 01 — Oftware BodyScan v1

## Objetivo

Gerar uma **estimativa de composição corporal por imagem** (BodyScan), a partir de:

- foto frontal
- foto lateral/perfil
- peso da semana
- circunferência abdominal (opcional)
- altura cadastrada
- IMC calculado com o peso da semana

**Não é bioimpedância, DXA ou exame físico.**

## Arquitetura

```text
Upload foto / salvar peso
        ↓
after() → tryGenerateBodyScan(patientId, week)
        ↓
frontal + perfil + peso + altura?
idempotência (mesmos photoIds / lock processing)
        ↓
status=processing (doc week-N)
        ↓
download Storage → prepareBodyScanImage (temporário)
        ↓
services/bodyScanGeminiService.ts (2 imagens + JSON)
        ↓
validateBodyScanGeminiResponse
        ↓
calculateBodyScanMasses (backend)
        ↓
status=completed | failed
        ↓
BodyScanModal (/meta + /metaadmin + /aplicacao)
```

## Collections

```text
pacientes_completos/{patientId}/bodyScans/week-{N}
```

Prompt version: `bodyscan-v1`

## Critérios de execução

Mínimo obrigatório:

1. foto frontal da semana
2. foto perfil da semana
3. peso em `evolucaoSeguimento` da semana
4. altura em `dadosClinicos.medidasIniciais`

Circunferência abdominal é opcional.

BodyScan **não** exige consentimento separado e **não** depende de `compartilharComMedico`.


## Idempotência

- Doc ID determinístico `week-{N}`
- Se `completed` com mesmos `frontPhotoId` + `sidePhotoId` → não chama Gemini
- Se `processing` com `updatedAt` < 5 min → não chama
- Foto substituída (novo ID) → permite regenerar

## Gemini

- Auth: `lib/gcp/googleVertexAuth.ts`
- Modelo: `GEMINI_BODYSCAN_MODEL_ID` → `GEMINI_MODEL_ID` → `gemini-2.5-flash`
- Multimodal `inline_data` + `responseMimeType: application/json`
- Massas gorda/livre de gordura **nunca** pedidas ao Gemini (cálculo local)

## UI

- `components/bodyscan/BodyScanModal.tsx` — único modal reutilizado
- Botão BodyScan em:
  - `/aplicacao` (seção de fotos)
  - `/meta` (Aplicações → Registro fotográfico)
  - `/metaadmin` (timeline de aplicação + carrossel de fotos)

## Permissões

- BodyScan é liberado com fotos existentes (independente de `compartilharComMedico`)
- Não há gate de consentimento BodyScan separado
- Listagem paciente: token `/aplicacao` ou API `/api/meta/bodyscan`
- Profissional: Firestore client / API metaadmin autenticada

## Limitações v1

- Sem comparação multimodal longitudinal (cada semana isolada)
- Sem reforma de `makePublic()` das fotos
- Sem 3D / gordura visceral / recomendações terapêuticas
- Estimativas com intervalo; sem falsa precisão

## Testes

`lib/bodyscan/bodyScan.spec.ts` cobre readiness, validação, massas, ordenação e ids por semana.

```bash
npx vitest run lib/bodyscan/bodyScan.spec.ts
```

# ETAPA 02 — BodyScan histórico (backfill)

## Objetivo

Permitir que pacientes com fotos já existentes em `progressPhotos` gerem BodyScans retroativos **sem novo upload**, ao clicar em **BodyScan**.

## Fluxo UX

```text
BodyScan
  ↓
POST dryRun → descoberta por semana
  ↓
semanas pendentes → "Encontramos o histórico…"
  ↓
POST backfill (concurrency 2)
  ↓
BodyScanModal com evolução
```

BodyScan **não** exige consentimento separado. Fotos existentes bastam
(independente de `compartilharComMedico`).

## Descoberta

Arquivo: `lib/bodyscan/discoverHistoricalBodyScanWeeks.ts`

1. Agrupa `progressPhotos` por `semana` (não por `applicationId`)
2. Em cada semana, pega frontal e perfil **mais recentes**
3. Cruza com `evolucaoSeguimento.weekIndex` (peso) + `medidasIniciais.altura`
4. Circunferência opcional

Elegível:

```text
frontal + perfil + peso + altura
```

## Geração

Arquivo: `lib/bodyscan/generateMissingHistoricalBodyScans.ts`

- Reutiliza `tryGenerateBodyScan` (idempotência por `frontPhotoId`/`sidePhotoId`)
- Concorrência máxima: **2**
- Ordem: cronológica (semana 1 → N)
- Sem gate de consentimento BodyScan

## Endpoints

| Rota | Quem |
|---|---|
| `POST /api/meta/bodyscan/backfill` | Paciente autenticado (próprio ID) |
| `POST /api/metaadmin/pacientes/{id}/bodyscan/backfill` | Profissional autenticado |
| `POST /api/aplicacao/{token}/bodyscan/backfill` | Token público da aplicação |

Body útil:

```json
{ "dryRun": true }
```

Resposta (exemplo):

```json
{
  "foundPhotoWeeks": 10,
  "eligibleWeeks": 7,
  "alreadyCompleted": 2,
  "pendingGeneration": 5,
  "generated": 5,
  "skipped": 2,
  "failed": 0,
  "consentAccepted": true,
  "scans": []
}
```

## Idempotência / custo

- `completed` + mesmos photoIds → skip
- foto substituída → regenera
- pool de 2 workers evita pico Vertex com 10+ semanas

## Testes

```bash
npx vitest run lib/bodyscan/bodyScanHistorical.spec.ts
```

Cobre descoberta, elegibilidade, duplicatas, ordenação e concorrência.

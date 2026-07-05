# Etapa 4 OI — API interna `analisar-paciente`

**Objetivo:** expor a análise OI via **rota server-side protegida**, para que o Orçamento Terapêutico (e outros fluxos) consultem a OI **sem importar `OIService` em Client Components**.

> **Status:** rota criada e funcional. **Ainda não conectada** ao modal de Orçamento nem ao Controle Financeiro.

**Documentos relacionados:**

- [05_OI_CORE.md](./05_OI_CORE.md) — `OIService` e `OIAnalysis`
- [02_ORCAMENTO_TERAPEUTICO_METAADMIN.md](./02_ORCAMENTO_TERAPEUTICO_METAADMIN.md) — consumidor futuro

---

## Por que esta API existe

| Problema | Solução |
|----------|---------|
| `OIBenchmarkRepository` usa `fs` (Node.js) | Análise roda **somente no servidor** |
| Client Components não podem importar `OIService` | UI chama **POST** autenticado |
| Telas não devem conhecer estrutura de benchmarks | Resposta expõe apenas `OIAnalysis` |

Regra arquitetural: **componentes React → API OI → OIService → benchmarks JSON**.

---

## Endpoint

| Item | Valor |
|------|--------|
| **Path** | `/api/oi/analisar-paciente` |
| **Método** | `POST` |
| **Runtime** | `nodejs` (obrigatório — leitura de benchmarks em disco) |
| **Auth** | `Authorization: Bearer <Firebase ID Token>` |
| **Permissão** | Médico autenticado + `medicoResponsavelId` do paciente |

---

## Fluxo da rota

```
POST /api/oi/analisar-paciente
        │
        ▼
Validar body (pacienteId)
        │
        ▼
requireMedicoPacienteMetaadmin(request, pacienteId)
  • 401 sem token / token inválido
  • 403 médico não cadastrado ou paciente de outro médico
  • 404 paciente inexistente em pacientes_completos
        │
        ▼
Buscar pacientes_completos/{pacienteId}
        │
        ▼
normalizePacienteDocument() → PacienteCompleto
        │
        ▼
analisarPaciente(paciente)  ← lib/oi/OIService.ts
        │
        ▼
{ ok: true, analysis: OIAnalysis }
```

**Nenhuma escrita no Firestore.** Somente leitura + análise estatística.

---

## Payload

### Request

```json
{
  "pacienteId": "firestore-doc-id"
}
```

### Response — sucesso (200)

```json
{
  "ok": true,
  "analysis": {
    "versaoModelo": "0.1.0",
    "pacientesSemelhantes": 120,
    "confiabilidade": "alta",
    "faixaMeta": "5_a_10",
    "mgEstimado": 132,
    "mgMinimo": 118,
    "mgMaximo": 147,
    "tempoEstimadoSemanas": 24,
    "tempoMinimoSemanas": 20,
    "tempoMaximoSemanas": 28,
    "observacoes": ["..."]
  }
}
```

Ver campos completos em `types/oi.ts` → `OIAnalysis`.

### Response — erro

| Status | Condição | Body |
|--------|----------|------|
| **400** | `pacienteId` ausente ou body inválido | `{ ok: false, error: "..." }` |
| **401** | Sem token ou token inválido | `{ ok: false, error: "..." }` |
| **403** | Médico sem permissão para o paciente | `{ ok: false, error: "..." }` |
| **404** | Paciente não encontrado | `{ ok: false, error: "..." }` |
| **500** | Falha inesperada na análise | `{ ok: false, error: "..." }` |

---

## Segurança

### O que a rota **não** retorna

- Documento bruto do Firestore
- Nome, e-mail, CPF, telefone, endereço
- Qualquer PII além do que já está encapsulado na lógica OI (a resposta `OIAnalysis` é estatística agregada, sem identificadores)

### Logs

- Apenas mensagens genéricas (`[oi/analisar-paciente] Falha interna.`)
- **Sem** logar `pacienteId`, nome, e-mail ou token

### Autenticação

Mesmo padrão de `requireMedicoPacienteMetaadmin` (`lib/server/metaadminExamesImagemGate.ts`) usado em rotas metaadmin (ex.: exames de imagem, contrato).

---

## Código

| Artefato | Caminho |
|----------|---------|
| Rota Next.js | `app/api/oi/analisar-paciente/route.ts` |
| Handler testável | `lib/oi/analisarPacienteHandler.ts` |
| Testes | `lib/oi/analisarPacienteHandler.spec.ts` |
| Serviço OI | `lib/oi/OIService.ts` |
| Gate médico/paciente | `lib/server/metaadminExamesImagemGate.ts` |

---

## Exemplo de chamada (futuro — Orçamento)

```typescript
const token = await auth.currentUser?.getIdToken();
const res = await fetch('/api/oi/analisar-paciente', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify({ pacienteId: paciente.id }),
});
const data = await res.json();
if (data.ok) {
  // data.analysis → OIAnalysis
}
```

> **Não implementado ainda** no modal de Orçamento — Etapa 5+.

---

## O que esta etapa NÃO altera

- Modal de Orçamento Terapêutico
- Controle Financeiro / Recibo
- Firestore (somente leitura)
- Chat
- Tabela V2 fixa do orçamento
- Consumo de IA

---

## Critérios de aceite

- [x] Rota `POST /api/oi/analisar-paciente` criada
- [x] `runtime = 'nodejs'`
- [x] Auth via `requireMedicoPacienteMetaadmin`
- [x] Busca + normalização + `analisarPaciente()`
- [x] Retorna `{ ok: true, analysis }` sem documento do paciente
- [x] Handler testável + testes unitários
- [x] Nenhuma UI alterada
- [x] Documentação desta etapa

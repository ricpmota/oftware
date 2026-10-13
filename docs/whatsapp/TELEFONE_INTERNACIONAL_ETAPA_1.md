# Telefone internacional — Etapa 1 (fundação)

**Data:** 21 de setembro de 2026  
**Escopo:** nova resolução central + tipos opcionais + testes. Sem UI, sem anamnese, sem `wa.me`, sem migração Firebase, sem alteração da VM.

Auditoria de origem: [`AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md`](./AUDITORIA_WHATSAPP_TELEFONE_INTERNACIONAL.md).

---

## O que foi criado

Fonte da verdade estruturada:

`lib/whatsapp/resolveInternationalPhone.ts`

| Função | Papel |
|--------|--------|
| `resolveInternationalPhone({ telefone, telefoneDdi, telefoneE164 })` | Resolução com prioridade E164 → DDI+nacional → legado BR |
| `resolveInternationalPhoneFromIdentificacao` | Lê os três campos de `dadosIdentificacao` |
| `resolveLegacyBrazilWhatsappPhone` | Regra antiga isolada (10/11 dígitos → prefixo 55) |
| `tryResolveInternationalPhone` | `null` se não há dígitos; relança se o valor é inválido |
| `applyBrazilMobileNinthDigit` | 9º dígito **somente** quando o número já começa com DDI 55 |

Callers atuais de `normalizeWhatsappPhone` **não foram reescritos**. A função legada passou a ser um wrapper:

```
normalizeWhatsappPhone(raw) → resolveInternationalPhone({ telefone: raw })
```

Resultado para pacientes brasileiros existentes: **idêntico**.

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `lib/whatsapp/resolveInternationalPhone.ts` | **Novo** |
| `lib/whatsapp/resolveInternationalPhone.spec.ts` | **Novo** — casos obrigatórios + regressão legado |
| `types/obesidade.ts` | `DadosIdentificacao.telefoneDdi?` e `telefoneE164?` (opcionais) |
| `services/whatsappProviderClient.ts` | `applyBrazilMobileNinthDigit` reexportado do módulo novo; `normalizeWhatsappPhone` delega à regra legada |

Não alterados: `infra/whatsapp/**`, UI, anamnese, `wa.me`, CRM, MetaNutri/Personal/Psi, extractores de envio, Firebase.

---

## Contrato dos campos

Coleção continua `pacientes_completos`. Campos em `dadosIdentificacao`:

| Campo | Obrigatório | Exemplo | Notas |
|-------|-------------|---------|-------|
| `telefone` | não | `83988192848` ou `(83) 98819-2848` | Nacional. Legado BR sem DDI. |
| `telefoneDdi` | **não** | `"55"`, `"1"`, `"+351"` | Ausente = Brasil. |
| `telefoneE164` | **não** | `"5583988192848"` | Prioridade máxima. Dígitos, com ou sem `+`. |

Pacientes antigos **não têm** `telefoneDdi` nem `telefoneE164`. Nenhuma migração foi feita.

Prioridade de resolução:

1. `telefoneE164` com dígitos → usar (e 9º dígito BR só se o valor começa com `55`).
2. `telefoneDdi` com dígitos → `ddi + nacional`. **Não** aplica a heurística 10/11 = Brasil. 9º dígito só se `ddi === "55"`.
3. Senão → legado: 10 ou 11 dígitos sem `55` recebem prefixo `55`.

Composição evita duplicar DDI se o nacional já começa com o mesmo DDI (`55` + `5583…` não vira `5555…`).

---

## Regra de fallback legado

```
telefone = "83988192848"
telefoneDdi = undefined
telefoneE164 = undefined
→ 5583988192848
```

É a mesma regra que existia em `normalizeWhatsappPhone` antes desta etapa.

---

## Testes executados

`npx vitest run lib/whatsapp/resolveInternationalPhone.spec.ts`

Resultado: **1 arquivo, 30 testes, todos passaram.**

Casos cobertos:

- legado `83988192848` e `(83) 98819-2848`
- BR com `ddi 55`
- EUA `ddi 1` + `7137326616` / `(713) 732-6616` → `17137326616` (não `5571…`)
- Portugal `ddi 351` + `912345678`
- `telefoneE164` `17137326616`
- espaços, parênteses, hífens, `+` no DDI e no E164
- vazios e limites 10–15 dígitos
- `normalizeWhatsappPhone` (wrapper) ainda devolve `5583988192848` para o legado
- sem DDI, 11 dígitos cru (ex. `17137326616`) **continuam** virando `5517137326616` — comportamento legado dos callers atuais

---

## Firebase

Nenhum documento foi lido, escrito ou migrado. Os campos novos são apenas tipagem TypeScript opcional.

O normalizador Firestore (`normalizePacienteDocument`) já faz spread de `dadosIdentificacao`; se no futuro um doc tiver `telefoneDdi`, o campo passa adiante sem mudança extra.

---

## VM / WPPConnect

Nenhum arquivo em `infra/whatsapp/` foi alterado.

Conferência: a VM **não** prefixa `55`. Recebe o telefone já em dígitos no `POST /send-message`. Não há contradição com a auditoria. EUA `17137326616` e Portugal `351912345678` cabem no payload atual (10–15 dígitos, sem `+`).

---

## Riscos / o que resolver antes da Etapa 2

1. **Segunda passagem em `sendTestMessage`.** O envio ainda chama `normalizeWhatsappPhone(phone)` com uma string só. Números internacionais de **11 dígitos** já resolvidos (ex. `17137326616`) seriam prefixados com `55` se passados por esse wrapper. BR de 12–13 dígitos é idempotente. **Antes de ligar extractores/UI**, o envio precisa aceitar número já resolvido (E164) sem reaplicar a heurística 10/11, ou receber `{ telefone, telefoneDdi, telefoneE164 }`.

2. **Extractores ainda usam só `normalizeWhatsappPhone(raw)`.** Mesmo que alguém grave `telefoneDdi` no Firestore à mão, os serviços de WhatsApp **ainda não lêem** esse campo. Ligar `resolveInternationalPhoneFromIdentificacao` nos extractores é trabalho da Etapa 2.

3. **`wa.me/55${…}`** continua assumindo Brasil. Fora desta etapa, como combinado.

4. **Anamnese `slice(0, 11)`** impede DDI na UI. Fora desta etapa.

5. **Colisão 11 dígitos** (BR nacional vs EUA com country code) só se resolve com DDI explícito. Sem DDI, o legado continua correto para o Brasil e errado para EUA cru — intencional até a UI existir.

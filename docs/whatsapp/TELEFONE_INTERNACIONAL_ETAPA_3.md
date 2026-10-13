# Telefone internacional — Etapa 3 (anamnese inicial)

**Data:** 21 de setembro de 2026  
**Escopo:** seletor internacional no cadastro/anamnese do paciente. Reutiliza a Etapa 2. Sem `wa.me`, CRM, MetaNutri/Personal/Psi, tela de teste, VM ou pipeline WPPConnect.

Anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_2.md`](./TELEFONE_INTERNACIONAL_ETAPA_2.md).

---

## Superfícies reais

Fluxo atual confirmado:

| Superfície | Onde | Papel |
|------------|------|--------|
| `MetaPacienteWizard` | `/meta` (produção) | anamnese em passos |
| `ModalDadosPacienteChat` | `/metaadmingeral/chatinicial` (preview) + backups | chat inicial |

`app/meta/page.tsx` **não** tem campo próprio de telefone da anamnese: hospeda o wizard e persiste com `PacienteService.createOrUpdatePaciente`. Formulários de indicação/`wa.me` do médico **não** foram alterados.

`formatTelefone()` em `lib/meta/metaChatInicial/helpers.ts` **permanece** para callers não relacionados (ex. ChatIA). Saiu só do wizard e do chat inicial.

---

## Reuso da Etapa 2

Mesmo componente:

`components/phone/InternationalPhoneInput.tsx`

Wizard e chat importam o mesmo módulo. Sem segunda lista de países, sem outra máscara, sem outro `libphonenumber-js`.

Ajuste **estritamente necessário** no componente compartilhado (mobile/modal):

- lista de países via **portal `fixed`** (`z-index: 500`) para não ser recortada por `overflow-hidden` do modal (`z-[320]` / `z-[200]`);
- `min-w-0`, `h-11` (área de toque), `touch-manipulation`;
- reposiciona se faltar espaço abaixo (abre para cima);
- `variant="dark"` só no chat navy;
- `aria-label` do país inclui nome + DDI (não só a bandeira);
- `aria-invalid` / `aria-describedby` no erro.

Troca de país: **preserva os dígitos nacionais** e só troca DDI/ISO/máscara. Não concatena DDI no `telefone`.

---

## Default Brasil

Sem `telefoneDdi`/`telefonePais`: a UI mostra 🇧🇷 +55 (legado), sem gravar nada até o paciente editar.

Ao preencher `(83) 98819-2848` no input:

```ts
{ telefone: "83988192848", telefoneDdi: "55", telefonePais: "BR" }
```

---

## Validação

`isValidIdentificacaoPhone` + `IDENTIFICACAO_PHONE_ERROR` (`lib/phone/internationalPhoneValue.ts`).

Usado em:

- `validateMetaChatStep` (passo 1)
- `getFirstIncompleteStep` (retomada)
- botão Enviar do chat

Não usa mais `tel.length < 10` nem “Informe um telefone válido com DDD.”

Portugal `912345678` + `351` é válido (9 dígitos nacionais).

---

## Persistência

`PacienteService.createOrUpdatePaciente` já faz spread de `dadosIdentificacao`. Campos gravados pela anamnese:

```ts
telefone        // nacional, dígitos
telefoneDdi     // "55" | "1" | "351" | …
telefonePais    // "BR" | "US" | "PT" | …
```

**`telefoneE164` não é criado** (`persistedPhoneForIdentificacao`).

Retomada: `{ telefone: "(83) 98819-2848" }` sem DDI → UI 🇧🇷 +55, passo de telefone considerado completo. Lazy backfill só se o paciente editar o campo.

---

## Mobile

Layout permanece `[ 🇧🇷 +55 ▼ ][ telefone… ]` em uma linha (`flex`, `min-w-0`).  
Dropdown no `document.body` (não estoura largura, não fica atrás do modal, `maxHeight` pela viewport, scroll interno).

---

## Arquivos alterados

| Arquivo | Mudança |
|---------|---------|
| `components/phone/InternationalPhoneInput.tsx` | portal, mobile, a11y, `variant` |
| `lib/phone/internationalPhoneValue.ts` | `isValidIdentificacaoPhone`, persistência sem E164 |
| `components/meta/MetaPacienteWizard.tsx` | passo 1 usa o input compartilhado |
| `components/ModalDadosPacienteChat.tsx` | passo 1 usa o mesmo input (`variant="dark"`) |
| `lib/meta/metaChatInicial/validation.ts` | validação internacional |
| `lib/meta/metaChatInicial/resume.ts` | retomada internacional |
| `components/whitelabel/cadastroMedico/CadastroMedicoFormUi.tsx` | `htmlFor` opcional no `FieldLabel` |
| `lib/meta/metaChatInicial/telefoneAnamnese.spec.ts` | **Novo** — casos A–L |

Não alterados: Identificação MetaAdmin (além do componente compartilhado), `wa.me`, CRM, MetaNutri/Personal/Psi, tela TESTE, `infra/whatsapp/**`, extractores da 1.5.

---

## Testes

`npx vitest run lib/meta/metaChatInicial/telefoneAnamnese.spec.ts lib/phone lib/whatsapp/resolveInternationalPhone.spec.ts lib/whatsapp/resolveInternationalPhone.etapa15.spec.ts lib/metaadmin/buildNovoPacienteCompleto.spec.ts`

**5 arquivos, 80 testes, todos passaram** (13 da Etapa 3 + regressão 1 / 1.5 / 2).

---

## Firebase / VM

Nenhuma migração. Nenhuma coleção nova.  
VM / Docker / WPPConnect / pipeline 1.5 **não** foram refatorados. O envio continua `resolveInternationalPhone({ telefone, telefoneDdi })`.

---

## Risco residual (antes da Etapa 4)

1. Tela **TESTE DE ENVIO WHATSAPP** ainda é legado.
2. `wa.me` em outras UIs ainda prefixa 55.
3. Número internacional na anamnese **sem trocar o país** (default BR) ainda é salvo como Brasil.
4. ChatIA / indicação de paciente em `/meta` continuam com máscara BR — não fazem parte deste cadastro.

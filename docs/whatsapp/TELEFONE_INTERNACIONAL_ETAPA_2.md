# Telefone internacional — Etapa 2 (seletor na Identificação)

**Data:** 21 de setembro de 2026  
**Escopo:** campo de telefone da aba Identificação do paciente, com seletor de país. Sem anamnese, wizard, `wa.me`, tela de teste WhatsApp, migração Firebase ou alteração da VM.

Etapas anteriores: [`TELEFONE_INTERNACIONAL_ETAPA_1.md`](./TELEFONE_INTERNACIONAL_ETAPA_1.md), [`TELEFONE_INTERNACIONAL_ETAPA_1_5.md`](./TELEFONE_INTERNACIONAL_ETAPA_1_5.md).

---

## Componente

`components/phone/InternationalPhoneInput.tsx`

| Export | Uso |
|--------|-----|
| `InternationalPhoneInput` | edição (seletor + nacional) |
| `InternationalPhoneDisplay` | leitura amigável |

O componente **não** depende do WhatsApp. Controla internamente ISO / DDI / nacional e entrega ao parent:

```ts
{ telefone, telefoneDdi, telefonePais }
```

Lógica pura em `lib/phone/` (`callingCountries.ts`, `internationalPhoneValue.ts`).

Aparência alinhada aos inputs atuais da Identificação (`border-gray-300`, `rounded-md`, dark mode). Sem redesign da página.

```
[ 🇧🇷 +55 ▼ ] [ (83) 98819-2848 ]
```

Lista ao abrir: busca por nome (pt-BR) ou DDI, países do mundo, BR/US/PT/AR/CL no topo.

---

## Fonte de países / biblioteca

Não havia `libphonenumber` no projeto.

Adicionado: **`libphonenumber-js`** (pequena, sem UI).

| Dado | Fonte |
|------|--------|
| ISO + DDI | `getCountries()` / `getCountryCallingCode()` |
| Nome | `Intl.DisplayNames(['pt-BR'], { type: 'region' })` |
| Bandeira | emoji a partir do ISO (regional indicators) |
| Máscara / possível | `AsYouType`, `formatNational()`, `isPossiblePhoneNumber` |

Nenhuma biblioteca visual de telefone (`react-phone-input-2`, etc.).

---

## Formato salvo

No **save explícito** da Identificação (usuário editou o telefone ou o país):

```ts
dadosIdentificacao: {
  telefone: "7137326616",   // nacional, só dígitos
  telefoneDdi: "1",
  telefonePais: "US"
}
```

**Não** salva `telefone: "17137326616"`.

### `telefoneE164`

Nesta etapa **não** gravamos `telefoneE164`.

Motivo: o `updateDoc` do paciente faz merge e `removeUndefined` omite chaves `undefined`. Gravar E164 na UI arriscaria valor obsoleto se o número fosse apagado. O pipeline da Etapa 1.5 já resolve `telefoneDdi + telefone` via `resolveInternationalPhone()` — E164 é redundante para o envio.

Se no futuro gravarmos E164, será **somente** com `resolveInternationalPhone()`, nunca `` `${ddi}${telefone}` `` na UI.

---

## `telefonePais`

Campo opcional `DadosIdentificacao.telefonePais?: string` (ISO-3166 alpha-2).

Necessário: **DDI não identifica um único país** (`+1` = EUA, Canadá e territórios NANP). Sem ISO, a UI usa um representante (`+1` → US) só para bandeira; o save de um paciente editado grava o ISO escolhido.

Pacientes antigos continuam sem o campo.

---

## Pacientes legados

```ts
{ telefone: "83988192848" }  // sem telefoneDdi
```

- UI: 🇧🇷 +55 e máscara BR.
- Envio: `5583988192848` (legado da Etapa 1).
- Abrir e fechar **sem editar o telefone** não chama `onChange` → JSON do paciente igual ao original → Firestore **não** é reescrito (o modal só salva se houver diff).

Lazy backfill: se o usuário editar/salvar o telefone nessa tela, passam a ir `telefoneDdi: "55"` e `telefonePais: "BR"`. Sem migração em lote.

Paciente **novo** (`buildNovoPacienteCompleto`, só MetaAdmin): já nasce com `telefoneDdi: "55"` e `telefonePais: "BR"`.

---

## Validação e máscaras

- Brasil: `(83) 98819-2848`
- EUA: `(713) 732-6616`
- Portugal: `912 345 678` (formato nacional da lib)
- Outros: `AsYouType` do país selecionado — sem máscara BR inventada.

Validação: `isPossiblePhoneNumber` do país. Não exige 10/11 dígitos, DDD ou 9º dígito brasileiros fora do Brasil. Aviso visual, telefone continua opcional no cadastro.

`pacienteTemTelefoneParaWhatsapp` (botão de link na Identificação) passou a usar `tryResolveInternationalPhone`, para não recusar Portugal de 9 dígitos nacionais.

---

## Arquivos alterados

| Arquivo | Papel |
|---------|--------|
| `components/phone/InternationalPhoneInput.tsx` | **Novo** — input + display |
| `lib/phone/callingCountries.ts` | **Novo** — lista mundial, busca, ISO |
| `lib/phone/internationalPhoneValue.ts` | **Novo** — persistência / máscara / display |
| `lib/phone/internationalPhoneValue.spec.ts` | **Novo** — casos da Etapa 2 |
| `components/metaadmin/paciente-modal/PacienteIdentificacaoTabEdit.tsx` | seletor na edição |
| `components/metaadmin/paciente-modal/PacienteIdentificacaoTabContent.tsx` | display amigável (aba Identificação read-only, compartilhada) |
| `types/obesidade.ts` | `telefonePais?` |
| `lib/metaadmin/buildNovoPacienteCompleto.ts` | default BR no paciente novo; gate WhatsApp internacional |
| `package.json` / lock | `libphonenumber-js` |

**Não alterados:** anamnese, `ModalDadosPacienteChat`, `MetaPacienteWizard`, `wa.me`, CRM, telas específicas MetaNutri/Personal/Psi (apenas o display compartilhado da Identificação), tela TESTE DE ENVIO, `infra/whatsapp/**`, extractores WPPConnect.

---

## Testes

`npx vitest run lib/phone lib/metaadmin/buildNovoPacienteCompleto.spec.ts lib/whatsapp/resolveInternationalPhone.spec.ts lib/whatsapp/resolveInternationalPhone.etapa15.spec.ts`

**4 arquivos, 67 testes, todos passaram** (inclui regressão das Etapas 1 e 1.5).

Arquivos da Etapa 2: **20 testes**.

| Caso | Resultado |
|------|-----------|
| Legado `83988192848` sem DDI | UI 🇧🇷 +55; envio `5583988192848`; objeto original intacto |
| BR novo ddi 55 | `5583988192848` |
| EUA `7137326616` + `1` | save nacional; envio `17137326616` |
| PT `912345678` + `351` | `351912345678` |
| Troca BR → EUA | máscara BR não permanece |
| Volta EUA → BR | máscara BR retorna |
| +1 compartilhado | ISO distingue US/CA |

---

## Firebase / VM

Nenhuma migração. Nenhum documento antigo foi lido ou escrito por esta etapa.  
Nenhum arquivo em `infra/whatsapp/` foi alterado. O pipeline WPPConnect da Etapa 1.5 não foi refatorado.

---

## Risco residual (antes da Etapa 3)

1. Tela **TESTE DE ENVIO WHATSAPP** continua legado (sem seletor).
2. Anamnese, wizard e `wa.me` ainda assumem Brasil.
3. Número internacional digitado na Identificação **sem trocar o país** (default BR) ainda é salvo como Brasil.
4. Display read-only da Identificação é compartilhado com MetaNutri/Personal/Psi — só o visual do telefone, sem seletor de edição nesses apps.

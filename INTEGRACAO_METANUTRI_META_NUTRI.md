# Integração Metanutri → /meta (aba Nutri)

## Visão Geral

Este documento descreve o padrão implementado para que o nutricionista, a partir do **Metanutri** (mobile), ao clicar no botão **Nutri** do card do paciente, abra **diretamente** a página do **/meta** na aba **Nutri** — a mesma tela que o paciente vê. Não há modal duplicado; uma única implementação da “página Nutri” no /meta.

---

## 1. Fluxo

1. Nutricionista está em **/metanutri**, na lista de pacientes (mobile).
2. Clica no ícone **Nutri** (UtensilsCrossed) do card do paciente.
3. Navega para **`/meta?pacienteId={id}&menu=nutri`** (sem abrir modal).
4. A página **/meta** carrega o paciente por ID, abre a aba **Nutri** e exibe o mesmo conteúdo que o paciente vê (`NutriContent`).
5. **Voltar** retorna para **/metanutri**.

---

## 2. O que foi implementado

### 2.1 Metanutri (`app/metanutri/page.v2.tsx`)

- **Botão Nutri** (card mobile, `lg:hidden`): em vez de abrir modal, faz  
  `router.push(\`/meta?pacienteId=${paciente.id || paciente.userId}&menu=nutri\`)`.
- **Removidos**: modal de nutrição, estados `showModalNutricao` e `pacienteNutricaoSelecionado`, import de `NutriContent`.

### 2.2 /meta (`app/meta/page.tsx`)

- **Query params**: `pacienteId` e `menu` (ex.: `menu=nutri`).
- **Estados**: `pacienteIdFromQuery`, `isNutricionistaMode`.
- **useEffect**: ao existir `pacienteId` na URL, seta modo nutricionista e `activeMenu` (ex.: `'nutri'`).
- **loadPaciente**:
  - Com `?pacienteId=` e usuário logado: busca por `getPacienteById`; fallback em `listPacientesVisiveisByNutri`.
  - Sem `pacienteId`: fluxo normal por `getPacienteByEmail(user.email)`.
- **Loading**: enquanto carrega o paciente no modo nutri, mostra “Carregando paciente...” (evita flash de “Paciente não encontrado”).
- **Conteúdo da aba Nutri** (modo nutricionista):
  - **Header da área de conteúdo**: botão **Voltar** (`router.push('/metanutri')`) + badge **“Paciente: {nome}”**.
  - Abaixo: **`NutriContent`** (mesma página que o paciente vê).

---

## 3. Menu superior (Médico e Nutricionista)

A página **/meta** já possui um **menu superior no mobile** (header fixo, `lg:hidden`) que mostra:

- **Médico:** “Médico: Dr./Dra. {nome}” (ícone Stethoscope, ShieldCheck/Shield se verificado).
- **Nutricionista:** “Nutricionista: {nome}” (ícone UtensilsCrossed, ShieldCheck/Shield se verificado).

**Localização no código:** `app/meta/page.tsx`, bloco “Mobile Header - Only visible on mobile” (por volta das linhas 7349–7392).

Quando o nutricionista abre `/meta?pacienteId=...&menu=nutri`:

1. O paciente é carregado por ID.
2. `loadPaciente` carrega também **médico responsável** e **nutricionista vinculado** desse paciente.
3. O **mesmo** menu superior do /meta exibe automaticamente o **médico** e o **nutricionista** daquele paciente.

Ou seja: **nenhuma alteração extra** foi feita nesse menu para o fluxo Nutri; o layout do /meta já mostra Médico e Nutricionista do paciente carregado. O que fizemos foi garantir que, vindo do Metanutri, o paciente certo seja carregado e a aba Nutri seja aberta, e que na área de conteúdo apareçam Voltar + “Paciente: {nome}”.

---

## 4. Resumo do padrão (para replicar em outros fluxos)

1. **Origem (ex.: Metanutri):** botão abre a **página** de destino com query (ex.: `?pacienteId=...&menu=nutri`), sem modal.
2. **Destino (ex.: /meta):**
   - Lê `pacienteId` e `menu` da URL.
   - Carrega o paciente por ID (com fallback na lista do profissional).
   - Define a aba/menu ativa (ex.: `activeMenu = 'nutri'`).
   - Enquanto carrega: loading (“Carregando paciente...”), não “Paciente não encontrado”.
   - No conteúdo: **Voltar** (para a origem) + badge **“Paciente: {nome}”** (ou “Aluno:” no Personal).
3. **Menu superior:** se a página de destino já tiver um header com **Médico** e **Nutricionista** (ou outros profissionais) do paciente, esse header passa a refletir o paciente carregado pela URL — sem código extra no fluxo Nutri.

---

## 5. Replicar no Metapersonal → /meta/personal

**Objetivo:** ao abrir pelo botão **Personal** no **Metapersonal**, o usuário deve ter uma experiência alinhada ao padrão do Nutri: mesma página (/meta/personal), com **menu superior** mostrando **nome do médico** e **nome do nutricionista** (e, se fizer sentido, do Personal) do **aluno**, como no /meta.

**Situação atual em /meta/personal:**

- Já existe integração: Metapersonal redireciona para `/meta/personal?pacienteId=...`.
- Já existe no header: **Voltar** e badge **“Aluno: {nome}”** (conforme `INTEGRACAO_METAPERSONAL_META_PERSONAL.md`).
- **Implementado (jan 2026):** Menu superior no header da **/meta/personal** em modo PT, com **nome do médico** do aluno (ícone Stethoscope, Dr./Dra. nome, ShieldCheck/Shield). Nutricionista e Personal não são exibidos; apenas o médico.

---

## 6. Arquivos envolvidos

- **Metanutri:** `app/metanutri/page.v2.tsx` (botão Nutri, redirect; modal removido).
- **Meta:** `app/meta/page.tsx` (query params, loadPaciente por ID, loading, case 'nutri' com Voltar + badge; menu superior já existente com Médico + Nutricionista).
- **Personal:** `app/metapersonal/page.v2.tsx` (redirect), `app/meta/personal/page.tsx` (modo PT, Voltar + “Aluno:” + menu superior com nome do médico).

---

**Data:** Janeiro 2026
